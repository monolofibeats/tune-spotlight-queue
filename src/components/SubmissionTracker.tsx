import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpotBiddingDialog } from './SpotBiddingDialog';
import { TrackedSubmission } from '@/hooks/useTrackedSubmission';
import { supabase } from '@/integrations/supabase/client';

// Organic wait estimate: seeded random 3-7 min per song, always monotonically increasing
function estimateWait(position: number, seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const rng = (i: number) => { const x = Math.sin(h + i) * 10000; return x - Math.floor(x); };
  // Accumulate: each song adds 3-7 min, guaranteeing monotonic increase
  let totalMin = 0;
  for (let i = 0; i < position; i++) totalMin += 3 + Math.floor(rng(i) * 5);
  // Nudge away from multiples of 5 to look organic
  if (totalMin % 5 === 0) totalMin += 1 + Math.floor(rng(position + 99) * 2);
  if (totalMin % 10 === 0) totalMin += 1;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `~${hours}h ${mins}min`;
  return `~${mins}min`;
}

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

  const activeSubmissions = submissions.filter(sub => !sub.doneStatus);

  useEffect(() => {
    const fetchPositions = async () => {
      const withIds = activeSubmissions.filter(s => s.submissionId && s.streamerId);
      if (withIds.length === 0) return;
      const streamerIds = [...new Set(withIds.map(s => s.streamerId!))];
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
        const streamerQueue = data.filter(q => q.streamer_id === sub.streamerId);
        const idx = streamerQueue.findIndex(q => q.id === sub.submissionId);
        if (idx !== -1) {
          newMap.set(sub.submissionId, { position: idx + 1, totalInQueue: streamerQueue.length });
        }
      }
      setQueueMap(newMap);
    };
    fetchPositions();
    const interval = setInterval(fetchPositions, 10_000);
    return () => clearInterval(interval);
  }, [activeSubmissions.map(s => s.submissionId).join(',')]);

  if (activeSubmissions.length === 0) return null;

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
            const seed = sub.submissionId || String(sub.trackedAt);

            return (
              <motion.div
                key={sub.trackedAt}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border/50 bg-card/50 p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                  <Music2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.songTitle}</p>
                  <p className="text-xs text-muted-foreground truncate">by {sub.artistName}</p>
                  {queueInfo ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Spot <span className="font-semibold text-primary">#{queueInfo.position}</span>
                      {' · '}wait {estimateWait(queueInfo.position, seed)}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-0.5 animate-pulse">
                      Calculating position…
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setBiddingSub(sub)}
                  className="shrink-0 h-8 w-8 p-0"
                  title="Skip the Line"
                >
                  <Zap className="w-4 h-4 text-primary" />
                </Button>
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
