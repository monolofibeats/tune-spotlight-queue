import { motion } from 'framer-motion';
import { Twitch, Youtube, Instagram, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectedPlatform } from '@/types/submission';

interface PlatformConnectionsProps {
  platforms: ConnectedPlatform[];
  onConnect?: (platform: ConnectedPlatform['name']) => void;
}

const platformIcons: Record<ConnectedPlatform['name'], React.ReactNode> = {
  twitch: <Twitch className="w-5 h-5" />,
  youtube: <Youtube className="w-5 h-5" />,
  tiktok: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  ),
  instagram: <Instagram className="w-5 h-5" />,
  kick: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
};

const platformColors: Record<ConnectedPlatform['name'], string> = {
  twitch: 'from-purple-500 to-purple-600',
  youtube: 'from-red-500 to-red-600',
  tiktok: 'from-pink-500 to-cyan-500',
  instagram: 'from-pink-500 to-orange-500',
  kick: 'from-green-500 to-green-600',
};

export function PlatformConnections({ platforms, onConnect }: PlatformConnectionsProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-lg mb-4">Connected Platforms</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {platforms.map((platform, index) => (
          <motion.div
            key={platform.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`glass rounded-xl p-4 flex items-center justify-between ${
              platform.connected ? '' : 'opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${platformColors[platform.name]}`}>
                {platformIcons[platform.name]}
              </div>
              <div>
                <p className="font-medium capitalize">{platform.name}</p>
                {platform.connected ? (
                  <p className="text-sm text-muted-foreground">{platform.username}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not connected</p>
                )}
              </div>
            </div>
            
            {platform.connected ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onConnect?.(platform.name)}
                className="hover:bg-primary/10"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
