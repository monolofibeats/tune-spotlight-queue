import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, FileAudio, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AudioPlayer } from '@/components/AudioPlayer';
import upstarStar from '@/assets/upstar-star.png';

interface FloatingAudioPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  submission: {
    id: string;
    song_title: string;
    artist_name: string;
    is_priority: boolean;
    position?: number;
  } | null;
  audioUrl: string | null;
  isLoadingAudio: boolean;
  onDownload?: () => void;
}

export function FloatingAudioPreview({
  isOpen,
  onClose,
  submission,
  audioUrl,
  isLoadingAudio,
  onDownload,
}: FloatingAudioPreviewProps) {
  if (!submission) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Floating Preview Panel */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-2xl"
          >
            <div className="glass-strong rounded-2xl border border-primary/30 overflow-hidden shadow-2xl shadow-primary/10">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border/30 flex items-center gap-4">
              {/* Position badge with star overlay */}
              <div className="relative shrink-0">
                <div 
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${
                    submission.is_priority 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {submission.position || '—'}
                </div>
                {submission.position === 1 && (
                  <img 
                    src={upstarStar} 
                    alt="Top Spot" 
                    className="absolute -top-2 -right-2 w-7 h-7 object-contain drop-shadow-lg"
                  />
                )}
              </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-display font-bold truncate">
                      {submission.song_title}
                    </h3>
                    {submission.is_priority && (
                      <Badge variant="premium" className="shrink-0">
                        Priority
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate">
                    {submission.artist_name}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Audio Player */}
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <FileAudio className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Now Playing</span>
                  {onDownload && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      onClick={onDownload}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
                
                <AudioPlayer 
                  src={audioUrl} 
                  isLoading={isLoadingAudio}
                />
              </div>

              {/* Visual equalizer bars effect */}
              <div className="h-1 bg-gradient-to-r from-primary via-primary/50 to-primary animate-pulse" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
