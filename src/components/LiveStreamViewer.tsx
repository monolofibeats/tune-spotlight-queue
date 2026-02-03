import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Loader2, Users, Volume2, VolumeX, Maximize, Minimize, MessageCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { StreamChat } from './StreamChat';
import { StreamReactions } from './StreamReactions';
import { useLanguage } from '@/hooks/useLanguage';
import upstarLogo from '@/assets/upstar-logo.png';

interface LiveStreamViewerProps {
  roomId: string;
}

export function LiveStreamViewer({ roomId }: LiveStreamViewerProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const { t } = useLanguage();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const viewerIdRef = useRef<string>(`viewer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const hasRemoteVideo = useMemo(() => {
    if (!remoteStream) return false;
    return remoteStream.getVideoTracks().some((t) => t.readyState === 'live');
  }, [remoteStream]);

  // Handle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !remoteStream) return;

    if (video.srcObject !== remoteStream) {
      video.srcObject = remoteStream;
    }

    const playPromise = video.play();
    if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
      (playPromise as Promise<void>).catch((e) => {
        console.warn('[LiveStreamViewer] video.play() was blocked:', e);
      });
    }
  }, [remoteStream]);

  useEffect(() => {
    const joinRoom = async () => {
      try {
        const viewerId = viewerIdRef.current;

        const pc = new RTCPeerConnection(iceServers);
        peerConnectionRef.current = pc;

        pc.ontrack = (event) => {
          console.log('Received track:', event.track.kind);

          const incoming = event.streams?.[0];
          let stream = incoming || remoteStreamRef.current;
          if (!stream) stream = new MediaStream();
          if (!incoming) {
            const existingIds = new Set(stream.getTracks().map((t) => t.id));
            if (!existingIds.has(event.track.id)) {
              stream.addTrack(event.track);
            }
          }

          remoteStreamRef.current = stream;
          setRemoteStream(stream);

          if (event.track.kind === 'video') {
            setHasVideo(true);
          }
          setIsConnecting(false);
          setIsConnected(true);
        };

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

        const channel = supabase.channel(`screenshare:${roomId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: viewerId },
          },
        });

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

        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.fromBroadcaster && payload.targetViewerId === viewerId && payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        });

        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setViewerCount(Object.keys(state).length);
        });

        await channel.subscribe();
        await channel.track({ role: 'viewer' });

        channelRef.current = channel;

        channel.send({
          type: 'broadcast',
          event: 'viewer-join',
          payload: { viewerId },
        });

        setTimeout(() => {
          const hasAnyVideo = remoteStreamRef.current?.getVideoTracks().some((t) => t.readyState === 'live');
          if (!hasAnyVideo) {
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
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((t) => t.stop());
        remoteStreamRef.current = null;
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
            {t('stream.refresh')}
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
          <p className="text-muted-foreground">{t('stream.connecting')}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-strong rounded-2xl overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-black' : ''}`}
    >
      <div className={`flex ${isFullscreen ? 'h-full' : ''}`}>
        {/* Main Stream Area */}
        <div className={`flex-1 flex flex-col ${isFullscreen && showChat ? 'w-[calc(100%-320px)]' : 'w-full'}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-red-500/20">
                <Monitor className="w-4 h-4 text-red-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t('stream.liveScreenShare')}</h3>
                <p className="text-xs text-muted-foreground">{t('stream.adminStreaming')}</p>
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
                className="h-8 w-8"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChat(!showChat)}
                className="h-8 w-8"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-8 w-8"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Video Stream */}
          <div className={`relative bg-black ${isFullscreen ? 'flex-1' : 'aspect-video'}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain"
            />

            {/* Reactions overlay */}
            <StreamReactions roomId={roomId} />

            {/* Watermark */}
            <div className="absolute bottom-4 right-4 opacity-60">
              <img src={upstarLogo} alt="Upstar" className="h-8 w-auto" />
            </div>

            {/* Live badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 text-white text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </div>

            {(!hasVideo || !hasRemoteVideo) && isConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Reactions bar (mobile/collapsed chat) */}
          {!isFullscreen && (
            <div className="p-3 border-t border-border/50 bg-muted/20">
              <StreamReactions roomId={roomId} />
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isFullscreen ? 320 : 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`border-l border-border/50 bg-background/95 backdrop-blur-sm flex flex-col ${
                isFullscreen ? 'h-full' : 'hidden lg:flex h-[400px]'
              }`}
            >
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{t('stream.chat.title')}</span>
                </div>
                {isFullscreen && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowChat(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <StreamChat roomId={roomId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
