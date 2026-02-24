import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Loader2, Music, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface OutbidCounterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  songTitle: string;
  artistName: string;
  suggestedAmountCents: number;
  streamerSlug?: string;
}

export function OutbidCounterDialog({
  open,
  onOpenChange,
  submissionId,
  songTitle,
  artistName,
  suggestedAmountCents,
  streamerSlug,
}: OutbidCounterDialogProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const suggestedAmount = suggestedAmountCents / 100;

  const handleCounterBid = async () => {
    if (!user?.email) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to place a bid',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-bid', {
        body: {
          submissionId,
          bidAmount: suggestedAmount,
          email: user.email,
          streamerSlug,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to create checkout session');

      // Mark notifications as read
      await supabase
        .from('bid_notifications')
        .update({ is_read: true })
        .eq('submission_id', submissionId);

      window.location.href = data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process bid';
      toast({
        title: 'Bid failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] rounded-xl p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
            Reclaim Your Spot
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Someone outbid your submission. Place a higher bid to move back up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Song info card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/50 bg-card/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{songTitle}</p>
                <p className="text-xs text-muted-foreground truncate">{artistName}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px] border-destructive/50 text-destructive">
                Outbid
              </Badge>
            </div>
          </motion.div>

          {/* Price card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl bg-primary/5 border border-primary/20 p-5 text-center"
          >
            <p className="text-xs text-muted-foreground mb-1">Counter-bid to reclaim #1</p>
            <p className="text-3xl font-bold text-primary">€{suggestedAmount.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              This is the minimum to move above the current top bid
            </p>
          </motion.div>

          <p className="text-xs text-muted-foreground text-center">
            You'll be redirected to a secure checkout. If someone outbids you again, you'll be notified.
          </p>

          <Button
            onClick={handleCounterBid}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Pay €{suggestedAmount.toFixed(2)} to Reclaim Spot
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
