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

// ── Shadow audio pipeline — pre-fetches buffer immediately, no delay ──

function useAudioAnalyser(audioElement: HTMLAudioElement | null) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDomainRef = useRef<Float32Array | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);
  const lastSrcRef = useRef('');
  const cleanupRef = useRef<(() => void) | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!audioElement) {
      analyserRef.current = null;
      freqDataRef.current = null;
      timeDomainRef.current = null;
      lastSrcRef.current = '';
      readyRef.current = false;
      return;
    }

    // Clean up previous listeners
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }

    const src = audioElement.src;
    if (!src) return;

    const srcChanged = src !== lastSrcRef.current;
    lastSrcRef.current = src;

    const setup = async () => {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const actx = audioCtxRef.current;
        if (actx.state === 'suspended') await actx.resume();

        // Only re-fetch/decode if source changed
        if (srcChanged || !analyserRef.current) {
          const resp = await fetch(src);
          if (!resp.ok) return;
          const audioBuffer = await actx.decodeAudioData(await resp.arrayBuffer());
          bufferRef.current = audioBuffer;

          const analyser = actx.createAnalyser();
          analyser.fftSize = 2048;
          analyser.smoothingTimeConstant = 0.3;
          const gain = actx.createGain();
          gain.gain.value = 0; // Silent — shadow only
          analyser.connect(gain);
          gain.connect(actx.destination);

          analyserRef.current = analyser;
          freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
          timeDomainRef.current = new Float32Array(analyser.fftSize);
        }

        readyRef.current = true;

        const startShadow = () => {
          if (!readyRef.current || !bufferRef.current || !analyserRef.current) return;
          // Stop any existing
          if (bufferSourceRef.current) { try { bufferSourceRef.current.stop(); } catch {} }
          const actx = audioCtxRef.current!;
          if (actx.state === 'suspended') actx.resume();
          const bs = actx.createBufferSource();
          bs.buffer = bufferRef.current;
          bs.connect(analyserRef.current);
          bufferSourceRef.current = bs;
          bs.start(0, audioElement.currentTime || 0);
          isPlayingRef.current = true;
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

        // If already playing, start immediately
        if (!audioElement.paused) startShadow();
      } catch (err) {
        console.warn('AudioVisualizer: analyser setup failed', err);
      }
    };

    // No delay — start setup immediately
    setup();

    return () => {
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    };
  }, [audioElement, audioElement?.src]);

  return { analyserRef, freqDataRef, timeDomainRef, isPlayingRef };
}

// ── Frequency scale config ──
const FREQ_LABELS: { freq: number; label: string; major: boolean }[] = [
  { freq: 20, label: '20', major: true },
  { freq: 50, label: '50', major: false },
  { freq: 100, label: '100', major: true },
  { freq: 200, label: '200', major: false },
  { freq: 500, label: '500', major: false },
  { freq: 1000, label: '1k', major: true },
  { freq: 2000, label: '2k', major: false },
  { freq: 5000, label: '5k', major: false },
  { freq: 10000, label: '10k', major: true },
  { freq: 20000, label: '20k', major: true },
];

function freqToX(freq: number, sampleRate: number): number {
  const nyquist = sampleRate / 2;
  const logX = Math.min(1, freq / nyquist);
  return Math.pow(logX, 1 / 1.6);
}

/**
 * Hybrid visualizer: homepage smooth wave lines + frequency spectrum displacement
 * + frequency scale (Hz) + LUFS meter
 */
export function AudioVisualizer({ audioElement, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const { analyserRef, freqDataRef, timeDomainRef, isPlayingRef } = useAudioAnalyser(audioElement);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hsla = makeHslaFromCssVar('--primary');
    const waves = createWaveLines();
    const POINT_COUNT = waves[0].points.length;
    const smoothedSpectrum = new Float32Array(POINT_COUNT);

    let time = 0;
    let smoothEnergy = 0;
    let smoothLufs = -60;

    const BOTTOM_MARGIN = 24;
    const RIGHT_MARGIN = 44;

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
      const { width: totalW, height: totalH } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, totalW, totalH);

      const waveW = totalW - RIGHT_MARGIN;
      const waveH = totalH - BOTTOM_MARGIN;

      const analyser = analyserRef.current;
      const data = freqDataRef.current;
      const tdData = timeDomainRef.current;
      let hasAudio = false;

      if (analyser && data && isPlayingRef.current) {
        analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
        for (let i = 0; i < data.length; i++) {
          if (data[i] > 0) { hasAudio = true; break; }
        }
      }

      // ── LUFS approximation ──
      let rms = 0;
      if (analyser && tdData && hasAudio) {
        analyser.getFloatTimeDomainData(tdData as Float32Array<ArrayBuffer>);
        let sumSq = 0;
        for (let i = 0; i < tdData.length; i++) sumSq += tdData[i] * tdData[i];
        rms = Math.sqrt(sumSq / tdData.length);
      }
      const rawLufs = rms > 0 ? 20 * Math.log10(rms) - 0.691 : -60;
      const lufsLerp = rawLufs > smoothLufs ? 0.4 : 0.05;
      smoothLufs += (rawLufs - smoothLufs) * lufsLerp;
      const clampedLufs = Math.max(-60, Math.min(0, smoothLufs));

      // ── Map frequency spectrum to wave points ──
      if (data) {
        const binCount = data.length;
        for (let p = 0; p < POINT_COUNT; p++) {
          const normX = p / (POINT_COUNT - 1);
          const logX = Math.pow(normX, 1.6);
          const binIdx = Math.min(Math.floor(logX * binCount), binCount - 1);
          const spread = Math.max(1, Math.floor(binCount / POINT_COUNT));
          let sum = 0, count = 0;
          for (let b = Math.max(0, binIdx - spread); b <= Math.min(binCount - 1, binIdx + spread); b++) {
            sum += (hasAudio ? data[b] / 255 : 0);
            count++;
          }
          const target = sum / count;
          const rising = target > smoothedSpectrum[p];
          const lerp = rising ? 0.65 : 0.06;
          smoothedSpectrum[p] += (target - smoothedSpectrum[p]) * lerp;
        }
      }

      let rawEnergy = 0;
      for (let p = 0; p < POINT_COUNT; p++) rawEnergy += smoothedSpectrum[p];
      rawEnergy /= POINT_COUNT;
      const eLerp = rawEnergy > smoothEnergy ? 0.3 : 0.05;
      smoothEnergy += (rawEnergy - smoothEnergy) * eLerp;

      // ══════════════════════════════
      // ── Draw wave lines ──
      // ══════════════════════════════
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const waveExpansion = 1 + smoothEnergy * 1.2;

      for (let wi = 0; wi < waves.length; wi++) {
        const wave = waves[wi];
        const distFromCenter = Math.abs(wi - (waves.length - 1) / 2) / ((waves.length - 1) / 2);
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
        const dir = wave.baseYOffset >= 0 ? 1 : -1;
        const freqStrength = 0.05 + distFromCenter * 0.25;

        for (let i = 0; i < pts.length; i++) {
          const x = i / (pts.length - 1);
          const animatedY = pts[i] * Math.sin(time * wave.speed + wave.phase + i * 0.04);
          const spectrumVal = smoothedSpectrum[i];
          const freqDisplacement = spectrumVal * dir * freqStrength;
          const y = centerY + animatedY * wave.amplitude + freqDisplacement;

          const px = x * waveW;
          const py = y * waveH;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            const prevX = (i - 1) / (pts.length - 1);
            const prevAnimatedY = pts[i - 1] * Math.sin(time * wave.speed + wave.phase + (i - 1) * 0.04);
            const prevFreqDisp = smoothedSpectrum[i - 1] * dir * freqStrength;
            const prevY = centerY + prevAnimatedY * wave.amplitude + prevFreqDisp;
            const cpX = ((prevX + x) / 2) * waveW;
            const cpY = ((prevY + y) / 2) * waveH;
            ctx.quadraticCurveTo(prevX * waveW, prevY * waveH, cpX, cpY);
          }
        }
        ctx.stroke();
      }
      ctx.restore();

      // ══════════════════════════════════════════
      // ── Frequency scale at bottom (enhanced) ──
      // ══════════════════════════════════════════
      ctx.save();
      const sampleRate = analyser?.context?.sampleRate || 44100;
      const scaleY = waveH + 1;

      // Base line across the bottom
      ctx.strokeStyle = hsla(0.12);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scaleY);
      ctx.lineTo(waveW, scaleY);
      ctx.stroke();

      // Minor ticks between labels (sub-divisions)
      const minorFreqs = [30, 40, 60, 70, 80, 150, 300, 400, 600, 700, 800, 1500, 3000, 4000, 6000, 7000, 8000, 15000];
      ctx.strokeStyle = hsla(0.06);
      ctx.lineWidth = 1;
      for (const f of minorFreqs) {
        const nx = freqToX(f, sampleRate);
        const px = nx * waveW;
        if (px < 4 || px > waveW - 4) continue;
        ctx.beginPath();
        ctx.moveTo(px, scaleY);
        ctx.lineTo(px, scaleY + 3);
        ctx.stroke();
      }

      // Major labels with ticks
      for (const { freq, label, major } of FREQ_LABELS) {
        const nx = freqToX(freq, sampleRate);
        const px = nx * waveW;
        if (px < 8 || px > waveW - 8) continue;

        // Tick mark — taller for major
        const tickH = major ? 7 : 5;
        ctx.strokeStyle = major ? hsla(0.3) : hsla(0.15);
        ctx.lineWidth = major ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(px, scaleY);
        ctx.lineTo(px, scaleY + tickH);
        ctx.stroke();

        // Label text
        ctx.font = major ? 'bold 10px monospace' : '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = major ? hsla(0.6) : hsla(0.35);
        ctx.fillText(label, px, scaleY + tickH + 10);
      }

      // "Hz" unit label
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = hsla(0.25);
      ctx.fillText('Hz', waveW - 2, scaleY + 18);
      ctx.restore();

      // ══════════════════════════════
      // ── LUFS meter on the right ──
      // ══════════════════════════════
      ctx.save();
      const meterX = waveW + 8;
      const meterW = RIGHT_MARGIN - 14;
      const meterTop = 12;
      const meterBottom = waveH - 4;
      const meterH = meterBottom - meterTop;

      // Background track
      ctx.fillStyle = hsla(0.06);
      ctx.beginPath();
      ctx.roundRect(meterX, meterTop, meterW, meterH, 3);
      ctx.fill();

      // Filled level
      const lufsNorm = (clampedLufs + 60) / 60;
      const fillH = lufsNorm * meterH;

      if (fillH > 0) {
        const grad = ctx.createLinearGradient(0, meterBottom, 0, meterTop);
        grad.addColorStop(0, 'hsla(120, 70%, 45%, 0.8)');
        grad.addColorStop(0.5, 'hsla(50, 90%, 50%, 0.8)');
        grad.addColorStop(0.85, 'hsla(20, 90%, 50%, 0.8)');
        grad.addColorStop(1, 'hsla(0, 80%, 50%, 0.9)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(meterX, meterBottom - fillH, meterW, fillH, 3);
        ctx.fill();
      }

      // LUFS scale ticks & labels
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      const lufsLabels = [0, -6, -14, -24, -40, -60];
      for (const lv of lufsLabels) {
        const norm = (lv + 60) / 60;
        const ly = meterBottom - norm * meterH;
        ctx.strokeStyle = hsla(0.15);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(meterX - 3, ly);
        ctx.lineTo(meterX, ly);
        ctx.stroke();
      }

      // Current LUFS value
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = hsla(0.5);
      ctx.fillText(`${Math.round(clampedLufs)}`, meterX + meterW / 2, meterBottom + 14);

      // "LUFS" label
      ctx.font = '7px monospace';
      ctx.fillStyle = hsla(0.25);
      ctx.fillText('LUFS', meterX + meterW / 2, meterTop - 3);

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
      style={{ height: 220 }}
      aria-hidden="true"
    />
  );
}
