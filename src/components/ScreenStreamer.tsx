import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  MonitorOff, 
  Settings, 
  Loader2, 
  Users,
  Type,
  Image as ImageIcon,
  Play,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import upstarLogo from '@/assets/upstar-logo.png';

interface OverlaySettings {
  showLogo: boolean;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  bannerText: string;
  showBanner: boolean;
}

interface PeerConnection {
  viewerId: string;
  connection: RTCPeerConnection;
}

export function ScreenStreamer() {
  const { user } = useAuth();
  const { play } = useSoundEffects();
  const { t } = useLanguage();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [overlay, setOverlay] = useState<OverlaySettings>({
    showLogo: true,
    logoPosition: 'bottom-right',
    bannerText: '',
    showBanner: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerConnectionsRef = useRef<PeerConnection[]>([]);
  const roomIdRef = useRef<string>('');

  // ICE servers for WebRTC
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  const createPeerConnection = async (viewerId: string) => {
    const pc = new RTCPeerConnection(iceServers);

    // Add stream tracks to peer connection
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, streamRef.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            targetViewerId: viewerId,
            fromBroadcaster: true,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${viewerId}:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        removePeerConnection(viewerId);
      }
    };

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send offer to viewer
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'offer',
        payload: {
          offer: pc.localDescription,
          targetViewerId: viewerId,
        },
      });
    }

    peerConnectionsRef.current.push({ viewerId, connection: pc });
    return pc;
  };

  const removePeerConnection = (viewerId: string) => {
    const index = peerConnectionsRef.current.findIndex(p => p.viewerId === viewerId);
    if (index !== -1) {
      peerConnectionsRef.current[index].connection.close();
      peerConnectionsRef.current.splice(index, 1);
    }
  };

  const startStreaming = async () => {
    setIsStarting(true);

    try {
      // Request screen capture with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      streamRef.current = stream;

      // Set up the preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const playPromise = videoRef.current.play();
        if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
          (playPromise as Promise<void>).catch((e) => {
            console.warn('[ScreenStreamer] preview video.play() was blocked:', e);
          });
        }
      }

      // Create room ID
      const roomId = `room_${Date.now()}_${user?.id?.slice(0, 8) || 'admin'}`;
      roomIdRef.current = roomId;

      // Update stream config in database
      const { data: existingConfig } = await (supabase
        .from('stream_config' as any)
        .select('id')
        .eq('is_active', true)
        .maybeSingle()) as any;

      if (existingConfig) {
        await (supabase
          .from('stream_config' as any)
          .update({
            stream_type: 'screenshare',
            stream_url: roomId,
          })
          .eq('id', existingConfig.id)) as any;
      } else {
        await (supabase
          .from('stream_config' as any)
          .insert({
            stream_type: 'screenshare',
            stream_url: roomId,
            is_active: true,
          })) as any;
      }

      // Set up Supabase Realtime channel for WebRTC signaling
      const channel = supabase.channel(`screenshare:${roomId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user?.id || 'broadcaster' },
        },
      });

      // Handle viewer joining
      channel.on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
        console.log('Viewer joining:', payload.viewerId);
        await createPeerConnection(payload.viewerId);
      });

      // Handle answer from viewer
      channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
        const pc = peerConnectionsRef.current.find(p => p.viewerId === payload.viewerId);
        if (pc && payload.answer) {
          await pc.connection.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      });

      // Handle ICE candidates from viewer
      channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.fromViewer) {
          const pc = peerConnectionsRef.current.find(p => p.viewerId === payload.viewerId);
          if (pc && payload.candidate) {
            await pc.connection.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        }
      });

      // Track viewers with presence
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length - 1; // Exclude broadcaster
        setViewerCount(Math.max(0, count));
      });

      await channel.subscribe();
      await channel.track({ role: 'broadcaster', oderId: user?.id });

      channelRef.current = channel;

      // Handle stream end (user clicks "Stop sharing" in browser)
      stream.getVideoTracks()[0].onended = () => {
        stopStreaming();
      };

      setIsStreaming(true);
      play('success');
      toast({
        title: t('toast.streamStarted'),
        description: t('toast.streamLive'),
      });

    } catch (error: any) {
      console.error('Error starting stream:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('screenshare.noActive'),
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const stopStreaming = async () => {
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.connection.close());
    peerConnectionsRef.current = [];

    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Leave the channel
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Update database
    try {
      await (supabase
        .from('stream_config' as any)
        .update({
          stream_type: 'none',
          stream_url: null,
        })
        .eq('is_active', true)) as any;
    } catch (e) {
      console.error('Error updating config:', e);
    }

    setIsStreaming(false);
    setViewerCount(0);

    toast({
      title: t('toast.streamEnded'),
      description: t('toast.streamStopped'),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isStreaming ? 'bg-red-500/20' : 'bg-primary/20'}`}>
            {isStreaming ? (
              <Monitor className="w-6 h-6 text-red-500 animate-pulse" />
            ) : (
              <Monitor className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold">{t('screenshare.title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('screenshare.subtitle')}
            </p>
          </div>
        </div>

        {isStreaming && (
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <Users className="w-3 h-3" />
              {viewerCount} {t('screenshare.watching')}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="hover:scale-110 active:scale-95 transition-transform"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Preview / Controls */}
      <div className="relative aspect-video bg-black/50 rounded-xl overflow-hidden">
        {isStreaming ? (
          <>
            <video
              ref={videoRef}
              muted
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
            
            {/* Live Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 text-white text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </div>

            {/* Logo Overlay Preview */}
            {overlay.showLogo && (
              <div className={`absolute ${
                overlay.logoPosition === 'top-left' ? 'top-4 left-4' :
                overlay.logoPosition === 'top-right' ? 'top-4 right-4' :
                overlay.logoPosition === 'bottom-left' ? 'bottom-4 left-4' :
                'bottom-4 right-4'
              }`}>
                <img src={upstarLogo} alt="" className="h-12 w-auto opacity-80" />
              </div>
            )}

            {/* Banner Preview */}
            {overlay.showBanner && overlay.bannerText && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-2 text-center text-white font-semibold">
                {overlay.bannerText}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <MonitorOff className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground">{t('screenshare.noActive')}</p>
          </div>
        )}
      </div>

      {/* Overlay Settings */}
      <AnimatePresence>
        {showSettings && isStreaming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 p-4 rounded-xl bg-muted/30"
          >
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t('screenshare.overlaySettings')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Logo Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {t('screenshare.showLogo')}
                  </Label>
                  <Switch
                    checked={overlay.showLogo}
                    onCheckedChange={(checked) => setOverlay(o => ({ ...o, showLogo: checked }))}
                  />
                </div>
                
                {overlay.showLogo && (
                  <div className="grid grid-cols-2 gap-2">
                    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                      <Button
                        key={pos}
                        variant={overlay.logoPosition === pos ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setOverlay(o => ({ ...o, logoPosition: pos }))}
                        className="text-xs capitalize hover:scale-105 active:scale-95 transition-transform"
                      >
                        {pos.replace('-', ' ')}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Banner Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    {t('screenshare.showBanner')}
                  </Label>
                  <Switch
                    checked={overlay.showBanner}
                    onCheckedChange={(checked) => setOverlay(o => ({ ...o, showBanner: checked }))}
                  />
                </div>
                
                {overlay.showBanner && (
                  <Input
                    placeholder={t('screenshare.bannerPlaceholder')}
                    value={overlay.bannerText}
                    onChange={(e) => setOverlay(o => ({ ...o, bannerText: e.target.value }))}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isStreaming ? (
          <Button
            variant="destructive"
            className="flex-1 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            onClick={stopStreaming}
          >
            <Square className="w-4 h-4 mr-2" />
            {t('screenshare.stop')}
          </Button>
        ) : (
          <Button
            className="flex-1 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            onClick={startStreaming}
            disabled={isStarting}
          >
            {isStarting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isStarting ? t('screenshare.starting') : t('screenshare.start')}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {t('screenshare.browserPrompt')}
      </p>
    </motion.div>
  );
}
