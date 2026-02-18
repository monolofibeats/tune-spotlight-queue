import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Tv2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LiveStreamViewer } from './LiveStreamViewer';

interface StreamConfig {
  id: string;
  stream_type: string;
  stream_url: string | null;
  video_url: string | null;
  is_active: boolean;
}

interface StreamEmbedProps {
  streamerId: string;
}

export function StreamEmbed({ streamerId }: StreamEmbedProps) {
  const [config, setConfig] = useState<StreamConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (streamerId) fetchConfig();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`stream_config_changes_${streamerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_config',
        },
        () => {
          fetchConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamerId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('stream_config')
        .select('*')
        .eq('streamer_id', streamerId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setConfig(data as StreamConfig | null);
    } catch (error) {
      console.error('Error fetching stream config:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractTwitchChannel = (url: string): string | null => {
    const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const extractTikTokUsername = (url: string): string | null => {
    const match = url.match(/tiktok\.com\/@([a-zA-Z0-9_.]+)/);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="aspect-video w-full glass-strong rounded-2xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config || config.stream_type === 'none') {
    return null;
  }

  // Screen share stream
  if (config.stream_type === 'screenshare' && config.stream_url) {
    return <LiveStreamViewer roomId={config.stream_url} />;
  }

  // Looping video
  if (config.stream_type === 'video' && config.video_url) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="aspect-video w-full glass-strong rounded-2xl overflow-hidden"
      >
        <video
          src={config.video_url}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </motion.div>
    );
  }

  // Twitch embed
  if (config.stream_type === 'twitch' && config.stream_url) {
    const channel = extractTwitchChannel(config.stream_url);
    if (!channel) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold">Live Stream</h3>
              <p className="text-xs text-muted-foreground">Now reviewing songs!</p>
            </div>
          </div>
          <a href={config.stream_url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Open in Twitch
            </Button>
          </a>
        </div>
        <div className="aspect-video">
          <iframe
            src={`https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&muted=true`}
            allowFullScreen
            className="w-full h-full"
            title="Twitch Stream"
          />
        </div>
      </motion.div>
    );
  }

  // YouTube embed
  if (config.stream_type === 'youtube' && config.stream_url) {
    const videoId = extractYouTubeVideoId(config.stream_url);
    if (!videoId) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold">Live Stream</h3>
              <p className="text-xs text-muted-foreground">Now reviewing songs!</p>
            </div>
          </div>
          <a href={config.stream_url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Open in YouTube
            </Button>
          </a>
        </div>
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-full h-full"
            title="YouTube Stream"
          />
        </div>
      </motion.div>
    );
  }

  // TikTok - can't embed live, so show a link
  if (config.stream_type === 'tiktok' && config.stream_url) {
    const username = extractTikTokUsername(config.stream_url);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl overflow-hidden"
      >
        <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-pink-500/10 to-cyan-500/10">
          <div className="p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-cyan-500/20">
            <Tv2 className="w-12 h-12 text-pink-400" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">TikTok Live</p>
            <p className="text-sm text-muted-foreground mb-4">
              Watch the stream on TikTok
            </p>
          </div>
          <a href={config.stream_url} target="_blank" rel="noopener noreferrer">
            <Button variant="hero" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Watch @{username || 'stream'} on TikTok
            </Button>
          </a>
        </div>
      </motion.div>
    );
  }

  return null;
}
