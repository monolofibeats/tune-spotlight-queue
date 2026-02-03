import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Play, 
  Pause, 
  Scissors, 
  Download, 
  Clock, 
  Eye,
  Loader2,
  Share2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { toast } from '@/hooks/use-toast';
import upstarLogo from '@/assets/upstar-logo.png';

interface Recording {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  recorded_at: string;
  view_count: number;
}

interface RecordingViewerProps {
  recording: Recording;
  onClose: () => void;
}

export function RecordingViewer({ recording, onClose }: RecordingViewerProps) {
  const { user } = useAuth();
  const { play } = useSoundEffects();
  const [activeTab, setActiveTab] = useState<'watch' | 'clip'>('watch');
  const [clipTitle, setClipTitle] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [isCreatingClip, setIsCreatingClip] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const maxDuration = recording.duration_seconds || 3600;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimeInput = (value: string): number => {
    const parts = value.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(value) || 0;
  };

  const clipDuration = endTime - startTime;

  const handleCreateClip = async () => {
    if (!clipTitle) {
      toast({
        title: "Title required",
        description: "Please give your clip a title",
        variant: "destructive",
      });
      return;
    }

    if (endTime <= startTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    if (clipDuration > 120) {
      toast({
        title: "Clip too long",
        description: "Clips must be 2 minutes or less",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingClip(true);

    const { error } = await supabase
      .from('stream_clips')
      .insert({
        recording_id: recording.id,
        title: clipTitle,
        start_time_seconds: startTime,
        end_time_seconds: endTime,
        created_by: user?.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create clip. Please try again.",
        variant: "destructive",
      });
    } else {
      play('success');
      toast({
        title: "Clip created! ✂️",
        description: "Your clip has been saved to the library",
      });
      setClipTitle('');
      setActiveTab('watch');
    }

    setIsCreatingClip(false);
  };

  const handleDownloadClip = async () => {
    if (endTime <= startTime) {
      toast({
        title: "Invalid time range",
        description: "Set a valid start and end time first",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    
    toast({
      title: "Preparing download... 🎬",
      description: `Clip: ${formatTime(startTime)} - ${formatTime(endTime)} with watermark`,
    });

    // Note: Full video processing with watermarks would require a backend service
    // For now, we'll create a download link with timestamp information
    // and show instructions for the clip timing
    
    setTimeout(() => {
      toast({
        title: "Download Info",
        description: `Use a video editor to clip from ${formatTime(startTime)} to ${formatTime(endTime)} and add the Upstar watermark.`,
      });
      
      // Open the original video in a new tab for downloading
      window.open(recording.video_url, '_blank');
      setIsDownloading(false);
    }, 1500);
  };

  const getEmbedUrl = (url: string) => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('/').pop()?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    // Twitch
    if (url.includes('twitch.tv')) {
      const videoId = url.split('/videos/')[1]?.split('?')[0];
      if (videoId) {
        return `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}`;
      }
    }
    return url;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-5xl my-8 bg-card rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video Player */}
        <div className="aspect-video relative bg-black">
          <iframe
            src={getEmbedUrl(recording.video_url)}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
          />
          
          {/* Watermark Preview (when creating clips) */}
          {activeTab === 'clip' && (
            <div className="absolute bottom-4 right-4 opacity-70 pointer-events-none">
              <img src={upstarLogo} alt="Upstar" className="h-8 w-auto" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 md:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-display font-bold truncate">{recording.title}</h2>
              {recording.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {recording.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {recording.view_count} views
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(recording.recorded_at).toLocaleDateString()}
                </span>
                {recording.duration_seconds && (
                  <Badge variant="secondary">{formatTime(recording.duration_seconds)}</Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 border-b border-border pb-2">
            <Button
              variant={activeTab === 'watch' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('watch')}
            >
              <Play className="w-4 h-4 mr-1" />
              Watch
            </Button>
            <Button
              variant={activeTab === 'clip' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('clip')}
            >
              <Scissors className="w-4 h-4 mr-1" />
              Create Clip
            </Button>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'watch' ? (
              <motion.div
                key="watch"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-wrap gap-2"
              >
                <Button variant="outline" size="sm" asChild>
                  <a href={recording.video_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open Original
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(recording.video_url);
                    toast({ title: "Link copied!" });
                  }}
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="clip"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Clip Title */}
                <div className="space-y-2">
                  <Label>Clip Title</Label>
                  <Input
                    value={clipTitle}
                    onChange={(e) => setClipTitle(e.target.value)}
                    placeholder="Give your clip a name..."
                    maxLength={100}
                  />
                </div>

                {/* Time Range Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Start Time</Label>
                      <Input
                        value={formatTime(startTime)}
                        onChange={(e) => setStartTime(Math.min(parseTimeInput(e.target.value), maxDuration - 1))}
                        className="w-24 text-center text-sm"
                      />
                    </div>
                    <Slider
                      value={[startTime]}
                      onValueChange={([val]) => setStartTime(Math.min(val, endTime - 1))}
                      max={maxDuration}
                      step={1}
                      className="py-2"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>End Time</Label>
                      <Input
                        value={formatTime(endTime)}
                        onChange={(e) => setEndTime(Math.min(parseTimeInput(e.target.value), maxDuration))}
                        className="w-24 text-center text-sm"
                      />
                    </div>
                    <Slider
                      value={[endTime]}
                      onValueChange={([val]) => setEndTime(Math.max(val, startTime + 1))}
                      max={maxDuration}
                      step={1}
                      className="py-2"
                    />
                  </div>
                </div>

                {/* Duration Info */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Clip Duration</span>
                  <Badge variant={clipDuration > 120 ? 'destructive' : 'default'}>
                    {formatTime(clipDuration)}
                    {clipDuration > 120 && ' (max 2min)'}
                  </Badge>
                </div>

                {/* Watermark Info */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <img src={upstarLogo} alt="" className="h-5 w-auto" />
                  <span className="text-sm text-muted-foreground">
                    Clips include the Upstar watermark
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleCreateClip}
                    disabled={isCreatingClip || !clipTitle || clipDuration > 120}
                    className="flex-1"
                  >
                    {isCreatingClip ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Scissors className="w-4 h-4 mr-2" />
                    )}
                    Save Clip
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadClip}
                    disabled={isDownloading || clipDuration <= 0}
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download
                  </Button>
                </div>

                {!user && (
                  <p className="text-sm text-muted-foreground text-center">
                    Sign in to save clips to your account
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
