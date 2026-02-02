import { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Tv2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StreamEmbedProps {
  platform?: 'twitch' | 'kick';
  channelName?: string;
}

export function StreamEmbed({ platform = 'twitch', channelName = 'mosi391' }: StreamEmbedProps) {
  const [isLive] = useState(true); // In production, this would check actual stream status

  const getEmbedUrl = () => {
    if (platform === 'twitch') {
      return `https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname}&muted=true`;
    }
    // Kick doesn't have an official embed, so we'll link externally
    return null;
  };

  const getStreamUrl = () => {
    if (platform === 'twitch') {
      return `https://twitch.tv/${channelName}`;
    }
    return `https://kick.com/${channelName}`;
  };

  const embedUrl = getEmbedUrl();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLive ? 'bg-red-500/20' : 'bg-muted'}`}>
            {isLive ? (
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            ) : (
              <Tv2 className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">Live Stream</h3>
            <p className="text-xs text-muted-foreground">
              {isLive ? 'Now reviewing songs!' : 'Offline'}
            </p>
          </div>
        </div>
        <a href={getStreamUrl()} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Open in {platform === 'twitch' ? 'Twitch' : 'Kick'}
          </Button>
        </a>
      </div>

      {/* Embed */}
      <div className="aspect-video bg-black/50">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <Tv2 className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground">
              {platform === 'kick' ? 'Kick embeds are not available' : 'Stream unavailable'}
            </p>
            <a href={getStreamUrl()} target="_blank" rel="noopener noreferrer">
              <Button variant="hero" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Watch on {platform === 'twitch' ? 'Twitch' : 'Kick'}
              </Button>
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
