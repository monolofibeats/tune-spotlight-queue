import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Zap, Loader2, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface BidOffer {
  id: string;
  submission_id: string;
  offer_amount_cents: number;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  submission?: {
    song_title: string;
    artist_name: string;
  };
}

interface SubmissionBidPanelProps {
  submissionId: string;
  songTitle: string;
  artistName: string;
  currentPosition?: number;
}

export function SubmissionBidPanel({ 
  submissionId, 
  songTitle, 
  artistName,
  currentPosition 
}: SubmissionBidPanelProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [bidOffers, setBidOffers] = useState<BidOffer[]>([]);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [suggestedBid, setSuggestedBid] = useState<number>(5);

  useEffect(() => {
    fetchBidData();
    
    // Subscribe to bid notifications
    const channel = supabase
      .channel(`bid_notifications_${submissionId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'bid_notifications', filter: `submission_id=eq.${submissionId}` },
        (payload) => {
          const newNotification = payload.new as BidOffer;
          setBidOffers(prev => [newNotification, ...prev]);
          toast({
            title: "Bid Update! 📈",
            description: "Someone has outbid you. Check your offers!",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [submissionId]);

  const fetchBidData = async () => {
    if (!user?.email) return;

    // Get current bid for this submission
    const { data: bid } = await supabase
      .from('submission_bids')
      .select('*')
      .eq('submission_id', submissionId)
      .single();

    if (bid) {
      setCurrentBid(bid.total_paid_cents / 100);
    }

    // Get bid offers/notifications
    const { data: offers } = await supabase
      .from('bid_notifications')
      .select('*')
      .eq('submission_id', submissionId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (offers && offers.length > 0) {
      setBidOffers(offers);
      // Set suggested bid from latest offer
      const latestOffer = offers[0];
      if (latestOffer.offer_amount_cents) {
        setSuggestedBid(latestOffer.offer_amount_cents / 100);
      }
    }
  };

  const handleBid = async () => {
    if (!user?.email) {
      toast({
        title: "Sign in required",
        description: "Please sign in to place a bid",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-bid', {
        body: {
          submissionId,
          bidAmount: suggestedBid,
          email: user.email,
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
        title: "Bid failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dismissOffer = async (offerId: string) => {
    await supabase
      .from('bid_notifications')
      .update({ is_read: true })
      .eq('id', offerId);

    setBidOffers(prev => prev.filter(o => o.id !== offerId));
  };

  const hasUnreadOffers = bidOffers.length > 0;

  return (
    <div className="space-y-2">
      {/* Unread Offers Alert */}
      <AnimatePresence>
        {hasUnreadOffers && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-primary/10 border border-primary/30 p-3"
          >
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary">
                  Someone outbid you!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bid €{suggestedBid.toFixed(2)} to reclaim your spot
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => dismissOffer(bidOffers[0]?.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={() => setShowBidDialog(true)}
            >
              <Zap className="w-3 h-3 mr-1" />
              Place Bid
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bid Button */}
      {!hasUnreadOffers && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBidDialog(true)}
          className="w-full"
        >
          <TrendingUp className="w-3 h-3 mr-1" />
          {currentBid > 0 ? `Bid More (€${currentBid} invested)` : 'Boost Position'}
        </Button>
      )}

      {/* Bid Dialog */}
      <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Boost Your Position
            </DialogTitle>
            <DialogDescription>
              Pay to move "{songTitle}" higher in the queue
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {currentBid > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Already invested:</span>
                <Badge variant="secondary">€{currentBid.toFixed(2)}</Badge>
              </div>
            )}

            <div className="rounded-lg bg-secondary/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Suggested bid</p>
              <p className="text-3xl font-bold text-primary">€{suggestedBid.toFixed(2)}</p>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Higher bids get reviewed first. You'll be notified if someone outbids you.
            </p>

            <Button
              onClick={handleBid}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Pay €{suggestedBid.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
