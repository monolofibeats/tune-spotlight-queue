import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Loader2, Users, Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import upstarLogo from '@/assets/upstar-logo.png';

interface ScreenShareViewerProps {
  roomId: string;
}

export function ScreenShareViewer({ roomId }: ScreenShareViewerProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const viewerIdRef = useRef<string>(`viewer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    const joinRoom = async () => {
      try {
        const viewerId = viewerIdRef.current;

        // Create peer connection
        const pc = new RTCPeerConnection(iceServers);
        peerConnectionRef.current = pc;

        // Handle incoming tracks
        pc.ontrack = (event) => {
          console.log('Received track:', event.track.kind);
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            setHasVideo(true);
            setIsConnecting(false);
            setIsConnected(true);
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: {
                candidate: event.candidate,
                viewerId,
                fromViewer: true,
              },
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('Viewer connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setIsConnected(true);
            setIsConnecting(false);
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setIsConnected(false);
            setHasVideo(false);
            setError('Connection lost. The stream may have ended.');
          }
        };

        // Join the broadcast channel
        const channel = supabase.channel(`screenshare:${roomId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: viewerId },
          },
        });

        // Handle offer from broadcaster
        channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (payload.targetViewerId === viewerId && payload.offer) {
            console.log('Received offer from broadcaster');
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: {
                answer: pc.localDescription,
                viewerId,
              },
            });
          }
        });

        // Handle ICE candidates from broadcaster
        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.fromBroadcaster && payload.targetViewerId === viewerId && payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        });

        // Track presence
        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setViewerCount(Object.keys(state).length);
        });

        await channel.subscribe();
        await channel.track({ role: 'viewer' });

        channelRef.current = channel;

        // Notify broadcaster that we've joined
        channel.send({
          type: 'broadcast',
          event: 'viewer-join',
          payload: { viewerId },
        });

        // Set timeout for connection
        setTimeout(() => {
          if (!hasVideo && isConnecting) {
            setIsConnecting(false);
            setError('Could not connect to stream. Please refresh and try again.');
          }
        }, 15000);

      } catch (error) {
        console.error('Error joining room:', error);
        setIsConnecting(false);
        setError('Failed to join stream');
      }
    };

    joinRoom();

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [roomId]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl overflow-hidden"
      >
        <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-destructive/5 to-destructive/10">
          <Monitor className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center px-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </motion.div>
    );
  }

  if (isConnecting && !hasVideo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl overflow-hidden"
      >
        <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/5 to-primary/10">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting to live stream...</p>
        </div>
      </motion.div>
    );
  }

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
            <p className="text-xs text-muted-foreground">Admin is streaming live</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {viewerCount}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-8 w-8 hover:scale-110 active:scale-95 transition-transform"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Video Stream */}
      <div className="aspect-video relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="w-full h-full object-contain"
        />

        {/* Watermark */}
        <div className="absolute bottom-4 right-4 opacity-60">
          <img src={upstarLogo} alt="Upstar" className="h-10 w-auto" />
        </div>

        {/* Live badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 text-white text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          LIVE
        </div>

        {!hasVideo && isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="p-4 bg-muted/20">
        <p className="text-xs text-muted-foreground text-center">
          🎬 You're watching a live screen share • {isMuted ? 'Click the sound icon to unmute' : 'Audio enabled'}
        </p>
      </div>
    </motion.div>
  );
}
