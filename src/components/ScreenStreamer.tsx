import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  MonitorOff, 
  Settings, 
  Loader2, 
  Users,
  Type,
  Image as ImageIcon,
  X,
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
import { toast } from '@/hooks/use-toast';
import upstarLogo from '@/assets/upstar-logo.png';

interface OverlaySettings {
  showLogo: boolean;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  bannerText: string;
  showBanner: boolean;
}

export function ScreenStreamer() {
  const { user } = useAuth();
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

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
        videoRef.current.play();
      }

      // Create room on the server
      const roomId = `room_${Date.now()}_${user?.id?.slice(0, 8)}`;
      
      const { error } = await supabase.functions.invoke('stream-signal', {
        body: { action: 'create-room', roomId },
      });

      if (error) throw error;

      // Set up Supabase Realtime channel for broadcasting
      const channel = supabase.channel(`screenshare:${roomId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user?.id || 'admin' },
        },
      });

      // Track viewers
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length - 1; // Exclude self
        setViewerCount(Math.max(0, count));
      });

      await channel.subscribe();
      await channel.track({ role: 'broadcaster' });

      broadcastChannelRef.current = channel;

      // Start canvas compositing for overlay
      startCanvasCompositing();

      // Handle stream end (user clicks "Stop sharing")
      stream.getVideoTracks()[0].onended = () => {
        stopStreaming();
      };

      setIsStreaming(true);
      toast({
        title: "Screen share started! 📺",
        description: "Your screen is now visible on the homepage",
      });

    } catch (error: any) {
      console.error('Error starting stream:', error);
      toast({
        title: "Failed to start",
        description: error.message || "Could not access screen",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const stopStreaming = async () => {
    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Leave the channel
    if (broadcastChannelRef.current) {
      await broadcastChannelRef.current.unsubscribe();
      broadcastChannelRef.current = null;
    }

    // Close room on server
    try {
      await supabase.functions.invoke('stream-signal', {
        body: { action: 'close-room' },
      });
    } catch (e) {
      console.error('Error closing room:', e);
    }

    setIsStreaming(false);
    setViewerCount(0);

    toast({
      title: "Stream ended",
      description: "Screen share has stopped",
    });
  };

  const startCanvasCompositing = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const logoImg = new Image();
    logoImg.src = upstarLogo;

    const render = () => {
      if (!streamRef.current) return;

      // Match canvas size to video
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw logo overlay
      if (overlay.showLogo && logoImg.complete) {
        const logoSize = 80;
        let x = 20;
        let y = 20;

        switch (overlay.logoPosition) {
          case 'top-right':
            x = canvas.width - logoSize - 20;
            break;
          case 'bottom-left':
            y = canvas.height - logoSize - 20;
            break;
          case 'bottom-right':
            x = canvas.width - logoSize - 20;
            y = canvas.height - logoSize - 20;
            break;
        }

        ctx.globalAlpha = 0.8;
        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
        ctx.globalAlpha = 1;
      }

      // Draw banner text
      if (overlay.showBanner && overlay.bannerText) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(overlay.bannerText, canvas.width / 2, canvas.height - 25);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  }, [overlay]);

  // Update compositing when overlay changes
  useEffect(() => {
    if (isStreaming) {
      startCanvasCompositing();
    }
  }, [overlay, isStreaming, startCanvasCompositing]);

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
            <h2 className="text-xl font-display font-semibold">Screen Share Stream</h2>
            <p className="text-sm text-muted-foreground">
              Share your screen directly to viewers
            </p>
          </div>
        </div>

        {isStreaming && (
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <Users className="w-3 h-3" />
              {viewerCount} watching
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
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
              playsInline
              className="w-full h-full object-contain"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none hidden"
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
            <p className="text-muted-foreground">No active screen share</p>
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
              Overlay Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Logo Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Show Logo
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
                        className="text-xs capitalize"
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
                    Show Banner
                  </Label>
                  <Switch
                    checked={overlay.showBanner}
                    onCheckedChange={(checked) => setOverlay(o => ({ ...o, showBanner: checked }))}
                  />
                </div>
                
                {overlay.showBanner && (
                  <Input
                    placeholder="Enter banner text..."
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
            className="flex-1"
            onClick={stopStreaming}
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Streaming
          </Button>
        ) : (
          <Button
            className="flex-1"
            onClick={startStreaming}
            disabled={isStarting}
          >
            {isStarting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isStarting ? 'Starting...' : 'Start Screen Share'}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Your browser will ask which screen, window, or tab to share.
        Viewers will see it live on the homepage.
      </p>
    </motion.div>
  );
}
