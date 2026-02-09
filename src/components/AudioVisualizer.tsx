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

// ── Exact homepage wave line creation ──

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
          analyser.fftSize = 2048;
          analyser.smoothingTimeConstant = 0.3;
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
            if (!buf) { try { const r = await fetch(src); if (!r.ok) return; buf = await actx.decodeAudioData(await r.arrayBuffer()); } catch { return; } }
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
 * Hybrid visualizer: exact homepage smooth wave lines +
 * frequency spectrum (0–20kHz left→right) as displacement.
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
    const waves = createWaveLines();
    const POINT_COUNT = waves[0].points.length; // 100

    // Smoothed spectrum values per wave point (persistent across frames)
    const smoothedSpectrum = new Float32Array(POINT_COUNT);

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

      // Map full frequency spectrum to wave points (log-scaled, 0–20kHz L→R)
      if (data) {
        const binCount = data.length;
        for (let p = 0; p < POINT_COUNT; p++) {
          const normX = p / (POINT_COUNT - 1);
          // Log scale gives bass/mids more resolution
          const logX = Math.pow(normX, 1.6);
          const binIdx = Math.min(Math.floor(logX * binCount), binCount - 1);
          // Small neighborhood average for smoothness
          const spread = Math.max(1, Math.floor(binCount / POINT_COUNT));
          let sum = 0, count = 0;
          for (let b = Math.max(0, binIdx - spread); b <= Math.min(binCount - 1, binIdx + spread); b++) {
            sum += (hasAudio ? data[b] / 255 : 0);
            count++;
          }
          const target = sum / count;
          // Fast attack, smooth release
          const rising = target > smoothedSpectrum[p];
          const lerp = rising ? 0.65 : 0.06;
          smoothedSpectrum[p] += (target - smoothedSpectrum[p]) * lerp;
        }
      }

      // Overall energy for expansion
      let rawEnergy = 0;
      for (let p = 0; p < POINT_COUNT; p++) rawEnergy += smoothedSpectrum[p];
      rawEnergy /= POINT_COUNT;
      const eLerp = rawEnergy > smoothEnergy ? 0.3 : 0.05;
      smoothEnergy += (rawEnergy - smoothEnergy) * eLerp;

      // ── Draw wave lines (exact homepage rendering) ──
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Audio-driven expansion — reduced, only outer lines spread on spikes
      const waveExpansion = 1 + smoothEnergy * 1.2;

      for (let wi = 0; wi < waves.length; wi++) {
        const wave = waves[wi];

        // How far from center this line is (0 = center, 1 = outermost)
        const distFromCenter = Math.abs(wi - (waves.length - 1) / 2) / ((waves.length - 1) / 2);

        // Only outer lines expand; center lines stay tight
        const lineExpansion = 1 + (waveExpansion - 1) * Math.pow(distFromCenter, 2.0);
        const targetOffset = wave.baseYOffset * lineExpansion;
        wave.currentYOffset += (targetOffset - wave.currentYOffset) * 0.04;

        ctx.beginPath();
        ctx.strokeStyle = hsla(wave.opacity + smoothEnergy * 0.1);
        ctx.lineWidth = 1.5 + smoothEnergy * 0.8;
        ctx.shadowBlur = 10 + smoothEnergy * 8;
        ctx.shadowColor = hsla(wave.opacity * 0.5 + smoothEnergy * 0.1);

        const pts = wave.points;
        const centerY = 0.5 + wave.currentYOffset;

        // Direction: lines above center push up, below push down
        const dir = wave.baseYOffset >= 0 ? 1 : -1;

        // Outer lines get more freq displacement, center lines get very little
        const freqStrength = 0.05 + distFromCenter * 0.25;

        for (let i = 0; i < pts.length; i++) {
          const x = i / (pts.length - 1);

          // Homepage animated wave (identical formula)
          const animatedY = pts[i] * Math.sin(time * wave.speed + wave.phase + i * 0.04);

          // Frequency spectrum displacement — scaled by line's distance from center
          const spectrumVal = smoothedSpectrum[i];
          const freqDisplacement = spectrumVal * dir * freqStrength;

          const y = centerY + animatedY * wave.amplitude + freqDisplacement;

          if (i === 0) {
            ctx.moveTo(x * width, y * height);
          } else {
            // Quadratic curve interpolation (identical to homepage)
            const prevX = (i - 1) / (pts.length - 1);
            const prevAnimatedY = pts[i - 1] * Math.sin(time * wave.speed + wave.phase + (i - 1) * 0.04);
            const prevSpectrumVal = smoothedSpectrum[i - 1];
            const prevFreqDisp = prevSpectrumVal * dir * freqStrength;
            const prevY = centerY + prevAnimatedY * wave.amplitude + prevFreqDisp;

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
