import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, Zap, X, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpotBiddingDialog } from './SpotBiddingDialog';
import { TrackedSubmission } from '@/hooks/useTrackedSubmission';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SubmissionTrackerProps {
  submission: TrackedSubmission;
  onClear: () => void;
}

const UPSELL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function SubmissionTracker({ submission, onClear }: SubmissionTrackerProps) {
  const [showBanner, setShowBanner] = useState(true);
  const [showUpsellPopup, setShowUpsellPopup] = useState(false);
  const [showBiddingDialog, setShowBiddingDialog] = useState(false);
  const [bannerMinimized, setBannerMinimized] = useState(false);

  // Timed upsell popup
  useEffect(() => {
    const timer = setInterval(() => {
      // Only show if banner is still visible and bidding dialog is not open
      if (showBanner && !showBiddingDialog) {
        setShowUpsellPopup(true);
      }
    }, UPSELL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [showBanner, showBiddingDialog]);

  const handleSkipLine = useCallback(() => {
    setShowUpsellPopup(false);
    setShowBiddingDialog(true);
  }, []);

  const handleDismissBanner = useCallback(() => {
    setShowBanner(false);
    onClear();
  }, [onClear]);

  if (!showBanner) return null;

  return (
    <>
      {/* Floating Banner */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-40 flex justify-center pointer-events-none"
        >
          <div className="pointer-events-auto w-full max-w-lg">
            {bannerMinimized ? (
              <button
                onClick={() => setBannerMinimized(false)}
                className="w-full rounded-xl border border-border/50 bg-card/95 backdrop-blur-md shadow-lg p-3 flex items-center gap-3 hover:bg-card transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Music2 className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium truncate flex-1 text-left">
                  {submission.songTitle} — {submission.artistName}
                </span>
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              </button>
            ) : (
              <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-md shadow-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Music2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm truncate">
                        {submission.songTitle}
                      </p>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        In Queue
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      by {submission.artistName}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={handleSkipLine}
                        className="text-xs gap-1.5"
                      >
                        <Zap className="w-3 h-3" />
                        Skip the Line
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setBannerMinimized(true)}
                        className="text-xs text-muted-foreground"
                      >
                        Minimize
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={handleDismissBanner}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Timed Upsell Popup */}
      <Dialog open={showUpsellPopup} onOpenChange={setShowUpsellPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Your Song Is Still Waiting
            </DialogTitle>
            <DialogDescription>
              <strong>"{submission.songTitle}"</strong> by {submission.artistName} is
              currently in the queue. Want to get reviewed faster?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSkipLine} className="flex-1 gap-1.5">
              <Zap className="w-4 h-4" />
              Skip the Line
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowUpsellPopup(false)}
              className="flex-1"
            >
              I'll Wait
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bidding Dialog */}
      <SpotBiddingDialog
        open={showBiddingDialog}
        onOpenChange={setShowBiddingDialog}
        songUrl={submission.songUrl}
        artistName={submission.artistName}
        songTitle={submission.songTitle}
        email=""
        platform={submission.platform}
        audioFileUrl={submission.audioFileUrl}
        streamerId={submission.streamerId}
        streamerSlug={submission.streamerSlug}
      />
    </>
  );
}
