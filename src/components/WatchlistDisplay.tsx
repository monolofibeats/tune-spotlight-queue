import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Sparkles, Music } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Submission } from '@/types/submission';
import { forwardRef, useImperativeHandle, useState } from 'react';

interface WatchlistDisplayProps {
  submissions: Submission[];
}

export interface WatchlistRef {
  addNewItem: (item: { songTitle: string; artistName: string; submitterName: string; isPriority: boolean }) => void;
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
  ({ submissions }, ref) => {
    const [newItems, setNewItems] = useState<Array<{
      id: string;
      songTitle: string;
      artistName: string;
      submitterName: string;
      isPriority: boolean;
      createdAt: Date;
    }>>([]);

    useImperativeHandle(ref, () => ({
      addNewItem: (item) => {
        const newItem = {
          ...item,
          id: `new-${Date.now()}`,
          createdAt: new Date(),
        };
        setNewItems(prev => [newItem, ...prev]);
      },
    }));

    const pendingSubmissions = submissions.filter(s => s.status === 'pending');
    const allItems = [
      ...newItems.map(item => ({
        ...item,
        status: 'pending' as const,
        isNew: true,
      })),
      ...pendingSubmissions.map(s => ({ ...s, isNew: false })),
    ];

    // Sort: priority items first, then by creation date
    const sortedItems = [...allItems].sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
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
            {sortedItems.slice(0, 5).map((submission, index) => (
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
                  delay: submission.isNew ? 0 : index * 0.1,
                }}
                className={`glass rounded-xl p-4 flex items-center gap-4 ${
                  submission.isNew ? 'ring-2 ring-primary/50 glow-primary' : ''
                }`}
              >
                <motion.div 
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold ${
                    submission.isPriority 
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' 
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
                      {submission.songTitle || 'Untitled'}
                    </p>
                    {submission.isPriority && (
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
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
                    {submission.artistName || 'Unknown Artist'} • by {submission.submitterName}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground">
                  {formatTimeAgo(submission.createdAt)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {allItems.length === 0 && (
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
