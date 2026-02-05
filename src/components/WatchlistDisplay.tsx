import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Music } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import upstarStar from '@/assets/upstar-star.png';

interface SubmissionItem {
  id: string;
  song_title: string;
  artist_name: string;
  is_priority: boolean;
  amount_paid: number;
  boost_amount: number;
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

// Get size class based on position (1-3 are larger, progressively smaller)
const getPositionStyles = (position: number | null) => {
  if (position === 1) {
    return {
      container: 'p-5 border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-transparent',
      positionBadge: 'w-10 h-10 text-base',
      title: 'text-base font-semibold',
      artist: 'text-sm',
    };
  }
  if (position === 2) {
    return {
      container: 'p-4 border-primary/30 bg-primary/5',
      positionBadge: 'w-8 h-8 text-sm',
      title: 'text-sm font-semibold',
      artist: 'text-xs',
    };
  }
  if (position === 3) {
    return {
      container: 'p-3.5 border-primary/20',
      positionBadge: 'w-7 h-7 text-xs',
      title: 'text-sm font-medium',
      artist: 'text-xs',
    };
  }
  // Default (position 4+ or no position)
  return {
    container: 'p-3',
    positionBadge: 'w-7 h-7 text-xs',
    title: 'text-sm font-medium',
    artist: 'text-xs',
  };
};

export const WatchlistDisplay = forwardRef<WatchlistRef, WatchlistDisplayProps>(
  ({ onlyRealtime = false }, ref) => {
    const { t } = useLanguage();
    const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
    const [localItems, setLocalItems] = useState<SubmissionItem[]>([]);

    const fetchSubmissions = async () => {
      const { data, error } = await supabase
        .from('public_submissions_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const transformed: SubmissionItem[] = data.map(item => ({
          id: item.id || '',
          song_title: item.song_title || 'Untitled',
          artist_name: item.artist_name || 'Unknown Artist',
          is_priority: item.is_priority || false,
          amount_paid: Number(item.amount_paid) || 0,
          boost_amount: Number(item.boost_amount) || 0,
          status: item.status || 'pending',
          created_at: item.created_at || new Date().toISOString(),
        }));
        setSubmissions(transformed);
        return transformed;
      }
      return [];
    };

    useEffect(() => {
      if (!onlyRealtime) {
        fetchSubmissions();
      }

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
          boost_amount: 0,
          status: 'pending',
          created_at: new Date().toISOString(),
          isNew: true,
        };
        setLocalItems(prev => [newItem, ...prev]);
        
        setTimeout(() => {
          fetchSubmissions().then(() => {
            setLocalItems(prev => prev.filter(localItem => {
              const existsInDb = submissions.some(dbItem => 
                dbItem.song_title === localItem.song_title && 
                dbItem.artist_name === localItem.artist_name
              );
              return !existsInDb;
            }));
          });
        }, 2000);
      },
      refreshList: () => {
        fetchSubmissions();
      },
    }));

    const allItems = [...localItems, ...submissions.filter(
      s => !localItems.some(l => 
        l.song_title === s.song_title && l.artist_name === s.artist_name
      )
    )];

    const sortedItems = [...allItems].sort((a, b) => {
      if (a.is_priority && !b.is_priority) return -1;
      if (!a.is_priority && b.is_priority) return 1;
      
      if (a.is_priority && b.is_priority) {
        const aTotalPaid = (a.boost_amount || 0) + (a.amount_paid || 0);
        const bTotalPaid = (b.boost_amount || 0) + (b.amount_paid || 0);
        if (aTotalPaid !== bTotalPaid) {
          return bTotalPaid - aTotalPaid;
        }
      }
      
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const topSpots = sortedItems.filter(s => s.is_priority).slice(0, 5);
    const regularItems = sortedItems.filter(s => !s.is_priority);
    const displayItems = [...topSpots, ...regularItems].slice(0, 8);

    return (
      <div className="w-full" id="watchlist-container">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            {t('queue.title')}
          </h3>
          <Badge variant="queue" className="text-xs">{sortedItems.length}</Badge>
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {displayItems.map((submission, index) => {
              const isPrioritySpot = submission.is_priority && topSpots.includes(submission);
              const spotNumber = isPrioritySpot ? topSpots.indexOf(submission) + 1 : null;
              const styles = getPositionStyles(spotNumber);
              
              return (
                <motion.div
                  key={submission.id}
                  layout
                  initial={submission.isNew ? { opacity: 0, x: -20, scale: 0.95 } : { opacity: 0 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.95 }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                    delay: submission.isNew ? 0 : index * 0.03,
                  }}
                  className={`rounded-lg flex items-center gap-3 bg-card/50 border border-border/30 transition-all duration-300 ${styles.container} ${
                    submission.isNew ? 'ring-1 ring-primary/50' : ''
                  } ${submission.is_priority ? 'border-primary/30' : ''}`}
                >
                  {/* Position badge - Star for #1 */}
                  <div 
                    className={`${styles.positionBadge} rounded-md flex items-center justify-center font-bold shrink-0 ${
                      submission.is_priority 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {spotNumber === 1 ? (
                      <img 
                        src={upstarStar} 
                        alt="Star" 
                        className="w-5 h-5 object-contain"
                      />
                    ) : (
                      spotNumber || '—'
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`truncate ${styles.title}`}>
                        {submission.song_title || 'Untitled'}
                      </p>
                      {submission.is_priority && spotNumber !== 1 && (
                        <Badge variant="premium" className="text-[10px] px-1.5 py-0">
                          Priority
                        </Badge>
                      )}
                    </div>
                    <p className={`text-muted-foreground truncate ${styles.artist}`}>
                      {submission.artist_name || 'Unknown'}
                    </p>
                  </div>

                  <span className="text-[10px] text-muted-foreground/60 shrink-0">
                    {formatTimeAgo(new Date(submission.created_at))}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {sortedItems.length === 0 && (
            <div className="rounded-lg p-6 text-center bg-card/30 border border-border/30">
              <Music className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('queue.empty')}</p>
              <p className="text-xs text-muted-foreground/60">{t('queue.beFirst')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

WatchlistDisplay.displayName = 'WatchlistDisplay';
