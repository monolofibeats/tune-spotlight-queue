import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  className?: string;
}

/** Parse CSS HSL triplet like "50 100% 50%" */
function parseHsl(input: string) {
  const parts = input.trim().split(/\s+/);
  if (parts.length < 3) return { h: 50, s: 100, l: 50 };
  return {
    h: Number(parts[0]) || 50,
    s: Number((parts[1] || '100%').replace('%', '')) || 100,
    l: Number((parts[2] || '50%').replace('%', '')) || 50,
  };
}

/**
 * Audio-reactive visualizer styled like the Discovery page soundwave.
 * Ultra-smooth flowing lines that gently respond to audio frequency data.
 */
export function AudioVisualizer({ audioElement, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);
  const lastSrcRef = useRef('');
  const cleanupRef = useRef<(() => void) | null>(null);
  // Smoothed audio energy — lerped slowly for ultra-smooth reaction
  const smoothedBandsRef = useRef<Float32Array | null>(null);

  // ── Shadow audio pipeline (unchanged logic) ──
  useEffect(() => {
    if (!audioElement) {
      analyserRef.current = null;
      dataRef.current = null;
      lastSrcRef.current = '';
      return;
    }

    const setupAnalyser = async () => {
      const src = audioElement.src;
      if (!src) return;

      const srcChanged = src !== lastSrcRef.current;
      lastSrcRef.current = src;

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        const actx = audioCtxRef.current;
        if (actx.state === 'suspended') await actx.resume();

        let analyser = analyserRef.current;
        let audioBuffer: AudioBuffer | null = null;

        if (srcChanged || !analyser) {
          const response = await fetch(src);
          if (!response.ok) return;
          const arrayBuffer = await response.arrayBuffer();
          audioBuffer = await actx.decodeAudioData(arrayBuffer);

          analyser = actx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.82;

          const gainNode = actx.createGain();
          gainNode.gain.value = 0;
          analyser.connect(gainNode);
          gainNode.connect(actx.destination);

          analyserRef.current = analyser;
          dataRef.current = new Uint8Array(analyser.frequencyBinCount);
          smoothedBandsRef.current = new Float32Array(analyser.frequencyBinCount);
        }

        const currentAnalyser = analyser!;

        const startShadowPlayback = () => {
          if (bufferSourceRef.current) {
            try { bufferSourceRef.current.stop(); } catch {}
          }
          const doStart = async () => {
            let buf = audioBuffer;
            if (!buf) {
              try {
                const resp = await fetch(src);
                if (!resp.ok) return;
                buf = await actx.decodeAudioData(await resp.arrayBuffer());
              } catch { return; }
            }
            const bufferSource = actx.createBufferSource();
            bufferSource.buffer = buf;
            bufferSource.connect(currentAnalyser);
            bufferSourceRef.current = bufferSource;
            bufferSource.start(0, audioElement.currentTime || 0);
            isPlayingRef.current = true;
          };
          doStart();
        };

        const stopShadowPlayback = () => {
          if (bufferSourceRef.current) {
            try { bufferSourceRef.current.stop(); } catch {}
            bufferSourceRef.current = null;
          }
          isPlayingRef.current = false;
        };

        const onPlay = () => startShadowPlayback();
        const onPause = () => stopShadowPlayback();
        const onEnded = () => stopShadowPlayback();
        const onSeeked = () => {
          if (!audioElement.paused) {
            stopShadowPlayback();
            startShadowPlayback();
          }
        };

        audioElement.addEventListener('play', onPlay);
        audioElement.addEventListener('pause', onPause);
        audioElement.addEventListener('ended', onEnded);
        audioElement.addEventListener('seeked', onSeeked);

        cleanupRef.current = () => {
          audioElement.removeEventListener('play', onPlay);
          audioElement.removeEventListener('pause', onPause);
          audioElement.removeEventListener('ended', onEnded);
          audioElement.removeEventListener('seeked', onSeeked);
          stopShadowPlayback();
        };

        if (!audioElement.paused) {
          startShadowPlayback();
        }
      } catch (err) {
        console.warn('AudioVisualizer: Could not set up analyser', err);
      }
    };

    const timer = setTimeout(setupAnalyser, 200);
    return () => {
      clearTimeout(timer);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [audioElement, audioElement?.src]);

  // ── Animation loop — smooth flowing wave lines ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { h, s, l } = parseHsl(
      getComputedStyle(document.documentElement).getPropertyValue('--primary')
    );
    const hsla = (a: number) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

    // Wave configuration — matching Discovery page style
    const LINE_COUNT = 12;
    const POINT_COUNT = 100;

    // Pre-compute wave line offsets & properties
    const lines = Array.from({ length: LINE_COUNT }, (_, i) => ({
      phase: i * 0.35,
      speed: 0.25 + (i % 5) * 0.08,
      amplitude: 0.06 + (i % 5) * 0.015,
      yOffset: (i - LINE_COUNT / 2) * 0.012,
      opacity: 0.06 + (1 - Math.abs(i - LINE_COUNT / 2) / (LINE_COUNT / 2)) * 0.18,
    }));

    // Pre-compute base wave shapes (harmonics)
    const basePoints: number[][] = lines.map((_, li) => {
      const pts: number[] = [];
      for (let j = 0; j < POINT_COUNT; j++) {
        const x = j / POINT_COUNT;
        const base = Math.sin(x * Math.PI * 2.5 + li * 0.25) * 0.6;
        const h1 = Math.sin(x * Math.PI * 5 + li * 0.4) * 0.3;
        const h2 = Math.sin(x * Math.PI * 7.5 + li * 0.6) * 0.15;
        pts.push(base + h1 + h2);
      }
      return pts;
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    // Smoothed overall energy for wave expansion
    let smoothEnergy = 0;

    const draw = () => {
      time += 1 / 60;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const hh = rect.height;
      ctx.clearRect(0, 0, w, hh);

      // ── Read audio data ──
      const analyser = analyserRef.current;
      const data = dataRef.current;
      const smoothed = smoothedBandsRef.current;
      let hasAudio = false;

      if (analyser && data && isPlayingRef.current) {
        analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
        for (let i = 0; i < data.length; i++) {
          if (data[i] > 0) { hasAudio = true; break; }
        }
      }

      // Smooth each frequency band for ultra-smooth reaction
      if (smoothed && data) {
        const lerpSpeed = hasAudio ? 0.06 : 0.03;
        for (let i = 0; i < smoothed.length; i++) {
          const target = hasAudio ? data[i] / 255 : 0;
          smoothed[i] += (target - smoothed[i]) * lerpSpeed;
        }
      }

      // Overall energy (average of all bands) — smoothed
      let rawEnergy = 0;
      if (smoothed) {
        for (let i = 0; i < smoothed.length; i++) rawEnergy += smoothed[i];
        rawEnergy /= smoothed.length;
      }
      smoothEnergy += (rawEnergy - smoothEnergy) * 0.04;

      // Audio boosts the wave expansion (lines spread apart)
      const waveExpansion = 1 + smoothEnergy * 3.0;

      // ── Draw flowing wave lines ──
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const centerY = hh / 2;

      for (let li = 0; li < LINE_COUNT; li++) {
        const line = lines[li];
        const pts = basePoints[li];

        // Spread apart based on audio energy
        const expandedYOffset = line.yOffset * waveExpansion * hh * 6;

        // Audio-reactive amplitude boost
        const ampBoost = 1 + smoothEnergy * 4.0;
        const effectiveAmplitude = line.amplitude * ampBoost;

        ctx.beginPath();
        ctx.strokeStyle = hsla(line.opacity + smoothEnergy * 0.15);
        ctx.lineWidth = 1.5 + smoothEnergy * 1.5;
        ctx.shadowBlur = 8 + smoothEnergy * 14;
        ctx.shadowColor = hsla(line.opacity * 0.5 + smoothEnergy * 0.2);

        for (let i = 0; i < POINT_COUNT; i++) {
          const normX = i / (POINT_COUNT - 1);
          const x = normX * w;

          // Base animated wave
          const animatedY = pts[i] * Math.sin(time * line.speed + line.phase + i * 0.04);

          // Per-point audio modulation (frequency mapped to x position)
          let freqMod = 0;
          if (smoothed && hasAudio) {
            const binIdx = Math.floor(normX * (smoothed.length * 0.75));
            const val = smoothed[Math.min(binIdx, smoothed.length - 1)];
            freqMod = val * 0.3;
          }

          const totalAmp = (animatedY * effectiveAmplitude + freqMod) * hh;
          const y = centerY + expandedYOffset + totalAmp;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            // Smooth quadratic curve between points
            const prevX = ((i - 1) / (POINT_COUNT - 1)) * w;
            const prevNormX = (i - 1) / (POINT_COUNT - 1);
            const prevAnimatedY = pts[i - 1] * Math.sin(time * line.speed + line.phase + (i - 1) * 0.04);
            let prevFreqMod = 0;
            if (smoothed && hasAudio) {
              const prevBin = Math.floor(prevNormX * (smoothed.length * 0.75));
              prevFreqMod = smoothed[Math.min(prevBin, smoothed.length - 1)] * 0.3;
            }
            const prevTotalAmp = (prevAnimatedY * effectiveAmplitude + prevFreqMod) * hh;
            const prevY = centerY + expandedYOffset + prevTotalAmp;

            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
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
      style={{ height: 120 }}
      aria-hidden="true"
    />
  );
}
