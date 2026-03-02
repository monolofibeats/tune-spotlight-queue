import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DropboxPlayerEmbedProps {
  url: string;
  compact?: boolean;
}

/* ── Generate a deterministic static waveform from a URL seed ── */
function generateWaveform(seed: string, barCount: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    hash = (hash * 16807 + 1) | 0;
    const v = ((hash & 0x7fffffff) % 100) / 100;
    // Shape: create musical-looking peaks and valleys
    const wave = 0.15 + v * 0.85;
    bars.push(wave);
  }
  return bars;
}

/* ── Static Waveform ── */
function StaticWaveform({
  bars,
  progress,
  onSeek,
  height,
}: {
  bars: number[];
  progress: number; // 0-1
  onSeek: (pct: number) => void;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const getPct = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const pct = getPct(e);
    onSeek(pct);
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const win = containerRef.current?.ownerDocument?.defaultView ?? window;
    const move = (e: MouseEvent) => onSeek(getPct(e));
    const up = () => setIsDragging(false);
    win.addEventListener('mousemove', move);
    win.addEventListener('mouseup', up);
    return () => {
      win.removeEventListener('mousemove', move);
      win.removeEventListener('mouseup', up);
    };
  }, [isDragging, getPct, onSeek]);

  const barGap = 1;
  const barWidth = 2;

  return (
    <div
      ref={containerRef}
      className="w-full cursor-pointer relative"
      style={{ height }}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => setHoverPct(getPct(e))}
      onMouseLeave={() => setHoverPct(null)}
    >
      <svg width="100%" height="100%" preserveAspectRatio="none">
        {bars.map((v, i) => {
          const totalBarWidth = barWidth + barGap;
          const x = (i / bars.length) * 100;
          const barH = v * height;
          const y = (height - barH) / 2;
          const barPct = i / bars.length;
          const isPlayed = barPct <= progress;
          const isHovered = hoverPct !== null && barPct <= hoverPct && !isPlayed;

          return (
            <rect
              key={i}
              x={`${x}%`}
              y={y}
              width={`${Math.max(0.3, 100 / bars.length - 0.15)}%`}
              height={barH}
              rx={1}
              fill={
                isPlayed
                  ? '#637282'
                  : isHovered
                  ? '#4a5568'
                  : '#3a4250'
              }
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ── Volume Fader ── */
function VolumeFader({ volume, isMuted, onChange }: { volume: number; isMuted: boolean; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getPct = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onChange(getPct(e));
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const win = trackRef.current?.ownerDocument?.defaultView ?? window;
    const move = (e: MouseEvent) => onChange(getPct(e));
    const up = () => setIsDragging(false);
    win.addEventListener('mousemove', move);
    win.addEventListener('mouseup', up);
    return () => { win.removeEventListener('mousemove', move); win.removeEventListener('mouseup', up); };
  }, [isDragging, getPct, onChange]);

  const display = isMuted ? 0 : volume;

  return (
    <div
      ref={trackRef}
      className="w-20 h-5 flex items-center cursor-pointer group relative"
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-x-0 h-1 rounded-full" style={{ backgroundColor: '#3a4250' }}>
        <div className="absolute h-full rounded-full" style={{ width: `${display * 100}%`, backgroundColor: '#637282' }} />
      </div>
      <div
        className="absolute h-2.5 w-2.5 rounded-full shadow transform -translate-x-1/2 transition-transform group-hover:scale-125"
        style={{ left: `${display * 100}%`, backgroundColor: '#c9d1d9' }}
      />
    </div>
  );
}

export function DropboxPlayerEmbed({ url, compact }: DropboxPlayerEmbedProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const waveformBars = useMemo(() => generateWaveform(url, 200), [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setIsLoading(false);
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(dur);
      if (pendingSeekRef.current !== null && dur > 0) {
        audio.currentTime = Math.max(0, Math.min(pendingSeekRef.current, dur));
        pendingSeekRef.current = null;
      }
    };
    const onDurationChange = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(dur);
    };
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      if (!url) return;
      setIsPlaying(false);
      setHasError(true);
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    setIsLoading(true);
    pendingSeekRef.current = null;
    audio.src = url;
    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [url]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const handleSeek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!Number.isFinite(audio.duration) || audio.duration === 0) {
      pendingSeekRef.current = pct * 1000; // rough estimate
      return;
    }
    const t = Math.max(0, Math.min(pct * audio.duration, audio.duration));
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const waveformHeight = compact ? 100 : 160;

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#2d3239' }}>
      <audio ref={audioRef} preload="metadata" />

      {/* Dropbox-style header */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: '#252a30', borderBottom: '1px solid #3a3f47' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FF"/>
          <path d="M18 2l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FF"/>
          <path d="M12 14l-6 4 6 4 6-4-6-4z" fill="#0061FF" opacity="0.7"/>
        </svg>
        <span className="text-xs font-medium" style={{ color: '#9aa5b4' }}>Dropbox Audio</span>
      </div>

      {hasError && (
        <div className="flex items-center gap-2 text-xs px-3 py-2" style={{ color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)' }}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Audio file could not be loaded.</span>
        </div>
      )}

      {/* Static waveform */}
      <div className="px-3 pt-3">
        <StaticWaveform
          bars={waveformBars}
          progress={progress}
          onSeek={handleSeek}
          height={waveformHeight}
        />
      </div>

      {/* Controls bar */}
      <div className="px-3 py-2 flex items-center gap-3" style={{ borderTop: '1px solid #3a3f47' }}>
        {/* Play/Pause */}
        <button
          onClick={togglePlayback}
          disabled={isLoading || hasError}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors"
          style={{ color: '#c9d1d9' }}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : hasError ? (
            <AlertCircle className="w-4 h-4" style={{ color: '#f87171' }} />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

        {/* Volume */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="shrink-0"
          style={{ color: '#8b949e' }}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        {/* Volume slider */}
        <VolumeFader
          volume={volume}
          isMuted={isMuted}
          onChange={(v) => {
            setVolume(v);
            if (v > 0 && isMuted) setIsMuted(false);
          }}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Time */}
        <span className="text-xs font-mono" style={{ color: '#8b949e' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
