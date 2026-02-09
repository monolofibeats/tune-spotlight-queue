import { useState, useRef, useEffect, forwardRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string | null;
  isLoading?: boolean;
  onEnded?: () => void;
  onAudioElement?: (el: HTMLAudioElement | null) => void;
}

interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  disabled?: boolean;
}

// VLC-style clickable seek bar
function SeekBar({ currentTime, duration, onSeek, disabled }: SeekBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);

  const calculateTimeFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!trackRef.current || duration === 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    return percentage * duration;
  }, [duration]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    const time = calculateTimeFromEvent(e);
    onSeek(time);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || disabled) return;
    const time = calculateTimeFromEvent(e);
    onSeek(time);
  }, [isDragging, disabled, calculateTimeFromEvent, onSeek]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Track hover for preview
  const handleTrackHover = (e: React.MouseEvent) => {
    if (!trackRef.current || duration === 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    setHoverTime(percentage * duration);
    setHoverPosition(x);
  };

  const handleTrackLeave = () => {
    if (!isDragging) {
      setHoverTime(null);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="relative flex-1 group"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Hover time tooltip */}
      {hoverTime !== null && !disabled && (
        <div 
          className="absolute -top-8 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg z-10 pointer-events-none"
          style={{ left: hoverPosition }}
        >
          {formatTime(hoverTime)}
        </div>
      )}
      
      {/* Clickable track area */}
      <div
        ref={trackRef}
        className={cn(
          "relative h-8 flex items-center cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleTrackHover}
        onMouseLeave={handleTrackLeave}
      >
        {/* Track background */}
        <div className="absolute inset-x-0 h-2 bg-secondary rounded-full overflow-hidden">
          {/* Progress fill */}
          <div 
            className="absolute h-full bg-primary transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
          
          {/* Hover preview */}
          {hoverTime !== null && !disabled && (
            <div 
              className="absolute h-full bg-primary/30"
              style={{ width: `${(hoverTime / duration) * 100}%` }}
            />
          )}
        </div>
        
        {/* Thumb/scrubber */}
        <div 
          className={cn(
            "absolute h-4 w-4 bg-background border-2 border-primary rounded-full shadow-md transform -translate-x-1/2 transition-transform",
            "group-hover:scale-110",
            isDragging && "scale-125"
          )}
          style={{ left: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface VolumeSliderProps {
  volume: number;
  isMuted: boolean;
  onChange: (volume: number) => void;
  disabled?: boolean;
}

function VolumeSlider({ volume, isMuted, onChange, disabled }: VolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateVolumeFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return x / rect.width;
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    const vol = calculateVolumeFromEvent(e);
    onChange(vol);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || disabled) return;
    const vol = calculateVolumeFromEvent(e);
    onChange(vol);
  }, [isDragging, disabled, calculateVolumeFromEvent, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const displayVolume = isMuted ? 0 : volume;

  return (
    <div 
      className="w-24"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={trackRef}
        className={cn(
          "relative h-6 flex items-center cursor-pointer group",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Track background */}
        <div className="absolute inset-x-0 h-1.5 bg-secondary rounded-full overflow-hidden">
          {/* Volume fill */}
          <div 
            className="absolute h-full bg-primary transition-all duration-75"
            style={{ width: `${displayVolume * 100}%` }}
          />
        </div>
        
        {/* Thumb */}
        <div 
          className={cn(
            "absolute h-3 w-3 bg-background border-2 border-primary rounded-full shadow transform -translate-x-1/2 transition-transform",
            "group-hover:scale-110",
            isDragging && "scale-125"
          )}
          style={{ left: `${displayVolume * 100}%` }}
        />
      </div>
    </div>
  );
}

export const AudioPlayer = forwardRef<HTMLDivElement, AudioPlayerProps>(
  ({ src, isLoading = false, onEnded, onAudioElement }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const pendingSeekRef = useRef<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      // Expose audio element to parent (e.g. for visualizer)
      onAudioElement?.(audio);

      // Attach listeners *after* the audio element exists, and re-run when src changes.
      // Previously, the <audio> element wasn't rendered until src existed, so the effect
      // ran with audioRef.current === null and never attached listeners.
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleLoadedMetadata = () => {
        const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
        setDuration(dur);

        if (pendingSeekRef.current !== null && dur > 0) {
          const nextTime = Math.max(0, Math.min(pendingSeekRef.current, dur));
          pendingSeekRef.current = null;
          audio.currentTime = nextTime;
          setCurrentTime(nextTime);
        }
      };
      const handleDurationChange = () => {
        const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
        setDuration(dur);
      };
      const handleEnded = () => {
        setIsPlaying(false);
        onEnded?.();
      };
      const handleError = () => {
        // Keep UI stable if source fails.
        setIsPlaying(false);
        setDuration(0);
        setCurrentTime(0);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('durationchange', handleDurationChange);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      // Ensure src changes trigger a real reload and metadata fetch
      audio.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      pendingSeekRef.current = null;

      audio.src = src ?? '';
      if (src) {
        audio.load();
      }

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('durationchange', handleDurationChange);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }, [src, onEnded]);

    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
      }
    }, [volume, isMuted]);

    const togglePlayback = () => {
      if (!audioRef.current || !src) return;
      
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // e.g. NotSupportedError (bad URL / codec) or autoplay restrictions
            setIsPlaying(false);
          });
        }
        setIsPlaying(true);
      }
    };

    const handleSeek = useCallback((time: number) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(time) || !src) return;

      // If metadata isn't loaded yet, store the request and apply on loadedmetadata.
      if (!Number.isFinite(audio.duration) || audio.duration === 0) {
        pendingSeekRef.current = time;
        audio.load();
        return;
      }

      const nextTime = Math.max(0, Math.min(time, audio.duration));
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
    }, [src]);

    const handleVolumeChange = useCallback((vol: number) => {
      setVolume(vol);
      if (vol > 0 && isMuted) {
        setIsMuted(false);
      }
    }, [isMuted]);

    const toggleMute = () => {
      setIsMuted(!isMuted);
    };

    const formatTime = (time: number) => {
      if (!isFinite(time)) return '0:00';
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
      <div ref={ref} className="flex flex-col gap-3 w-full p-3 rounded-lg bg-background/50 border border-border/30">
        {/* Always render the audio element so refs + listeners work even when src arrives later */}
        <audio ref={audioRef} preload="metadata" />
        
        {/* Progress bar and time */}
        <div className="flex items-center gap-3">
          {/* Play/Pause button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayback();
            }}
            disabled={isLoading || !src}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>

          {/* Current time */}
          <span className="text-xs font-mono text-muted-foreground w-12 text-right shrink-0">
            {formatTime(currentTime)}
          </span>

          {/* VLC-style seek bar */}
          <SeekBar
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            disabled={!src || duration === 0}
          />

          {/* Duration */}
          <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            disabled={!src}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>

          <VolumeSlider
            volume={volume}
            isMuted={isMuted}
            onChange={handleVolumeChange}
            disabled={!src}
          />

          <span className="text-xs text-muted-foreground w-10">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';
