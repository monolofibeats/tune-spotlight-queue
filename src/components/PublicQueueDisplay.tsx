import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListOrdered, Music2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { TrackedSubmission } from '@/hooks/useTrackedSubmission';
import { SpotBiddingDialog } from './SpotBiddingDialog';
import { PositionBadge } from './queue/PositionBadge';

interface QueueItem {
  id: string;
  artist_name: string;
  song_title: string;
  platform: string;
  is_priority: boolean;
  amount_paid: number;
  boost_amount: number;
  created_at: string;
}

interface PublicQueueDisplayProps {
  streamerId: string;
  streamerSlug?: string;
  trackedSubmissions?: TrackedSubmission[];
}

export function PublicQueueDisplay({ streamerId, streamerSlug, trackedSubmissions = [] }: PublicQueueDisplayProps) {
  const { t } = useLanguage();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [biddingItem, setBiddingItem] = useState<QueueItem | null>(null);

  // Build a set of tracked submission IDs for quick lookup
  const trackedIds = new Set(
    trackedSubmissions
      .filter(s => s.submissionId && !s.doneStatus)
      .map(s => s.submissionId!)
  );

  // Also build a map from songUrl to tracked submission for matching without IDs
  const trackedByUrl = new Map(
    trackedSubmissions
      .filter(s => !s.doneStatus && s.songUrl)
      .map(s => [s.songUrl, s])
  );

  useEffect(() => {
    const fetchQueue = async () => {
      const { data, error } = await supabase
        .from('public_submissions_queue')
        .select('*')
        .eq('streamer_id', streamerId)
        .eq('status', 'pending')
        .order('is_priority', { ascending: false })
        .order('boost_amount', { ascending: false })
        .order('amount_paid', { ascending: false })
        .order('created_at', { ascending: true });

      if (!error && data) {
        // Filter out submissions containing banned word "nextup"
        const banned = 'nextup';
        const filtered = (data as unknown as QueueItem[]).filter(item =>
          !(item.artist_name?.toLowerCase().includes(banned) ||
            item.song_title?.toLowerCase().includes(banned))
        );
        setQueue(filtered);
      }
      setIsLoading(false);
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 15_000);
    return () => clearInterval(interval);
  }, [streamerId]);

  if (isLoading || queue.length === 0) return null;

  const findTrackedForItem = (item: QueueItem): TrackedSubmission | null => {
    // Match by submission ID first
    const byId = trackedSubmissions.find(
      s => s.submissionId === item.id && !s.doneStatus
    );
    if (byId) return byId;

    // Fallback: match by artist+title+streamer
    const byMeta = trackedSubmissions.find(
      s =>
        !s.doneStatus &&
        s.artistName === item.artist_name &&
        s.songTitle === item.song_title &&
        s.streamerSlug === (streamerSlug || null)
    );
    return byMeta || null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <ListOrdered className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Waiting List</h3>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
        </Badge>
      </div>

      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {queue.map((item, index) => {
            const position = index + 1;
            const isOwn = trackedIds.has(item.id) || !!findTrackedForItem(item);
            const tracked = findTrackedForItem(item);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
                  isOwn
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/40 bg-card/30'
                }`}
              >
                {/* Position badge */}
                <PositionBadge
                  position={position}
                  badgeClassName="w-8 h-8 text-xs"
                  showGlow={position === 1}
                />

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.song_title || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.artist_name || 'Unknown Artist'}
                  </p>
                </div>

                {/* Priority indicator or Skip button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.is_priority && (
                    <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30 border">
                      <Zap className="w-2.5 h-2.5 mr-0.5" />
                      Priority
                    </Badge>
                  )}

                  {!item.is_priority && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBiddingItem(item)}
                      className="text-xs gap-1 h-7 px-2.5 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Zap className="w-3 h-3" />
                      Skip
                    </Button>
                  )}

                  {isOwn && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      You
                    </Badge>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bidding Dialog */}
      {biddingItem && (
        <SpotBiddingDialog
          open={!!biddingItem}
          onOpenChange={(open) => { if (!open) setBiddingItem(null); }}
          songUrl=""
          artistName={biddingItem.artist_name}
          songTitle={biddingItem.song_title}
          email=""
          platform={biddingItem.platform}
          originalSubmissionId={biddingItem.id}
          streamerId={streamerId}
          streamerSlug={streamerSlug || ''}
        />
      )}
    </motion.div>
  );
}
