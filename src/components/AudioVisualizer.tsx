import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  className?: string;
}

// ── Copied 1:1 from SoundwaveBackgroundCanvas ──

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

interface WaveLine {
  points: number[];
  phase: number;
  speed: number;
  amplitude: number;
  baseYOffset: number;
  currentYOffset: number;
  opacity: number;
}

function createWaveLines(): WaveLine[] {
  const lines: WaveLine[] = [];
  const lineCount = 14;
  const pointCount = 100;

  for (let i = 0; i < lineCount; i++) {
    const points: number[] = [];
    for (let j = 0; j < pointCount; j++) {
      const x = j / pointCount;
      const baseWave = Math.sin(x * Math.PI * 2.5 + i * 0.25) * 0.6;
      const harmonic1 = Math.sin(x * Math.PI * 5 + i * 0.4) * 0.3;
      const harmonic2 = Math.sin(x * Math.PI * 7.5 + i * 0.6) * 0.15;
      points.push(baseWave + harmonic1 + harmonic2);
    }
    const baseYOffset = (i - lineCount / 2) * 0.01;
    lines.push({
      points,
      phase: i * 0.35,
      speed: 0.25 + Math.random() * 0.35,
      amplitude: 0.055 + (i % 5) * 0.018,
      baseYOffset,
      currentYOffset: baseYOffset,
      opacity: 0.06 + (1 - Math.abs(i - lineCount / 2) / (lineCount / 2)) * 0.14,
    });
  }
  return lines;
}

// ── Shadow audio pipeline hook (analyser setup) ──

function useAudioAnalyser(audioElement: HTMLAudioElement | null) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const smoothedRef = useRef<Float32Array | null>(null);
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

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

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
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.82;
          const gain = actx.createGain();
          gain.gain.value = 0;
          analyser.connect(gain);
          gain.connect(actx.destination);

          analyserRef.current = analyser;
          dataRef.current = new Uint8Array(analyser.frequencyBinCount);
          smoothedRef.current = new Float32Array(analyser.frequencyBinCount);
        }

        const currentAnalyser = analyser!;

        const startShadow = () => {
          if (bufferSourceRef.current) {
            try { bufferSourceRef.current.stop(); } catch {}
          }
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
          if (bufferSourceRef.current) {
            try { bufferSourceRef.current.stop(); } catch {}
            bufferSourceRef.current = null;
          }
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
    return () => {
      clearTimeout(timer);
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    };
  }, [audioElement, audioElement?.src]);

  return { analyserRef, dataRef, smoothedRef, isPlayingRef };
}

/**
 * Audio-reactive visualizer – identical wave rendering to Discovery page,
 * driven by audio energy instead of cursor position.
 */
export function AudioVisualizer({ audioElement, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const { analyserRef, dataRef, smoothedRef, isPlayingRef } = useAudioAnalyser(audioElement);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hsla = makeHslaFromCssVar('--primary');
    const waves = createWaveLines();
    let time = 0;
    let smoothEnergy = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Transient (hit/kick/snare) detection state
    let prevEnergy = 0;
    let transient = 0; // 0-1 spike that decays

    const draw = () => {
      time += 1 / 60;
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      // ── Read & smooth audio data ──
      const analyser = analyserRef.current;
      const data = dataRef.current;
      const smoothed = smoothedRef.current;
      let hasAudio = false;

      if (analyser && data && isPlayingRef.current) {
        analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
        for (let i = 0; i < data.length; i++) {
          if (data[i] > 0) { hasAudio = true; break; }
        }
      }

      // Faster lerp on attack, slower on release for snappy feel
      if (smoothed && data) {
        for (let i = 0; i < smoothed.length; i++) {
          const target = hasAudio ? data[i] / 255 : 0;
          const isRising = target > smoothed[i];
          const lerpSpeed = hasAudio ? (isRising ? 0.35 : 0.08) : 0.03;
          smoothed[i] += (target - smoothed[i]) * lerpSpeed;
        }
      }

      // Overall energy
      let rawEnergy = 0;
      if (smoothed) {
        for (let i = 0; i < smoothed.length; i++) rawEnergy += smoothed[i];
        rawEnergy /= smoothed.length;
      }

      // Faster energy tracking (attack fast, release medium)
      const energyLerp = rawEnergy > smoothEnergy ? 0.25 : 0.06;
      smoothEnergy += (rawEnergy - smoothEnergy) * energyLerp;

      // Transient / hit detection — spike when energy jumps suddenly
      const energyDelta = rawEnergy - prevEnergy;
      if (energyDelta > 0.04) {
        transient = Math.min(1, transient + energyDelta * 6);
      }
      transient *= 0.88; // fast decay
      prevEnergy = rawEnergy;

      // Combined reactivity = smooth energy + transient punch
      const reactivity = smoothEnergy + transient * 0.6;

      // Audio-driven expansion
      const targetExpansion = 1 + reactivity * 3.5;

      // ── Draw wave lines (1:1 from SoundwaveBackgroundCanvas) ──
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let wi = 0; wi < waves.length; wi++) {
        const wave = waves[wi];

        // Faster expansion tracking for hits
        const targetOffset = wave.baseYOffset * targetExpansion;
        wave.currentYOffset += (targetOffset - wave.currentYOffset) * 0.08;

        // Audio-reactive amplitude boost with transient punch
        const ampBoost = 1 + reactivity * 5.0;
        const effectiveAmplitude = wave.amplitude * ampBoost;

        ctx.beginPath();
        ctx.strokeStyle = hsla(wave.opacity + reactivity * 0.18);
        ctx.lineWidth = 1.5 + reactivity * 1.5;
        ctx.shadowBlur = 10 + smoothEnergy * 10;
        ctx.shadowColor = hsla(wave.opacity * 0.5 + smoothEnergy * 0.15);

        const pts = wave.points;
        const centerY = 0.5 + wave.currentYOffset;

        for (let i = 0; i < pts.length; i++) {
          const x = i / (pts.length - 1);
          const animatedY = pts[i] * Math.sin(time * wave.speed + wave.phase + i * 0.04);

          // Per-point frequency modulation
          let freqMod = 0;
          if (smoothed && hasAudio) {
            const binIdx = Math.floor(x * (smoothed.length * 0.75));
            freqMod = smoothed[Math.min(binIdx, smoothed.length - 1)] * 0.15;
          }

          const y = centerY + animatedY * effectiveAmplitude + freqMod * (wave.baseYOffset > 0 ? 1 : -1) * 0.08;

          if (i === 0) {
            ctx.moveTo(x * width, y * height);
          } else {
            const prevX = (i - 1) / (pts.length - 1);
            const prevAnimatedY = pts[i - 1] * Math.sin(time * wave.speed + wave.phase + (i - 1) * 0.04);
            let prevFreqMod = 0;
            if (smoothed && hasAudio) {
              const prevBin = Math.floor(prevX * (smoothed.length * 0.75));
              prevFreqMod = smoothed[Math.min(prevBin, smoothed.length - 1)] * 0.15;
            }
            const prevY = centerY + prevAnimatedY * effectiveAmplitude + prevFreqMod * (wave.baseYOffset > 0 ? 1 : -1) * 0.08;

            const cpX = ((prevX + x) / 2) * width;
            const cpY = ((prevY + y) / 2) * height;
            ctx.quadraticCurveTo(prevX * width, prevY * height, cpX, cpY);
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
