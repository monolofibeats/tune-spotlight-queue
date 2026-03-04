import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, Zap, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpotBiddingDialog } from './SpotBiddingDialog';
import { TrackedSubmission } from '@/hooks/useTrackedSubmission';
import { supabase } from '@/integrations/supabase/client';

const MINUTES_PER_SONG = 5;

interface QueueInfo {
  position: number;
  totalInQueue: number;
}

interface SubmissionTrackerProps {
  submissions: TrackedSubmission[];
  onDismiss?: (trackedAt: number) => void;
}

export function SubmissionTracker({ submissions, onDismiss }: SubmissionTrackerProps) {
  const [biddingSub, setBiddingSub] = useState<TrackedSubmission | null>(null);
  const [queueMap, setQueueMap] = useState<Map<string, QueueInfo>>(new Map());

  // Only show active (pending) submissions — reviewed/skipped/deleted ones are hidden
  const activeSubmissions = submissions.filter(sub => !sub.doneStatus);

  // Fetch queue positions for all active submissions
  useEffect(() => {
    const fetchPositions = async () => {
      const withIds = activeSubmissions.filter(s => s.submissionId && s.streamerId);
      if (withIds.length === 0) return;

      // Get unique streamer IDs
      const streamerIds = [...new Set(withIds.map(s => s.streamerId!))];

      // Fetch all pending submissions for these streamers, ordered by priority
      const { data } = await supabase
        .from('public_submissions_queue')
        .select('id, streamer_id, is_priority, boost_amount, amount_paid, created_at')
        .in('streamer_id', streamerIds)
        .eq('status', 'pending')
        .order('is_priority', { ascending: false })
        .order('boost_amount', { ascending: false })
        .order('amount_paid', { ascending: false })
        .order('created_at', { ascending: true });

      if (!data) return;

      const newMap = new Map<string, QueueInfo>();

      for (const sub of withIds) {
        if (!sub.submissionId) continue;
        // Filter queue for this streamer
        const streamerQueue = data.filter(q => q.streamer_id === sub.streamerId);
        const idx = streamerQueue.findIndex(q => q.id === sub.submissionId);
        if (idx !== -1) {
          newMap.set(sub.submissionId, {
            position: idx + 1,
            totalInQueue: streamerQueue.length,
          });
        }
      }

      setQueueMap(newMap);
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 10_000);
    return () => clearInterval(interval);
  }, [activeSubmissions.map(s => s.submissionId).join(',')]);

  if (activeSubmissions.length === 0) return null;

  const formatWaitTime = (position: number) => {
    const totalMinutes = position * MINUTES_PER_SONG;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `~${hours}h ${mins > 0 ? `${mins}min` : ''}`;
    }
    return `~${mins}min`;
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Active Submissions
          </p>
        </div>

        <AnimatePresence mode="popLayout">
          {activeSubmissions.map((sub, i) => {
            const queueInfo = sub.submissionId ? queueMap.get(sub.submissionId) : null;

            return (
              <motion.div
                key={sub.trackedAt}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border/50 bg-card/50 overflow-hidden"
              >
                {/* Song info row */}
                <div className="p-3 flex items-center gap-3">
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
                  {queueInfo && (
                    <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary">
                      #{queueInfo.position}
                    </Badge>
                  )}
                </div>

                {/* Queue position & wait time info */}
                <div className="px-3 pb-3">
                  <div className="rounded-lg bg-muted/40 border border-border/30 p-3 space-y-2.5">
                    {queueInfo ? (
                      <div className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-foreground leading-relaxed">
                          You are on spot <span className="font-bold text-primary">#{queueInfo.position}</span> of {queueInfo.totalInQueue}.
                          {' '}It will take approximately{' '}
                          <span className="font-bold text-primary">{formatWaitTime(queueInfo.position)}</span>
                          {' '}until your song gets reviewed.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0 animate-pulse" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Calculating your queue position…
                        </p>
                      </div>
                    )}

                    {(!queueInfo || queueInfo.position > 1) && (
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground flex-1">
                          Don't want to wait? Push your song to the top!
                        </p>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setBiddingSub(sub)}
                          className="text-xs gap-1.5 h-7 px-3 shrink-0"
                        >
                          <Zap className="w-3 h-3" />
                          Skip the Line
                        </Button>
                      </div>
                    )}
                  </div>
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
          originalSubmissionId={biddingSub.submissionId || null}
          streamerId={biddingSub.streamerId}
          streamerSlug={biddingSub.streamerSlug}
        />
      )}
    </>
  );
}
