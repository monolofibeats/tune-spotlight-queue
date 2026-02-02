import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Send, 
  Sparkles,
  CheckCircle2,
  Clock,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MusicEmbed } from './MusicEmbed';
import { Submission } from '@/types/submission';

interface SubmissionCardProps {
  submission: Submission;
  onFeedback?: (id: string, feedback: string) => void;
}

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

const statusConfig = {
  pending: { label: 'Pending', variant: 'queue' as const, icon: Clock },
  reviewing: { label: 'Reviewing', variant: 'warning' as const, icon: Play },
  reviewed: { label: 'Reviewed', variant: 'success' as const, icon: CheckCircle2 },
};

export function SubmissionCard({ submission, onFeedback }: SubmissionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const status = statusConfig[submission.status];
  const StatusIcon = status.icon;

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    setIsSubmittingFeedback(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onFeedback?.(submission.id, feedback);
    setIsSubmittingFeedback(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div 
        className="p-4 md:p-5 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-lg ${
            submission.isPriority 
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' 
              : 'bg-secondary text-muted-foreground'
          }`}>
            #{submission.queuePosition}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">
                {submission.songTitle || 'Untitled'}
              </h3>
              {submission.isPriority && (
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
              <Badge variant={status.variant} className="flex items-center gap-1">
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {submission.artistName || 'Unknown Artist'} • Submitted by {submission.submitterName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {formatTimeAgo(submission.createdAt)}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-5 pb-5 pt-2 space-y-5 border-t border-border/50">
              {/* Music Embed */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Listen</label>
                <MusicEmbed url={submission.songUrl} platform={submission.platform} />
              </div>

              {/* Submitter Message */}
              {submission.message && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Message from {submission.submitterName}
                  </label>
                  <div className="glass rounded-xl p-4 text-sm">
                    {submission.message}
                  </div>
                </div>
              )}

              {/* Feedback Section */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Your Feedback
                </label>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Share your thoughts on this submission..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="bg-background/50 min-h-[100px] resize-none rounded-lg"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="hero"
                      onClick={handleSubmitFeedback}
                      disabled={!feedback.trim() || isSubmittingFeedback}
                    >
                      <Send className="w-4 h-4" />
                      {submission.status === 'reviewed' ? 'Update Feedback' : 'Send Feedback'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
