import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Loader2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import upstarLogo from '@/assets/upstar-logo.png';

interface ScreenShareViewerProps {
  roomId: string;
}

export function ScreenShareViewer({ roomId }: ScreenShareViewerProps) {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const joinRoom = async () => {
      try {
        // Join the broadcast channel
        const channel = supabase.channel(`screenshare:${roomId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: user?.id || `viewer_${Date.now()}` },
          },
        });

        // Track presence
        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setViewerCount(Object.keys(state).length);
        });

        await channel.subscribe();
        await channel.track({ role: 'viewer' });

        channelRef.current = channel;
        setIsConnected(true);
        setIsConnecting(false);

      } catch (error) {
        console.error('Error joining room:', error);
        setIsConnecting(false);
      }
    };

    joinRoom();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [roomId, user?.id]);

  if (isConnecting) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl overflow-hidden"
      >
        <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/5 to-primary/10">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting to stream...</p>
        </div>
      </motion.div>
    );
  }

  // Note: For a full WebRTC implementation, we'd need a media server
  // This is a simplified version that shows the stream status
  // In production, you'd use a service like LiveKit, Janus, or MediaSoup
  
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
            <Monitor className="w-5 h-5 text-red-500 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold">Live Screen Share</h3>
            <p className="text-xs text-muted-foreground">Admin is sharing their screen</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Users className="w-3 h-3" />
          {viewerCount} watching
        </Badge>
      </div>

      {/* Stream View */}
      <div className="aspect-video relative bg-black flex items-center justify-center">
        {/* Placeholder - In production, this would be a video element receiving the WebRTC stream */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
            <Monitor className="w-12 h-12 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Stream Connected</p>
            <p className="text-sm text-white/60">
              The admin is currently sharing their screen
            </p>
          </div>
        </div>

        {/* Watermark */}
        <div className="absolute bottom-4 right-4 opacity-60">
          <img src={upstarLogo} alt="Upstar" className="h-10 w-auto" />
        </div>

        {/* Live badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 text-white text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      </div>

      <div className="p-4 bg-muted/20">
        <p className="text-xs text-muted-foreground text-center">
          🎬 You're watching a live screen share from the stream host
        </p>
      </div>
    </motion.div>
  );
}
