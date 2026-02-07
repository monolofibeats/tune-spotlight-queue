import { motion } from 'framer-motion';
import { Sparkles, ExternalLink } from 'lucide-react';
import type { Streamer } from '@/types/streamer';

interface StreamerAnnouncementBannerProps {
  streamer: Streamer;
}

export function StreamerAnnouncementBanner({ streamer }: StreamerAnnouncementBannerProps) {
  // Check if banner should be shown
  if (!streamer.banner_enabled || !streamer.banner_text) {
    return null;
  }

  const bannerColor = streamer.banner_color || '45 90% 50%';
  const hasLink = streamer.banner_link && streamer.banner_link.trim() !== '';

  const BannerContent = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full py-2.5 px-4 text-center font-medium text-sm flex items-center justify-center gap-2"
      style={{
        backgroundColor: `hsl(${bannerColor} / 0.15)`,
        borderBottom: `1px solid hsl(${bannerColor} / 0.3)`,
        color: `hsl(${bannerColor})`,
      }}
    >
      <Sparkles className="w-4 h-4 flex-shrink-0" />
      <span>{streamer.banner_text}</span>
      {hasLink && <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />}
    </motion.div>
  );

  if (hasLink) {
    return (
      <a 
        href={streamer.banner_link} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block hover:opacity-90 transition-opacity"
      >
        <BannerContent />
      </a>
    );
  }

  return <BannerContent />;
}
