import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Sparkles, Music, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubmissionItem {
  id: string;
  song_title: string;
  artist_name: string;
  is_priority: boolean;
  amount_paid: number;
  status: string;
  created_at: string;
  isNew?: boolean;
}

interface WatchlistDisplayProps {
  onlyRealtime?: boolean;
}

export interface WatchlistRef {
  addNewItem: (item: { songTitle: string; artistName: string; isPriority: boolean; amountPaid?: number }) => void;
  refreshList: () => void;
}

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export const WatchlistDisplay = forwardRef<WatchlistRef, WatchlistDisplayProps>(
  ({ onlyRealtime = false }, ref) => {
    const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
    const [localItems, setLocalItems] = useState<SubmissionItem[]>([]);

    const fetchSubmissions = async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('status', 'pending')
        .order('amount_paid', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSubmissions(data);
      }
    };

    useEffect(() => {
      if (!onlyRealtime) {
        fetchSubmissions();
      }

      // Subscribe to realtime changes
      const channel = supabase
        .channel('submissions_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'submissions',
          },
          () => {
            fetchSubmissions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [onlyRealtime]);

    useImperativeHandle(ref, () => ({
      addNewItem: (item) => {
        const newItem: SubmissionItem = {
          id: `local-${Date.now()}`,
          song_title: item.songTitle,
          artist_name: item.artistName,
          is_priority: item.isPriority,
          amount_paid: item.amountPaid || 0,
          status: 'pending',
          created_at: new Date().toISOString(),
          isNew: true,
        };
        setLocalItems(prev => [newItem, ...prev]);
        
        // Remove local item after a few seconds (it will come from realtime)
        setTimeout(() => {
          setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
        }, 3000);
      },
      refreshList: () => {
        fetchSubmissions();
      },
    }));

    // Combine local items with database items
    const allItems = [...localItems, ...submissions.filter(
      s => !localItems.some(l => 
        l.song_title === s.song_title && l.artist_name === s.artist_name
      )
    )];

    // Sort: priority/paid items first (by amount), then by creation date
    const sortedItems = [...allItems].sort((a, b) => {
      // First sort by amount paid (highest first)
      if (a.amount_paid !== b.amount_paid) {
        return b.amount_paid - a.amount_paid;
      }
      // Then by priority flag
      if (a.is_priority && !b.is_priority) return -1;
      if (!a.is_priority && b.is_priority) return 1;
      // Finally by date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return (
      <div className="w-full max-w-md" id="watchlist-container">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Watchlist
          </h3>
          <Badge variant="queue">{sortedItems.length} pending</Badge>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sortedItems.slice(0, 10).map((submission, index) => (
              <motion.div
                key={submission.id}
                layout
                initial={submission.isNew ? { 
                  opacity: 0, 
                  scale: 0.8,
                  x: -100,
                  y: -20,
                } : { opacity: 0, x: -20 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: 0, 
                  y: 0,
                }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ 
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                  delay: submission.isNew ? 0 : index * 0.05,
                }}
                className={`glass rounded-xl p-4 flex items-center gap-4 ${
                  submission.isNew ? 'ring-2 ring-primary/50 glow-primary' : ''
                } ${submission.amount_paid > 0 ? 'border border-primary/30' : ''}`}
              >
                <motion.div 
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold ${
                    submission.amount_paid > 0 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-muted-foreground'
                  }`}
                  initial={submission.isNew ? { rotate: -180, scale: 0 } : {}}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {index + 1}
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {submission.song_title || 'Untitled'}
                    </p>
                    {submission.amount_paid > 0 && (
                      <Badge variant="premium" className="text-xs flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {submission.amount_paid}
                      </Badge>
                    )}
                    {submission.is_priority && (
                      <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    {submission.isNew && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full"
                      >
                        New!
                      </motion.span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {submission.artist_name || 'Unknown Artist'}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground">
                  {formatTimeAgo(new Date(submission.created_at))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {sortedItems.length === 0 && (
            <div className="glass rounded-xl p-8 text-center">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No songs in watchlist</p>
              <p className="text-sm text-muted-foreground/60">Be the first to submit!</p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

WatchlistDisplay.displayName = 'WatchlistDisplay';
