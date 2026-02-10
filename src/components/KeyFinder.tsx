import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSignedAudioUrl } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';

interface KeyFinderProps {
  /** The audio file path in storage (for direct uploads) */
  audioFilePath?: string | null;
  /** A ready-to-use audio URL (for stem results, etc.) */
  audioUrl?: string | null;
  /** Label to show which audio source is being analyzed */
  label?: string;
}

// Note names
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Krumhansl-Schmuckler key profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

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

function detectKey(chroma: number[]): { key: string; mode: 'Major' | 'Minor'; confidence: number } {
  let bestKey = 'C';
  let bestMode: 'Major' | 'Minor' = 'Major';
  let bestCorr = -Infinity;

  for (let shift = 0; shift < 12; shift++) {
    // Rotate chroma so index 0 = the candidate root
    const rotated = [...chroma.slice(shift), ...chroma.slice(0, shift)];

    const majCorr = correlate(rotated, MAJOR_PROFILE);
    if (majCorr > bestCorr) {
      bestCorr = majCorr;
      bestKey = NOTE_NAMES[shift];
      bestMode = 'Major';
    }

    const minCorr = correlate(rotated, MINOR_PROFILE);
    if (minCorr > bestCorr) {
      bestCorr = minCorr;
      bestKey = NOTE_NAMES[shift];
      bestMode = 'Minor';
    }
  }

  // Convert correlation (-1..1) to a 0-100% confidence
  const confidence = Math.round(Math.max(0, Math.min(100, (bestCorr + 1) * 50)));
  return { key: bestKey, mode: bestMode, confidence };
}

async function analyzeAudioKey(url: string): Promise<{ key: string; mode: 'Major' | 'Minor'; confidence: number }> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Mix down to mono
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // Use a reasonable FFT size
  const fftSize = 8192;
  const chroma = new Float64Array(12);
  let frameCount = 0;

  // Analyze in windows across the audio
  const hopSize = fftSize; // non-overlapping for speed
  const offlineCtx = new OfflineAudioContext(1, fftSize, sampleRate);

  // We'll manually compute a simple DFT-based chromagram
  // For each window, compute magnitude at each semitone frequency
  const totalSamples = channelData.length;
  const maxFrames = 200; // cap for performance
  const actualHop = Math.max(hopSize, Math.floor(totalSamples / maxFrames));

  for (let start = 0; start + fftSize < totalSamples && frameCount < maxFrames; start += actualHop) {
    const window = channelData.slice(start, start + fftSize);

    // Apply Hann window
    for (let i = 0; i < fftSize; i++) {
      window[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
    }

    // For each of the 12 pitch classes, sum magnitude across octaves (C1 to C7)
    for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
      let energy = 0;
      // Octaves 1-7
      for (let octave = 1; octave <= 7; octave++) {
        const noteNumber = pitchClass + 12 * octave; // MIDI-like
        const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
        if (freq >= sampleRate / 2) continue;

        // Goertzel algorithm for single frequency
        const k = Math.round(freq * fftSize / sampleRate);
        const omega = 2 * Math.PI * k / fftSize;
        const coeff = 2 * Math.cos(omega);
        let s0 = 0, s1 = 0, s2 = 0;
        for (let i = 0; i < fftSize; i++) {
          s0 = window[i] + coeff * s1 - s2;
          s2 = s1;
          s1 = s0;
        }
        const mag = Math.sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2);
        energy += mag;
      }
      chroma[pitchClass] += energy;
    }
    frameCount++;
  }

  // Normalize
  const maxChroma = Math.max(...Array.from(chroma));
  if (maxChroma > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= maxChroma;
  }

  audioContext.close();
  return detectKey(Array.from(chroma));
}

// Camelot wheel mapping for DJ compatibility
const CAMELOT_MAP: Record<string, string> = {
  'C Major': '8B', 'G Major': '9B', 'D Major': '10B', 'A Major': '11B',
  'E Major': '12B', 'B Major': '1B', 'F# Major': '2B', 'C# Major': '3B',
  'G# Major': '4B', 'D# Major': '5B', 'A# Major': '6B', 'F Major': '7B',
  'A Minor': '8A', 'E Minor': '9A', 'B Minor': '10A', 'F# Minor': '11A',
  'C# Minor': '12A', 'G# Minor': '1A', 'D# Minor': '2A', 'A# Minor': '3A',
  'F Minor': '4A', 'C Minor': '5A', 'G Minor': '6A', 'D Minor': '7A',
};

export function KeyFinder({ audioFilePath, audioUrl, label }: KeyFinderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ key: string; mode: 'Major' | 'Minor'; confidence: number } | null>(null);

  const analyze = useCallback(async () => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      let url = audioUrl || null;

      if (!url && audioFilePath) {
        url = await getSignedAudioUrl(audioFilePath);
      }

      if (!url) {
        toast({ title: 'No audio available', description: 'Could not load audio for analysis', variant: 'destructive' });
        return;
      }

      const detected = await analyzeAudioKey(url);
      setResult(detected);

      toast({
        title: `Key detected: ${detected.key} ${detected.mode}`,
        description: `Confidence: ${detected.confidence}% · Camelot: ${CAMELOT_MAP[`${detected.key} ${detected.mode}`] || '?'}`,
      });
    } catch (e) {
      console.error('Key detection failed:', e);
      toast({ title: 'Analysis failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioFilePath, audioUrl]);

  return (
    <div className="rounded-xl border border-border/30 bg-card/50 overflow-hidden">
      {/* Header */}
      <button
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-card/80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Music className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium flex-1 text-left">Key Finder</span>
        {result && (
          <Badge variant="default" className="text-[10px] font-mono">
            {result.key} {result.mode}
          </Badge>
        )}
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-4">
              {label && (
                <p className="text-xs text-muted-foreground">Analyzing: {label}</p>
              )}

              {!result ? (
                <Button
                  onClick={analyze}
                  disabled={isAnalyzing}
                  className="w-full"
                  size="sm"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Analyzing audio...
                    </>
                  ) : (
                    <>
                      <Music className="w-4 h-4 mr-2" />
                      Detect Key
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  {/* Key result display */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-center">
                      <p className="text-2xl font-display font-bold text-primary">
                        {result.key} <span className="text-lg text-foreground">{result.mode}</span>
                      </p>
                    </div>
                    <div className="flex-1" />
                    <div className="text-right space-y-1">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Camelot: {CAMELOT_MAP[`${result.key} ${result.mode}`] || '?'}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground">
                        {result.confidence}% confidence
                      </p>
                    </div>
                  </div>

                  {/* Musical context */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {result.mode === 'Minor' && (
                      <p>
                        Relative major: <span className="text-foreground font-medium">
                          {NOTE_NAMES[(NOTE_NAMES.indexOf(result.key) + 3) % 12]} Major
                        </span>
                      </p>
                    )}
                    {result.mode === 'Major' && (
                      <p>
                        Relative minor: <span className="text-foreground font-medium">
                          {NOTE_NAMES[(NOTE_NAMES.indexOf(result.key) + 9) % 12]} Minor
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Re-analyze */}
                  <Button
                    onClick={() => { setResult(null); }}
                    size="sm"
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3 h-3 mr-1.5" />
                    Re-analyze
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
