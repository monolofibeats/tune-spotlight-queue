import { useState, useRef, useEffect, forwardRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string | null;
  isLoading?: boolean;
  onEnded?: () => void;
}

// Custom audio slider with better click handling
const AudioSlider = forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center cursor-pointer",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110" />
  </SliderPrimitive.Root>
));
AudioSlider.displayName = 'AudioSlider';

export const AudioPlayer = forwardRef<HTMLDivElement, AudioPlayerProps>(
  ({ src, isLoading = false, onEnded }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleLoadedMetadata = () => setDuration(audio.duration);
      const handleEnded = () => {
        setIsPlaying(false);
        onEnded?.();
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
      };
    }, [onEnded]);

    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
      }
    }, [volume, isMuted]);

    const togglePlayback = () => {
      if (!audioRef.current || !src) return;
      
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    };

    const handleSeek = (value: number[]) => {
      if (audioRef.current && isFinite(value[0])) {
        audioRef.current.currentTime = value[0];
        setCurrentTime(value[0]);
      }
    };

    const handleVolumeChange = (value: number[]) => {
      setVolume(value[0]);
      if (value[0] > 0 && isMuted) {
        setIsMuted(false);
      }
    };

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
      <div ref={ref} className="flex flex-col gap-3 w-full p-2 rounded-lg bg-background/50">
        {src && (
          <audio ref={audioRef} src={src} preload="metadata" />
        )}
        
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

          {/* Seek slider */}
          <div 
            className="flex-1 py-2"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <AudioSlider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              disabled={!src || duration === 0}
            />
          </div>

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

          <div 
            className="w-24 py-1"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <AudioSlider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              disabled={!src}
            />
          </div>

          <span className="text-xs text-muted-foreground w-10">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';
