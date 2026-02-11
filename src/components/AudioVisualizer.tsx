import { useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type VisualizerMode = 'spectrum' | 'polar-sample' | 'polar-level' | 'lissajous';

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

// ── Wave line for spectrum mode ──
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
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDomainRef = useRef<Float32Array | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const lastSrcRef = useRef('');
  const cleanupRef = useRef<(() => void) | null>(null);
  const readyRef = useRef(false);
  const setupIdRef = useRef(0); // guard against stale async completions

  // Full teardown helper
  const teardown = () => {
    if (bufferSourceRef.current) { try { bufferSourceRef.current.stop(); } catch {} bufferSourceRef.current = null; }
    if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch {} analyserRef.current = null; }
    if (gainNodeRef.current) { try { gainNodeRef.current.disconnect(); } catch {} gainNodeRef.current = null; }
    freqDataRef.current = null;
    timeDomainRef.current = null;
    bufferRef.current = null;
    readyRef.current = false;
    isPlayingRef.current = false;
  };

  useEffect(() => {
    // Always clean up previous session first
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    teardown();

    if (!audioElement) {
      lastSrcRef.current = '';
      return;
    }

    const src = audioElement.src;
    if (!src) { lastSrcRef.current = ''; return; }

    lastSrcRef.current = src;
    const mySetupId = ++setupIdRef.current;

    const setup = async () => {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const actx = audioCtxRef.current;
        if (actx.state === 'suspended') await actx.resume();

        // Fetch and decode the audio file
        const resp = await fetch(src);
        if (!resp.ok || mySetupId !== setupIdRef.current) return;
        const arrayBuf = await resp.arrayBuffer();
        if (mySetupId !== setupIdRef.current) return;
        const audioBuffer = await actx.decodeAudioData(arrayBuf);
        if (mySetupId !== setupIdRef.current) return;

        bufferRef.current = audioBuffer;

        const analyser = actx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
        const gain = actx.createGain();
        gain.gain.value = 0;
        analyser.connect(gain);
        gain.connect(actx.destination);

        analyserRef.current = analyser;
        gainNodeRef.current = gain;
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        timeDomainRef.current = new Float32Array(analyser.fftSize);
        readyRef.current = true;

        const startShadow = () => {
          if (!readyRef.current || !bufferRef.current || !analyserRef.current) return;
          if (bufferSourceRef.current) { try { bufferSourceRef.current.stop(); } catch {} }
          const actx2 = audioCtxRef.current!;
          if (actx2.state === 'suspended') actx2.resume();
          const bs = actx2.createBufferSource();
          bs.buffer = bufferRef.current;
          bs.connect(analyserRef.current!);
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

        if (!audioElement.paused) startShadow();
      } catch (err) {
        console.warn('AudioVisualizer: analyser setup failed', err);
      }
    };

    setup();

    return () => {
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioElement, audioElement?.src]);

  return { analyserRef, freqDataRef, timeDomainRef, isPlayingRef };
}

// ── Frequency scale config ──
const MAX_FREQ = 20000; // Hard cap at 20kHz
const MIN_FREQ = 20;
const MIN_LOG = Math.log10(MIN_FREQ);
const MAX_LOG = Math.log10(MAX_FREQ);

const FREQ_LABELS: { freq: number; label: string; major: boolean }[] = [
  { freq: 20, label: '20', major: true },
  { freq: 50, label: '50', major: false },
  { freq: 100, label: '100', major: true },
  { freq: 200, label: '200', major: false },
  { freq: 500, label: '500', major: false },
  { freq: 1000, label: '1k', major: true },
  { freq: 2000, label: '2k', major: false },
  { freq: 5000, label: '5k', major: true },
  { freq: 10000, label: '10k', major: true },
  { freq: 20000, label: '20k', major: true },
];

// Map frequency to normalized X position [0..1] using log scale, 20Hz→0, 20kHz→1
function freqToX(freq: number): number {
  const logF = Math.log10(Math.max(MIN_FREQ, Math.min(freq, MAX_FREQ)));
  return (logF - MIN_LOG) / (MAX_LOG - MIN_LOG);
}

// ── Key detection helpers ──
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const CAMELOT_MAP: Record<string, string> = {
  'C Major': '8B', 'G Major': '9B', 'D Major': '10B', 'A Major': '11B',
  'E Major': '12B', 'B Major': '1B', 'F# Major': '2B', 'C# Major': '3B',
  'G# Major': '4B', 'D# Major': '5B', 'A# Major': '6B', 'F Major': '7B',
  'A Minor': '8A', 'E Minor': '9A', 'B Minor': '10A', 'F# Minor': '11A',
  'C# Minor': '12A', 'G# Minor': '1A', 'D# Minor': '2A', 'A# Minor': '3A',
  'F Minor': '4A', 'C Minor': '5A', 'G Minor': '6A', 'D Minor': '7A',
};

function correlate(chroma: number[], profile: number[]): number {
  const n = 12;
  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) { sumX += chroma[i]; sumY += profile[i]; }
  const meanX = sumX / n, meanY = sumY / n;
  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = chroma[i] - meanX;
    const dy = profile[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  return num / Math.sqrt(denomX * denomY + 1e-10);
}

function detectKeyFromChroma(chroma: number[]): { key: string; mode: string; confidence: number; secondKey: string; secondMode: string; secondConf: number } {
  let bestKey = 'C', bestMode = 'Major', bestCorr = -Infinity;
  let secondKey = 'C', secondMode = 'Major', secondCorr = -Infinity;

  for (let shift = 0; shift < 12; shift++) {
    const rotated = [...chroma.slice(shift), ...chroma.slice(0, shift)];
    const majCorr = correlate(rotated, MAJOR_PROFILE);
    if (majCorr > bestCorr) {
      secondCorr = bestCorr; secondKey = bestKey; secondMode = bestMode;
      bestCorr = majCorr; bestKey = NOTE_NAMES[shift]; bestMode = 'Major';
    } else if (majCorr > secondCorr) {
      secondCorr = majCorr; secondKey = NOTE_NAMES[shift]; secondMode = 'Major';
    }
    const minCorr = correlate(rotated, MINOR_PROFILE);
    if (minCorr > bestCorr) {
      secondCorr = bestCorr; secondKey = bestKey; secondMode = bestMode;
      bestCorr = minCorr; bestKey = NOTE_NAMES[shift]; bestMode = 'Minor';
    } else if (minCorr > secondCorr) {
      secondCorr = minCorr; secondKey = NOTE_NAMES[shift]; secondMode = 'Minor';
    }
  }

  const confidence = Math.round(Math.max(0, Math.min(100, (bestCorr + 1) * 50)));
  const secondConf = Math.round(Math.max(0, Math.min(100, (secondCorr + 1) * 50)));
  return { key: bestKey, mode: bestMode, confidence, secondKey, secondMode, secondConf };
}

function keyDistance(key1: string, mode1: string, key2: string, mode2: string): number {
  const idx1 = NOTE_NAMES.indexOf(key1);
  const idx2 = NOTE_NAMES.indexOf(key2);
  if (idx1 < 0 || idx2 < 0) return 12;
  let dist = Math.abs(idx1 - idx2);
  if (dist > 6) dist = 12 - dist;
  if (dist === 0 && mode1 !== mode2) return 1;
  if (dist === 3 && mode1 !== mode2) return 0;
  return dist;
}

// ═══════════════════════════════════════
// ── Main Component ──
// ═══════════════════════════════════════

export function AudioVisualizer({ audioElement, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('spectrum');
  const modeRef = useRef<VisualizerMode>('spectrum');
  const { analyserRef, freqDataRef, timeDomainRef, isPlayingRef } = useAudioAnalyser(audioElement);

  // Keep modeRef in sync
  useEffect(() => { modeRef.current = mode; }, [mode]);

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
    let smoothDb = -60;

    // Integrated LUFS state
    let integratedSumSq = 0;
    let integratedSampleCount = 0;
    let integratedLufs = -60;

    // Key detection state
    const chroma = new Float64Array(12);
    let chromaFrameCount = 0;
    let lastKeyUpdate = 0;
    let detectedKey = '';
    let detectedMode = '';
    let detectedConf = 0;
    let detectedCamelot = '';
    let establishedKey = '';
    let establishedMode = '';
    let keyDrift = 0;
    let driftMessage = '';
    let keyDisplayAlpha = 0;
    const KEY_UPDATE_INTERVAL = 0.4;

    // Lissajous history
    const lissajousHistory: { x: number; y: number }[] = [];
    const LISSAJOUS_MAX = 2048;

    const BOTTOM_MARGIN = 28;
    const RIGHT_MARGIN = 120;

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

      const currentMode = modeRef.current;
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

      // ── LUFS & dB ──
      let rms = 0;
      let peak = 0;
      if (analyser && tdData && hasAudio) {
        analyser.getFloatTimeDomainData(tdData as Float32Array<ArrayBuffer>);
        let sumSq = 0;
        for (let i = 0; i < tdData.length; i++) {
          sumSq += tdData[i] * tdData[i];
          const abs = Math.abs(tdData[i]);
          if (abs > peak) peak = abs;
        }
        rms = Math.sqrt(sumSq / tdData.length);
      }

      if (rms > 0 && tdData) {
        for (let i = 0; i < tdData.length; i++) {
          integratedSumSq += tdData[i] * tdData[i];
        }
        integratedSampleCount += tdData.length;
        const intRms = Math.sqrt(integratedSumSq / integratedSampleCount);
        integratedLufs = 20 * Math.log10(intRms) - 0.691;
      }
      const clampedLufs = Math.max(-60, Math.min(0, integratedLufs));

      const rawDb = peak > 0 ? 20 * Math.log10(peak) : -60;
      const dbLerp = rawDb > smoothDb ? 0.5 : 0.08;
      smoothDb += (rawDb - smoothDb) * dbLerp;
      const clampedDb = Math.max(-60, Math.min(0, smoothDb));

      // ── Key detection ──
      if (hasAudio && data && analyser) {
        const sampleRate = analyser.context.sampleRate;
        const binCount = data.length;
        for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
          let energy = 0;
          for (let octave = 1; octave <= 7; octave++) {
            const noteNumber = pitchClass + 12 * octave;
            const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
            const nyquist = sampleRate / 2;
            if (freq >= nyquist) continue;
            const binIdx = Math.round(freq / nyquist * binCount);
            if (binIdx >= 0 && binIdx < binCount) energy += data[binIdx] / 255;
          }
          chroma[pitchClass] = chroma[pitchClass] * 0.92 + energy * 0.08;
        }
        chromaFrameCount++;

        if (time - lastKeyUpdate > KEY_UPDATE_INTERVAL && chromaFrameCount > 10) {
          lastKeyUpdate = time;
          const maxC = Math.max(...Array.from(chroma));
          if (maxC > 0.01) {
            const normChroma = Array.from(chroma).map(c => c / maxC);
            const result = detectKeyFromChroma(normChroma);
            detectedKey = result.key;
            detectedMode = result.mode;
            detectedConf = result.confidence;
            detectedCamelot = CAMELOT_MAP[`${result.key} ${result.mode}`] || '?';

            if (!establishedKey && detectedConf > 60) {
              establishedKey = detectedKey;
              establishedMode = detectedMode;
            }

            if (establishedKey) {
              const dist = keyDistance(detectedKey, detectedMode, establishedKey, establishedMode);
              keyDrift = dist;
              if (dist === 0) driftMessage = '';
              else if (dist <= 2) driftMessage = 'Slight pitch drift';
              else if (dist <= 4) {
                const semiDiff = Math.abs(NOTE_NAMES.indexOf(detectedKey) - NOTE_NAMES.indexOf(establishedKey));
                const direction = semiDiff <= 6
                  ? (NOTE_NAMES.indexOf(detectedKey) > NOTE_NAMES.indexOf(establishedKey) ? '↑' : '↓')
                  : (NOTE_NAMES.indexOf(detectedKey) > NOTE_NAMES.indexOf(establishedKey) ? '↓' : '↑');
                driftMessage = `Off-key ${direction} · Tune to ${establishedKey}`;
              } else {
                driftMessage = `Key change → ${detectedKey} ${detectedMode}`;
              }
            }
          }
        }
      } else if (!hasAudio) {
        keyDisplayAlpha = Math.max(0, keyDisplayAlpha - 0.02);
      }

      if (hasAudio && detectedKey) keyDisplayAlpha = Math.min(1, keyDisplayAlpha + 0.05);

      // ── Map frequency spectrum (capped at 20kHz) ──
      const sampleRate = analyser?.context?.sampleRate || 44100;
      const binCount = data ? data.length : 1;
      const maxBin = Math.min(binCount, Math.ceil(MAX_FREQ / (sampleRate / 2) * binCount));

      if (data) {
        for (let p = 0; p < POINT_COUNT; p++) {
          const normX = p / (POINT_COUNT - 1);
          const freq = Math.pow(10, MIN_LOG + normX * (MAX_LOG - MIN_LOG));
          const binIdx = Math.min(Math.floor(freq / (sampleRate / 2) * binCount), maxBin - 1);
          const spread = Math.max(1, Math.floor(maxBin / POINT_COUNT));
          let sum = 0, count = 0;
          for (let b = Math.max(0, binIdx - spread); b <= Math.min(maxBin - 1, binIdx + spread); b++) {
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

      // ═══════════════════════════════════════
      // ── Draw based on mode ──
      // ═══════════════════════════════════════

      if (currentMode === 'spectrum') {
        drawSpectrum(ctx, waves, smoothedSpectrum, smoothEnergy, time, waveW, waveH, hsla, POINT_COUNT, sampleRate);
      } else if (currentMode === 'polar-sample' && tdData) {
        drawPolarSample(ctx, tdData, hasAudio, waveW, waveH, hsla);
      } else if (currentMode === 'polar-level' && data) {
        drawPolarLevel(ctx, data, hasAudio, waveW, waveH, hsla, maxBin);
      } else if (currentMode === 'lissajous' && tdData) {
        drawLissajous(ctx, tdData, hasAudio, waveW, waveH, hsla, lissajousHistory, LISSAJOUS_MAX);
      }

      // ── LUFS + dB meters (always drawn) ──
      drawMeters(ctx, clampedLufs, clampedDb, waveW, waveH, hsla);

      // ── Key indicator (always drawn) ──
      if (detectedKey && keyDisplayAlpha > 0.01) {
        drawKeyIndicator(ctx, detectedKey, detectedMode, detectedConf, detectedCamelot, keyDrift, driftMessage, keyDisplayAlpha, waveW, hsla);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Mode selector */}
      <div className="absolute top-2 left-2 z-10">
        <Select value={mode} onValueChange={(v) => setMode(v as VisualizerMode)}>
          <SelectTrigger className="h-7 w-[140px] text-[11px] bg-background/80 border-border/50 backdrop-blur-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spectrum">Spectrum</SelectItem>
            <SelectItem value="polar-sample">Polar Sample</SelectItem>
            <SelectItem value="polar-level">Polar Level</SelectItem>
            <SelectItem value="lissajous">Lissajous</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full pointer-events-none"
        style={{ height: 320 }}
        aria-hidden="true"
      />
    </div>
  );
}

// ═══════════════════════════════════════
// ── Drawing functions ──
// ═══════════════════════════════════════

function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  waves: WaveLine[],
  smoothedSpectrum: Float32Array,
  smoothEnergy: number,
  time: number,
  waveW: number,
  waveH: number,
  hsla: (a: number) => string,
  POINT_COUNT: number,
  sampleRate: number,
) {
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

  // ── Frequency scale at bottom ──
  ctx.save();
  const scaleY = waveH + 1;

  ctx.strokeStyle = hsla(0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, scaleY);
  ctx.lineTo(waveW, scaleY);
  ctx.stroke();

  const minorFreqs = [30, 40, 60, 70, 80, 150, 300, 400, 600, 700, 800, 1500, 3000, 4000, 6000, 7000, 8000, 15000];
  ctx.strokeStyle = hsla(0.06);
  ctx.lineWidth = 1;
  for (const f of minorFreqs) {
    const nx = freqToX(f);
    const px = nx * waveW;
    if (px < 4 || px > waveW - 4) continue;
    ctx.beginPath();
    ctx.moveTo(px, scaleY);
    ctx.lineTo(px, scaleY + 3);
    ctx.stroke();
  }

  for (const { freq, label, major } of FREQ_LABELS) {
    const nx = freqToX(freq);
    const px = nx * waveW;
    if (px < 8 || px > waveW - 8) continue;
    const tickH = major ? 7 : 5;
    ctx.strokeStyle = major ? hsla(0.3) : hsla(0.15);
    ctx.lineWidth = major ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(px, scaleY);
    ctx.lineTo(px, scaleY + tickH);
    ctx.stroke();
    ctx.font = major ? 'bold 10px monospace' : '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = major ? hsla(0.6) : hsla(0.35);
    ctx.fillText(label, px, scaleY + tickH + 10);
  }

  ctx.font = '8px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = hsla(0.25);
  ctx.fillText('Hz', waveW - 2, scaleY + 18);
  ctx.restore();
}

// ── Polar Sample: waveform plotted in polar coordinates (smoothed) ──
const polarSampleSmoothed: Float32Array = new Float32Array(512);

function drawPolarSample(
  ctx: CanvasRenderingContext2D,
  tdData: Float32Array,
  hasAudio: boolean,
  waveW: number,
  waveH: number,
  hsla: (a: number) => string,
) {
  const cx = waveW / 2;
  const cy = waveH / 2;
  const maxR = Math.min(waveW, waveH) * 0.42;

  // Draw grid circles
  ctx.save();
  for (let r = 0.25; r <= 1; r += 0.25) {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * r, 0, Math.PI * 2);
    ctx.strokeStyle = hsla(0.08);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Cross lines
  ctx.strokeStyle = hsla(0.06);
  ctx.beginPath();
  ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
  ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
  ctx.stroke();

  if (!hasAudio) { ctx.restore(); return; }

  // Downsample and smooth the waveform for less aggressive movement
  const numPoints = polarSampleSmoothed.length;
  const step = Math.max(1, Math.floor(tdData.length / numPoints));
  const smoothing = 0.12; // lower = smoother/slower
  for (let i = 0; i < numPoints; i++) {
    const srcIdx = Math.min(i * step, tdData.length - 1);
    const target = tdData[srcIdx];
    polarSampleSmoothed[i] += (target - polarSampleSmoothed[i]) * smoothing;
  }

  // Draw smoothed waveform as polar
  ctx.beginPath();
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
    const sample = polarSampleSmoothed[i];
    const r = (0.3 + Math.abs(sample) * 0.7) * maxR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = hsla(0.7);
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 8;
  ctx.shadowColor = hsla(0.3);
  ctx.stroke();
  ctx.restore();
}
// ── Polar Level: frequency magnitudes in polar coordinates (smoothed, DC-skip) ──
const polarLevelSmoothed: Float32Array = new Float32Array(128);

function drawPolarLevel(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  hasAudio: boolean,
  waveW: number,
  waveH: number,
  hsla: (a: number) => string,
  maxBin: number,
) {
  const cx = waveW / 2;
  const cy = waveH / 2;
  const maxR = Math.min(waveW, waveH) * 0.42;

  // Draw grid
  ctx.save();
  for (let r = 0.25; r <= 1; r += 0.25) {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * r, 0, Math.PI * 2);
    ctx.strokeStyle = hsla(0.08);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.strokeStyle = hsla(0.06);
  ctx.beginPath();
  ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
  ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
  ctx.stroke();

  if (!hasAudio) { ctx.restore(); return; }

  // Draw frequency bars as spokes, skip DC bins (first ~3 bins)
  const numSpokes = polarLevelSmoothed.length;
  const dcSkip = 3; // skip first 3 bins (DC / sub-bass rumble)
  const usableBins = maxBin - dcSkip;
  const binsPerSpoke = Math.max(1, Math.floor(usableBins / numSpokes));

  for (let i = 0; i < numSpokes; i++) {
    const binStart = dcSkip + Math.floor(i * usableBins / numSpokes);
    let sum = 0, count = 0;
    for (let b = binStart; b < Math.min(binStart + binsPerSpoke, maxBin); b++) {
      sum += data[b] / 255;
      count++;
    }
    const target = count > 0 ? sum / count : 0;
    // Smooth to reduce spikiness
    polarLevelSmoothed[i] += (target - polarLevelSmoothed[i]) * 0.18;
  }

  ctx.beginPath();
  for (let i = 0; i < numSpokes; i++) {
    const angle = (i / numSpokes) * Math.PI * 2 - Math.PI / 2;
    const mag = polarLevelSmoothed[i];
    const r = (0.15 + mag * 0.85) * maxR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Fill
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  grad.addColorStop(0, hsla(0.05));
  grad.addColorStop(1, hsla(0.15));
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = hsla(0.6);
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 10;
  ctx.shadowColor = hsla(0.3);
  ctx.stroke();
  ctx.restore();
}

// ── Lissajous: X-Y plot with wider sample spacing for full quadrant coverage ──
function drawLissajous(
  ctx: CanvasRenderingContext2D,
  tdData: Float32Array,
  hasAudio: boolean,
  waveW: number,
  waveH: number,
  hsla: (a: number) => string,
  history: { x: number; y: number }[],
  maxHistory: number,
) {
  const cx = waveW / 2;
  const cy = waveH / 2;
  const scale = Math.min(waveW, waveH) * 0.4;

  // Grid
  ctx.save();
  ctx.strokeStyle = hsla(0.08);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - scale, cy); ctx.lineTo(cx + scale, cy);
  ctx.moveTo(cx, cy - scale); ctx.lineTo(cx, cy + scale);
  ctx.stroke();

  // Diagonal lines for all quadrants
  ctx.strokeStyle = hsla(0.04);
  ctx.beginPath();
  ctx.moveTo(cx - scale, cy - scale); ctx.lineTo(cx + scale, cy + scale);
  ctx.moveTo(cx - scale, cy + scale); ctx.lineTo(cx + scale, cy - scale);
  ctx.stroke();

  // Box outline
  ctx.strokeStyle = hsla(0.06);
  ctx.strokeRect(cx - scale, cy - scale, scale * 2, scale * 2);

  if (!hasAudio) { ctx.restore(); return; }

  // Use a quarter-period offset for L/R-like separation (creates proper figure-8 / ellipse)
  // This spreads the pattern across all four quadrants
  const offset = Math.floor(tdData.length / 4);
  const step = 4;
  const smoothing = 0.15;
  
  for (let i = 0; i < tdData.length - offset; i += step) {
    const rawX = tdData[i];
    const rawY = tdData[i + offset];
    // Smooth new points before adding to history
    if (history.length > 0) {
      const last = history[history.length - 1];
      history.push({
        x: last.x + (rawX - last.x) * smoothing,
        y: last.y + (rawY - last.y) * smoothing,
      });
    } else {
      history.push({ x: rawX, y: rawY });
    }
  }
  while (history.length > maxHistory) history.shift();

  // Draw with fading trail
  for (let i = 1; i < history.length; i++) {
    const alpha = (i / history.length) * 0.6;
    const p = history[i];
    const prev = history[i - 1];
    ctx.beginPath();
    ctx.moveTo(cx + prev.x * scale, cy + prev.y * scale);
    ctx.lineTo(cx + p.x * scale, cy + p.y * scale);
    ctx.strokeStyle = hsla(alpha);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Current dot
  if (history.length > 0) {
    const last = history[history.length - 1];
    ctx.beginPath();
    ctx.arc(cx + last.x * scale, cy + last.y * scale, 3, 0, Math.PI * 2);
    ctx.fillStyle = hsla(0.9);
    ctx.shadowBlur = 8;
    ctx.shadowColor = hsla(0.5);
    ctx.fill();
  }

  ctx.restore();
}

// ── Shared: LUFS + dB meters ──
function drawMeters(
  ctx: CanvasRenderingContext2D,
  clampedLufs: number,
  clampedDb: number,
  waveW: number,
  waveH: number,
  hsla: (a: number) => string,
) {
  ctx.save();
  const meterW = 22;
  const meterGap = 10;
  const meterTop = 18;
  const meterBottom = waveH - 8;
  const meterH = meterBottom - meterTop;

  // LUFS meter
  const lufsX = waveW + 12;
  ctx.fillStyle = hsla(0.06);
  ctx.beginPath();
  ctx.roundRect(lufsX, meterTop, meterW, meterH, 4);
  ctx.fill();

  const lufsNorm = (clampedLufs + 60) / 60;
  const lufsFillH = lufsNorm * meterH;
  if (lufsFillH > 0) {
    const grad = ctx.createLinearGradient(0, meterBottom, 0, meterTop);
    grad.addColorStop(0, 'hsla(120, 70%, 45%, 0.8)');
    grad.addColorStop(0.5, 'hsla(50, 90%, 50%, 0.8)');
    grad.addColorStop(0.85, 'hsla(20, 90%, 50%, 0.8)');
    grad.addColorStop(1, 'hsla(0, 80%, 50%, 0.9)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(lufsX, meterBottom - lufsFillH, meterW, lufsFillH, 4);
    ctx.fill();
  }

  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = hsla(0.65);
  ctx.fillText(`${Math.round(clampedLufs)}`, lufsX + meterW / 2, meterBottom + 18);
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = hsla(0.4);
  ctx.fillText('LUFS', lufsX + meterW / 2, meterTop - 5);

  // dB meter
  const dbX = lufsX + meterW + meterGap;
  ctx.fillStyle = hsla(0.06);
  ctx.beginPath();
  ctx.roundRect(dbX, meterTop, meterW, meterH, 4);
  ctx.fill();

  const dbNorm = (clampedDb + 60) / 60;
  const dbFillH = dbNorm * meterH;
  if (dbFillH > 0) {
    const grad2 = ctx.createLinearGradient(0, meterBottom, 0, meterTop);
    grad2.addColorStop(0, 'hsla(200, 70%, 45%, 0.8)');
    grad2.addColorStop(0.5, 'hsla(170, 80%, 50%, 0.8)');
    grad2.addColorStop(0.85, 'hsla(30, 90%, 50%, 0.8)');
    grad2.addColorStop(1, 'hsla(0, 80%, 50%, 0.9)');
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.roundRect(dbX, meterBottom - dbFillH, meterW, dbFillH, 4);
    ctx.fill();
  }

  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = hsla(0.65);
  ctx.fillText(`${Math.round(clampedDb)}`, dbX + meterW / 2, meterBottom + 18);
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = hsla(0.4);
  ctx.fillText('dBFS', dbX + meterW / 2, meterTop - 5);

  // Tick marks
  const tickLabels = [0, -6, -14, -24, -40, -60];
  ctx.textAlign = 'left';
  for (const lv of tickLabels) {
    const norm = (lv + 60) / 60;
    const ly = meterBottom - norm * meterH;
    ctx.strokeStyle = hsla(0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dbX + meterW + 2, ly);
    ctx.lineTo(dbX + meterW + 6, ly);
    ctx.stroke();
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = hsla(0.45);
    ctx.fillText(`${lv}`, dbX + meterW + 8, ly + 4);
  }

  ctx.restore();
}

// ── Shared: Key indicator ──
function drawKeyIndicator(
  ctx: CanvasRenderingContext2D,
  detectedKey: string,
  detectedMode: string,
  detectedConf: number,
  detectedCamelot: string,
  keyDrift: number,
  driftMessage: string,
  keyDisplayAlpha: number,
  waveW: number,
  hsla: (a: number) => string,
) {
  ctx.save();
  ctx.globalAlpha = keyDisplayAlpha;

  const boxW = driftMessage ? Math.max(130, ctx.measureText(driftMessage).width + 24) : 90;
  const boxH = driftMessage ? 48 : 36;
  const kx = waveW - boxW - 8;
  const ky = 8;

  ctx.fillStyle = keyDrift >= 3
    ? `hsla(0, 70%, 15%, 0.85)`
    : keyDrift >= 1
      ? `hsla(40, 70%, 15%, 0.85)`
      : `hsla(0, 0%, 8%, 0.85)`;
  ctx.beginPath();
  ctx.roundRect(kx, ky, boxW, boxH, 6);
  ctx.fill();

  ctx.strokeStyle = keyDrift >= 3
    ? `hsla(0, 80%, 50%, 0.6)`
    : keyDrift >= 1
      ? `hsla(40, 80%, 50%, 0.4)`
      : hsla(0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(kx, ky, boxW, boxH, 6);
  ctx.stroke();

  ctx.font = '7px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = hsla(0.35);
  ctx.fillText('KEY', kx + 6, ky + 11);

  ctx.textAlign = 'right';
  ctx.font = '8px monospace';
  ctx.fillStyle = hsla(0.3);
  ctx.fillText(detectedCamelot, kx + boxW - 6, ky + 11);

  ctx.textAlign = 'left';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = keyDrift >= 3
    ? 'hsla(0, 80%, 60%, 1)'
    : keyDrift >= 1
      ? 'hsla(40, 80%, 60%, 1)'
      : hsla(0.85);
  ctx.fillText(`${detectedKey} ${detectedMode === 'Minor' ? 'm' : 'M'}`, kx + 6, ky + 28);

  const confBarX = kx + 60;
  const confBarY = ky + 20;
  const confBarW = boxW - 68;
  const confBarH = 4;
  ctx.fillStyle = hsla(0.1);
  ctx.beginPath();
  ctx.roundRect(confBarX, confBarY, confBarW, confBarH, 2);
  ctx.fill();
  const confFill = (detectedConf / 100) * confBarW;
  ctx.fillStyle = keyDrift >= 3
    ? 'hsla(0, 70%, 50%, 0.7)'
    : hsla(0.4);
  ctx.beginPath();
  ctx.roundRect(confBarX, confBarY, confFill, confBarH, 2);
  ctx.fill();

  ctx.font = '7px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = hsla(0.3);
  ctx.fillText(`${detectedConf}%`, kx + boxW - 6, ky + 28);

  if (driftMessage) {
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = keyDrift >= 3
      ? 'hsla(0, 80%, 65%, 0.9)'
      : 'hsla(40, 80%, 60%, 0.8)';
    ctx.fillText(driftMessage, kx + 6, ky + 43);
  }

  ctx.restore();
}
