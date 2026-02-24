import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, Zap, Clock, CheckCircle2, SkipForward, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpotBiddingDialog } from './SpotBiddingDialog';
import { TrackedSubmission } from '@/hooks/useTrackedSubmission';

interface SubmissionTrackerProps {
  submissions: TrackedSubmission[];
  onDismiss?: (trackedAt: number) => void;
}

const doneConfig = {
  reviewed: {
    label: 'Reviewed',
    icon: CheckCircle2,
    className: 'text-green-500',
    badgeVariant: 'default' as const,
    badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  skipped: {
    label: 'Skipped',
    icon: SkipForward,
    className: 'text-yellow-500',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  deleted: {
    label: 'Removed',
    icon: Trash2,
    className: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

export function SubmissionTracker({ submissions, onDismiss }: SubmissionTrackerProps) {
  const [biddingSub, setBiddingSub] = useState<TrackedSubmission | null>(null);

  // Only show active (pending) submissions — reviewed/skipped/deleted ones are hidden
  const activeSubmissions = submissions.filter(sub => !sub.doneStatus);

  if (activeSubmissions.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Active Submissions
          </p>
        </div>

        <AnimatePresence mode="popLayout">
            return (
              <motion.div
                key={sub.trackedAt}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-border/50 bg-card/50 p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                  <Music2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {sub.songTitle}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    by {sub.artistName}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    In Queue
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBiddingSub(sub)}
                    className="text-xs gap-1 h-7 px-2"
                  >
                    <Zap className="w-3 h-3" />
                    Skip
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bidding Dialog */}
      {biddingSub && (
        <SpotBiddingDialog
          open={!!biddingSub}
          onOpenChange={(open) => { if (!open) setBiddingSub(null); }}
          songUrl={biddingSub.songUrl}
          artistName={biddingSub.artistName}
          songTitle={biddingSub.songTitle}
          email=""
          platform={biddingSub.platform}
          audioFileUrl={biddingSub.audioFileUrl}
          streamerId={biddingSub.streamerId}
          streamerSlug={biddingSub.streamerSlug}
        />
      )}
    </>
  );
}
