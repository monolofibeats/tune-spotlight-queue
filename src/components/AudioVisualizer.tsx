import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  className?: string;
}

function parseHslTriplet(input: string) {
  const parts = input.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const s = Number(parts[1].replace('%', ''));
  const l = Number(parts[2].replace('%', ''));
  if (![h, s, l].every(Number.isFinite)) return null;
  return { h, s, l };
}

function makeHslaFromCssVar(varName: string) {
  const css = getComputedStyle(document.documentElement).getPropertyValue(varName);
  const parsed = parseHslTriplet(css);
  if (!parsed) return (a: number) => `hsla(50, 100%, 50%, ${a})`;
  return (a: number) => `hsla(${parsed.h}, ${parsed.s}%, ${parsed.l}%, ${a})`;
}

// ── Shadow audio pipeline ──

function useAudioAnalyser(audioElement: HTMLAudioElement | null) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);
  const lastSrcRef = useRef('');
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!audioElement) {
      analyserRef.current = null;
      dataRef.current = null;
      lastSrcRef.current = '';
      return;
    }

    const setup = async () => {
      const src = audioElement.src;
      if (!src) return;

      const srcChanged = src !== lastSrcRef.current;
      lastSrcRef.current = src;

      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }

      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const actx = audioCtxRef.current;
        if (actx.state === 'suspended') await actx.resume();

        let analyser = analyserRef.current;
        let audioBuffer: AudioBuffer | null = null;

        if (srcChanged || !analyser) {
          const resp = await fetch(src);
          if (!resp.ok) return;
          audioBuffer = await actx.decodeAudioData(await resp.arrayBuffer());

          analyser = actx.createAnalyser();
          analyser.fftSize = 2048; // High res: 1024 frequency bins
          analyser.smoothingTimeConstant = 0.4; // Low smoothing = fast reaction
          const gain = actx.createGain();
          gain.gain.value = 0;
          analyser.connect(gain);
          gain.connect(actx.destination);

          analyserRef.current = analyser;
          dataRef.current = new Uint8Array(analyser.frequencyBinCount);
        }

        const currentAnalyser = analyser!;

        const startShadow = () => {
          if (bufferSourceRef.current) { try { bufferSourceRef.current.stop(); } catch {} }
          (async () => {
            let buf = audioBuffer;
            if (!buf) {
              try {
                const r = await fetch(src);
                if (!r.ok) return;
                buf = await actx.decodeAudioData(await r.arrayBuffer());
              } catch { return; }
            }
            const bs = actx.createBufferSource();
            bs.buffer = buf;
            bs.connect(currentAnalyser);
            bufferSourceRef.current = bs;
            bs.start(0, audioElement.currentTime || 0);
            isPlayingRef.current = true;
          })();
        };

        const stopShadow = () => {
          if (bufferSourceRef.current) { try { bufferSourceRef.current.stop(); } catch {} bufferSourceRef.current = null; }
          isPlayingRef.current = false;
        };

        const onPlay = () => startShadow();
        const onPause = () => stopShadow();
        const onEnded = () => stopShadow();
        const onSeeked = () => { if (!audioElement.paused) { stopShadow(); startShadow(); } };

        audioElement.addEventListener('play', onPlay);
        audioElement.addEventListener('pause', onPause);
        audioElement.addEventListener('ended', onEnded);
        audioElement.addEventListener('seeked', onSeeked);

        cleanupRef.current = () => {
          audioElement.removeEventListener('play', onPlay);
          audioElement.removeEventListener('pause', onPause);
          audioElement.removeEventListener('ended', onEnded);
          audioElement.removeEventListener('seeked', onSeeked);
          stopShadow();
        };

        if (!audioElement.paused) startShadow();
      } catch (err) {
        console.warn('AudioVisualizer: analyser setup failed', err);
      }
    };

    const timer = setTimeout(setup, 200);
    return () => { clearTimeout(timer); if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; } };
  }, [audioElement, audioElement?.src]);

  return { analyserRef, dataRef, isPlayingRef };
}

/**
 * Hybrid visualizer: smooth flowing wave lines (homepage style)
 * whose shapes are directly driven by the full frequency spectrum (0–20kHz, left to right).
 * Attack is near-instant, release is smooth.
 */
export function AudioVisualizer({ audioElement, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const { analyserRef, dataRef, isPlayingRef } = useAudioAnalyser(audioElement);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hsla = makeHslaFromCssVar('--primary');

    const LINE_COUNT = 14;
    const POINTS = 120; // x-axis resolution

    // Smoothed spectrum mapped to POINTS (persistent across frames)
    const spectrum = new Float32Array(POINTS); // 0-1 per point

    // Each line has a vertical offset and style
    const lines = Array.from({ length: LINE_COUNT }, (_, i) => ({
      yOffset: (i - LINE_COUNT / 2) * 0.012,
      phase: i * 0.35,
      speed: 0.2 + (i % 5) * 0.06,
      // How much this line reacts to audio (center lines react most)
      reactivity: 0.6 + (1 - Math.abs(i - LINE_COUNT / 2) / (LINE_COUNT / 2)) * 0.4,
      opacity: 0.05 + (1 - Math.abs(i - LINE_COUNT / 2) / (LINE_COUNT / 2)) * 0.16,
      // Slight vertical flip for lines below center
      direction: i < LINE_COUNT / 2 ? -1 : 1,
    }));

    let time = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      time += 1 / 60;
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      const data = dataRef.current;
      let hasAudio = false;

      if (analyser && data && isPlayingRef.current) {
        analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
        for (let i = 0; i < data.length; i++) {
          if (data[i] > 0) { hasAudio = true; break; }
        }
      }

      // Map frequency bins → POINTS with logarithmic scaling
      // (gives more resolution to bass/mids, less to ultra-highs)
      if (data) {
        const binCount = data.length; // 1024 bins
        for (let p = 0; p < POINTS; p++) {
          const normX = p / (POINTS - 1);
          // Log scale: more bins for low freqs
          const logX = Math.pow(normX, 1.8);
          const binIdx = Math.min(Math.floor(logX * binCount), binCount - 1);
          // Average a small neighborhood for smoothness
          let sum = 0;
          let count = 0;
          const spread = Math.max(1, Math.floor(binCount / POINTS * 0.5));
          for (let b = Math.max(0, binIdx - spread); b <= Math.min(binCount - 1, binIdx + spread); b++) {
            sum += (hasAudio ? data[b] / 255 : 0);
            count++;
          }
          const target = sum / count;

          // Ultra-fast attack, smooth release
          const isRising = target > spectrum[p];
          const lerpSpeed = isRising ? 0.7 : 0.06;
          spectrum[p] += (target - spectrum[p]) * lerpSpeed;
        }
      }

      // Overall energy for glow/expansion
      let energy = 0;
      for (let p = 0; p < POINTS; p++) energy += spectrum[p];
      energy /= POINTS;

      const centerY = height / 2;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let li = 0; li < LINE_COUNT; li++) {
        const line = lines[li];

        // Audio makes lines spread apart from center
        const expansion = 1 + energy * 4.0;
        const yBase = centerY + line.yOffset * expansion * height * 5;

        ctx.beginPath();
        ctx.strokeStyle = hsla(line.opacity + energy * 0.2);
        ctx.lineWidth = 1.2 + energy * 2.0;
        ctx.shadowBlur = 8 + energy * 16;
        ctx.shadowColor = hsla(line.opacity * 0.4 + energy * 0.15);

        const points: { x: number; y: number }[] = [];

        for (let p = 0; p < POINTS; p++) {
          const normX = p / (POINTS - 1);
          const x = normX * width;

          // Gentle ambient wave animation (the "flowing" part)
          const ambientWave =
            Math.sin(normX * Math.PI * 2.5 + time * line.speed + line.phase) * 0.3 +
            Math.sin(normX * Math.PI * 5 + time * line.speed * 0.7 + line.phase * 1.3) * 0.15 +
            Math.sin(normX * Math.PI * 7.5 + time * line.speed * 0.4 + line.phase * 1.7) * 0.08;

          // Frequency-driven displacement (the "spectrum" part)
          const freqDisplacement = spectrum[p] * line.reactivity * line.direction;

          // Combine: ambient gives the flowing feel, spectrum gives the reactive shape
          const totalDisplacement = (ambientWave * 0.03 + freqDisplacement * 0.35) * height;

          const y = yBase + totalDisplacement;
          points.push({ x, y });
        }

        // Draw with quadratic curves for ultra-smoothness
        if (points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y);
          for (let p = 1; p < points.length; p++) {
            const prev = points[p - 1];
            const curr = points[p];
            const cpX = (prev.x + curr.x) / 2;
            const cpY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full pointer-events-none ${className}`}
      style={{ height: 200 }}
      aria-hidden="true"
    />
  );
}
