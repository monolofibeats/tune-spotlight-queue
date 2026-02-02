import { motion } from 'framer-motion';
import { Clock, Sparkles, Music } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Submission } from '@/types/submission';

interface QueueDisplayProps {
  submissions: Submission[];
}

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export function QueueDisplay({ submissions }: QueueDisplayProps) {
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Live Queue
        </h3>
        <Badge variant="queue">{pendingSubmissions.length} pending</Badge>
      </div>

      <div className="space-y-3">
        {pendingSubmissions.slice(0, 5).map((submission, index) => (
          <motion.div
            key={submission.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass rounded-xl p-4 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold ${
              submission.isPriority 
                ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' 
                : 'bg-secondary text-muted-foreground'
            }`}>
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {submission.songTitle || 'Untitled'}
                </p>
                {submission.isPriority && (
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
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

        {pendingSubmissions.length === 0 && (
          <div className="glass rounded-xl p-8 text-center">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No songs in queue</p>
            <p className="text-sm text-muted-foreground/60">Be the first to submit!</p>
          </div>
        )}
      </div>
    </div>
  );
}
