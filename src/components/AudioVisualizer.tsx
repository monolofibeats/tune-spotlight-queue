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

// ── Audio analyser hook — instant connection via MediaElementSource ──

function useAudioAnalyser(audioElement: HTMLAudioElement | null) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDomainRef = useRef<Float32Array | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioElement) return;

    // Already connected to this element
    if (connectedElRef.current === audioElement && analyserRef.current) return;

    const connect = async () => {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const actx = audioCtxRef.current;
        if (actx.state === 'suspended') await actx.resume();

        // MediaElementSource can only be created once per element
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        }

        const analyser = actx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;

        const source = actx.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(actx.destination); // Pass audio through to speakers

        sourceNodeRef.current = source;
        connectedElRef.current = audioElement;
        analyserRef.current = analyser;
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        timeDomainRef.current = new Float32Array(analyser.fftSize);
      } catch (err) {
        console.warn('AudioVisualizer: MediaElementSource failed, trying shadow pipeline', err);
        // Fallback: shadow pipeline
        await setupShadowPipeline(audioElement);
      }
    };

    // Shadow pipeline fallback
    const setupShadowPipeline = async (el: HTMLAudioElement) => {
      try {
        const actx = audioCtxRef.current!;
        const src = el.src;
        if (!src) return;

        const resp = await fetch(src);
        if (!resp.ok) return;
        const audioBuffer = await actx.decodeAudioData(await resp.arrayBuffer());

        const analyser = actx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
        const gain = actx.createGain();
        gain.gain.value = 0;
        analyser.connect(gain);
        gain.connect(actx.destination);

        analyserRef.current = analyser;
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        timeDomainRef.current = new Float32Array(analyser.fftSize);

        const startShadow = () => {
          const bs = actx.createBufferSource();
          bs.buffer = audioBuffer;
          bs.connect(analyser);
          bs.start(0, el.currentTime || 0);
          (el as any).__vizSource = bs;
        };
        const stopShadow = () => {
          const bs = (el as any).__vizSource;
          if (bs) { try { bs.stop(); } catch {} }
          (el as any).__vizSource = null;
        };

        el.addEventListener('play', startShadow);
        el.addEventListener('pause', stopShadow);
        el.addEventListener('ended', stopShadow);
        el.addEventListener('seeked', () => { if (!el.paused) { stopShadow(); startShadow(); } });

        if (!el.paused) startShadow();
        connectedElRef.current = el;
      } catch (err) {
        console.warn('AudioVisualizer: shadow pipeline also failed', err);
      }
    };

    connect();
  }, [audioElement]);

  // Resume AudioContext on user interaction if suspended
  useEffect(() => {
    if (!audioElement || !audioCtxRef.current) return;
    const resume = () => { if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume(); };
    audioElement.addEventListener('play', resume);
    return () => audioElement.removeEventListener('play', resume);
  }, [audioElement]);

  return { analyserRef, freqDataRef, timeDomainRef };
}

// ── Frequency scale labels ──
const FREQ_LABELS = [
  { freq: 20, label: '20' },
  { freq: 50, label: '50' },
  { freq: 100, label: '100' },
  { freq: 200, label: '200' },
  { freq: 500, label: '500' },
  { freq: 1000, label: '1k' },
  { freq: 2000, label: '2k' },
  { freq: 5000, label: '5k' },
  { freq: 10000, label: '10k' },
  { freq: 20000, label: '20k' },
];

/** Convert frequency to normalized x position (matching our log scale) */
function freqToX(freq: number, sampleRate: number, binCount: number): number {
  // Reverse the log mapping: normX^1.6 = freq / (sampleRate/2)
  const nyquist = sampleRate / 2;
  const logX = Math.min(1, freq / nyquist);
  const normX = Math.pow(logX, 1 / 1.6);
  return normX;
}

/**
 * Hybrid visualizer: homepage smooth wave lines + frequency spectrum displacement
 * + frequency scale (Hz) + LUFS meter
 */
export function AudioVisualizer({ audioElement, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const { analyserRef, freqDataRef, timeDomainRef } = useAudioAnalyser(audioElement);

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
    let smoothLufs = -60; // Start at silence

    // Margins for frequency labels
    const BOTTOM_MARGIN = 20;
    const RIGHT_MARGIN = 44; // LUFS meter width

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

      if (analyser && data) {
        analyser.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
        for (let i = 0; i < data.length; i++) {
          if (data[i] > 0) { hasAudio = true; break; }
        }
      }

      // ── Compute LUFS (approximation from time-domain RMS) ──
      let rms = 0;
      if (analyser && tdData && hasAudio) {
        analyser.getFloatTimeDomainData(tdData);
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

      // ══════════════════════════════════════════
      // ── Draw wave lines in waveW × waveH area ──
      // ══════════════════════════════════════════
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

      // ══════════════════════════════════════
      // ── Frequency scale labels at bottom ──
      // ══════════════════════════════════════
      ctx.save();
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = hsla(0.3);

      const sampleRate = analyser?.context?.sampleRate || 44100;
      const binCount = data?.length || 1024;

      for (const { freq, label } of FREQ_LABELS) {
        const normX = freqToX(freq, sampleRate, binCount);
        const px = normX * waveW;
        if (px < 10 || px > waveW - 10) continue;

        // Tick mark
        ctx.strokeStyle = hsla(0.15);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, waveH);
        ctx.lineTo(px, waveH + 4);
        ctx.stroke();

        // Label
        ctx.fillText(label, px, waveH + 14);
      }

      // "Hz" label at the start
      ctx.textAlign = 'left';
      ctx.fillStyle = hsla(0.2);
      ctx.fillText('Hz', 2, waveH + 14);
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

      // Filled level: map -60…0 LUFS to 0…1
      const lufsNorm = (clampedLufs + 60) / 60;
      const fillH = lufsNorm * meterH;

      // Color gradient: green → yellow → red
      if (fillH > 0) {
        const grad = ctx.createLinearGradient(0, meterBottom, 0, meterTop);
        grad.addColorStop(0, 'hsla(120, 70%, 45%, 0.8)');   // green (quiet)
        grad.addColorStop(0.5, 'hsla(50, 90%, 50%, 0.8)');  // yellow (mid)
        grad.addColorStop(0.85, 'hsla(20, 90%, 50%, 0.8)'); // orange (loud)
        grad.addColorStop(1, 'hsla(0, 80%, 50%, 0.9)');     // red (clip)
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(meterX, meterBottom - fillH, meterW, fillH, 3);
        ctx.fill();
      }

      // LUFS scale labels
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = hsla(0.3);
      const lufsLabels = [0, -6, -14, -24, -40, -60];
      for (const lv of lufsLabels) {
        const norm = (lv + 60) / 60;
        const ly = meterBottom - norm * meterH;
        // Small tick
        ctx.strokeStyle = hsla(0.12);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(meterX - 2, ly);
        ctx.lineTo(meterX, ly);
        ctx.stroke();
      }

      // Current LUFS value text
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = hsla(0.5);
      ctx.fillText(`${Math.round(clampedLufs)}`, meterX + meterW / 2, meterBottom + 14);

      // "LUFS" label at top
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
