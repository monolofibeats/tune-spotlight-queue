import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MusicEmbedProps {
  url: string;
  platform: 'spotify' | 'apple-music' | 'soundcloud' | 'youtube' | 'other';
}

const extractSpotifyId = (url: string): string | null => {
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

const extractAppleMusicId = (url: string): string | null => {
  const match = url.match(/\/(\d+)\??/);
  return match ? match[1] : null;
};

export function MusicEmbed({ url, platform }: MusicEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const renderEmbed = () => {
    switch (platform) {
      case 'spotify': {
        const trackId = extractSpotifyId(url);
        if (!trackId) return null;
        return (
          <iframe
            src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            className="rounded-xl"
          />
        );
      }
      case 'apple-music': {
        const songId = extractAppleMusicId(url);
        return (
          <iframe
            allow="autoplay *; encrypted-media *; fullscreen *"
            frameBorder="0"
            height="175"
            style={{ width: '100%', maxWidth: '660px', overflow: 'hidden', borderRadius: '10px' }}
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
            src={`https://embed.music.apple.com/us/album/${songId}`}
            onLoad={() => setIsLoaded(true)}
          />
        );
      }
      case 'soundcloud': {
        return (
          <iframe
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%2306b6d4&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
            onLoad={() => setIsLoaded(true)}
            className="rounded-xl"
          />
        );
      }
      default:
        return (
          <div className="flex flex-col items-center justify-center h-32 glass rounded-xl">
            <Music className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Direct embed not available</p>
            <Button variant="ghost" size="sm" className="mt-2" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Link
              </a>
            </Button>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {!isLoaded && platform !== 'other' && (
        <div className="flex items-center justify-center h-32 glass rounded-xl animate-pulse">
          <Play className="w-8 h-8 text-primary animate-pulse" />
        </div>
      )}
      <div className={!isLoaded && platform !== 'other' ? 'hidden' : ''}>
        {renderEmbed()}
      </div>
    </motion.div>
  );
}
