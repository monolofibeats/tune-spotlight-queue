import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Clock, Eye, ExternalLink, Share2, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import upstarLogo from '@/assets/upstar-logo.png';

interface Clip {
  id: string;
  recording_id: string;
  title: string;
  start_time_seconds: number;
  end_time_seconds: number;
  clip_url: string | null;
  view_count: number;
  created_at: string;
}

interface Recording {
  id: string;
  title: string;
  video_url: string;
  duration_seconds: number | null;
}

interface ClipViewerProps {
  clip: Clip;
  onClose: () => void;
}

export function ClipViewer({ clip, onClose }: ClipViewerProps) {
  const { t } = useLanguage();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecording = async () => {
      const { data } = await supabase
        .from('stream_recordings')
        .select('id, title, video_url, duration_seconds')
        .eq('id', clip.recording_id)
        .single();

      if (data) {
        setRecording(data);
      }
      setIsLoading(false);
    };

    fetchRecording();

    // Increment view count
    supabase
      .from('stream_clips')
      .update({ view_count: clip.view_count + 1 })
      .eq('id', clip.id);
  }, [clip]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEmbedUrl = (url: string) => {
    // YouTube with start time
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('/').pop()?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${clip.start_time_seconds}&end=${clip.end_time_seconds}`;
    }
    // Twitch with timestamp
    if (url.includes('twitch.tv')) {
      const videoId = url.split('/videos/')[1]?.split('?')[0];
      if (videoId) {
        const hours = Math.floor(clip.start_time_seconds / 3600);
        const mins = Math.floor((clip.start_time_seconds % 3600) / 60);
        const secs = clip.start_time_seconds % 60;
        return `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}&time=${hours}h${mins}m${secs}s`;
      }
    }
    return url;
  };

  const clipDuration = clip.end_time_seconds - clip.start_time_seconds;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl bg-card rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video Player */}
        <div className="aspect-video relative bg-black">
          {recording && (
            <iframe
              src={getEmbedUrl(recording.video_url)}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          )}
          
          {/* Watermark */}
          <div className="absolute bottom-4 right-4 opacity-70 pointer-events-none">
            <img src={upstarLogo} alt="Upstar" className="h-8 w-auto" />
          </div>
        </div>

        {/* Info */}
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  {t('clipViewer.title')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {formatTime(clipDuration)}
                </Badge>
              </div>
              <h2 className="text-xl font-display font-bold">{clip.title}</h2>
              {recording && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('clipViewer.from')}: {recording.title}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {clip.view_count} {t('viewer.views')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(clip.start_time_seconds)} - {formatTime(clip.end_time_seconds)}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const shareUrl = `${window.location.origin}/library?clip=${clip.id}`;
                navigator.clipboard.writeText(shareUrl);
                toast({ title: t('common.copied') });
              }}
            >
              <Share2 className="w-4 h-4 mr-1" />
              {t('viewer.share')}
            </Button>
            {recording && (
              <Button variant="outline" size="sm" asChild>
                <a href={recording.video_url} target="_blank" rel="noopener noreferrer">
                  <Film className="w-4 h-4 mr-1" />
                  {t('clipViewer.watchFull')}
                </a>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
