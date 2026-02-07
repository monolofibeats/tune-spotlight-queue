import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Loader2, Crown, Medal, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SpotPrice {
  position: number;
  currentPrice: number; // Total already paid for this spot
  yourPrice: number; // What you need to pay to claim it
  songTitle?: string;
  artistName?: string;
}

interface SpotBiddingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songUrl: string;
  artistName: string;
  songTitle: string;
  message?: string;
  email: string;
  platform: string;
  audioFileUrl?: string | null; // Pre-uploaded audio file path
  streamerId?: string | null; // Streamer context for marketplace
  onSuccess?: () => void;
}

const SPOT_ICONS = [Crown, Medal, Award];
const SPOT_COLORS = ['text-podium-gold', 'text-podium-silver', 'text-podium-bronze'];

export function SpotBiddingDialog({
  open,
  onOpenChange,
  songUrl,
  artistName,
  songTitle,
  message,
  email,
  platform,
  audioFileUrl,
  streamerId,
  onSuccess,
}: SpotBiddingDialogProps) {
  const { user, isAdmin } = useAuth();
  const [spots, setSpots] = useState<SpotPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [incrementPercent, setIncrementPercent] = useState(10);
  const [minBidAmount, setMinBidAmount] = useState<number | null>(null); // Start as null until loaded

  useEffect(() => {
    if (open) {
      fetchSpotPrices();
    }
  }, [open]);

  const fetchSpotPrices = async () => {
    setIsLoading(true);
    
    try {
      // Get bid increment configuration
      const { data: bidConfig } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('config_type', 'bid_increment')
        .single();

      if (bidConfig) {
        setIncrementPercent(bidConfig.min_amount_cents); // Stored as %
      }

      // Get skip_line minimum price - REQUIRED for proper validation
      const { data: skipConfig, error: skipError } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('config_type', 'skip_line')
        .single();

      if (skipError || !skipConfig) {
        console.error('Failed to load skip_line config:', skipError);
        toast({
          title: 'Error',
          description: 'Failed to load pricing configuration',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const loadedMinBid = skipConfig.min_amount_cents / 100;
      setMinBidAmount(loadedMinBid);

      // Get all pending priority submissions with their bids
      // Filter by streamerId if provided, otherwise get global queue
      let query = supabase
        .from('public_submissions_queue')
        .select('*')
        .eq('status', 'pending')
        .eq('is_priority', true);
      
      if (streamerId) {
        query = query.eq('streamer_id', streamerId);
      } else {
        query = query.is('streamer_id', null);
      }
      
      const { data: pendingSubmissions } = await query.order('amount_paid', { ascending: false });

      // Get bids for these submissions
      const submissionIds = pendingSubmissions?.map(s => s.id) || [];
      let bidsMap: Record<string, number> = {};
      
      if (submissionIds.length > 0) {
        const { data: bids } = await supabase
          .from('submission_bids')
          .select('submission_id, total_paid_cents')
          .in('submission_id', submissionIds);

        if (bids) {
          bidsMap = bids.reduce((acc, bid) => {
            acc[bid.submission_id] = bid.total_paid_cents / 100;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      // Calculate spot prices for top 5 positions
      const calculatedSpots: SpotPrice[] = [];
      const percent = bidConfig?.min_amount_cents || 10;

      for (let i = 0; i < 5; i++) {
        const submission = pendingSubmissions?.[i];
        if (submission) {
          const totalPaid = bidsMap[submission.id || ''] || Number(submission.amount_paid) || 0;
          const yourPrice = Math.max(
            loadedMinBid,
            Math.ceil(totalPaid * (1 + percent / 100) * 100) / 100
          );
          
          calculatedSpots.push({
            position: i + 1,
            currentPrice: totalPaid,
            yourPrice,
            songTitle: submission.song_title || undefined,
            artistName: submission.artist_name || undefined,
          });
        } else {
          // Empty spot - use minimum price from DB
          calculatedSpots.push({
            position: i + 1,
            currentPrice: 0,
            yourPrice: loadedMinBid,
          });
        }
      }

      setSpots(calculatedSpots);
    } catch (error) {
      console.error('Error fetching spot prices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load spot prices',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSpot = async (spotPosition: number) => {
    const spot = spots.find(s => s.position === spotPosition);
    if (!spot) return;

    // Email is optional - Stripe will collect it during checkout if not provided
    setSelectedSpot(spotPosition);
    setIsProcessing(true);

    try {
      // Admin bypass - no payment required
      if (isAdmin) {
        const { error } = await supabase.from('submissions').insert({
          song_url: songUrl || 'direct-upload',
          platform: platform || 'other',
          artist_name: artistName || 'Unknown Artist',
          song_title: songTitle || 'Untitled',
          message: message || null,
          email: user?.email || email || null,
          amount_paid: spot.yourPrice,
          is_priority: true,
          user_id: user?.id || null,
          audio_file_url: audioFileUrl || null,
          streamer_id: streamerId || null,
        });

        if (error) throw error;

        toast({
          title: 'Priority submission added! 🎉',
          description: `Admin bypass: Claimed spot #${spotPosition}`,
        });
        
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      // Regular users go through Stripe
      const { data, error } = await supabase.functions.invoke('create-priority-payment', {
        body: {
          amount: spot.yourPrice,
          songUrl: songUrl || 'direct-upload',
          artistName: artistName || 'Unknown Artist',
          songTitle: songTitle || 'Untitled',
          message,
          email: user?.email || email,
          platform: platform || 'other',
          targetSpot: spotPosition,
          audioFileUrl: audioFileUrl || null,
          streamerId: streamerId || null,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to create checkout session');

      window.location.href = data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process';
      toast({
        title: 'Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setSelectedSpot(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Skip the Waiting List
          </DialogTitle>
          <DialogDescription>
            Choose your spot in the queue. Higher positions get reviewed first!
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 py-4">
            {spots.map((spot, index) => {
              const Icon = SPOT_ICONS[index] || Award;
              const colorClass = SPOT_COLORS[index] || 'text-muted-foreground';
              const isAvailable = spot.currentPrice === 0;
              
              return (
                <motion.button
                  key={spot.position}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectSpot(spot.position)}
                  disabled={isProcessing}
                  className={`
                    w-full p-4 rounded-xl border transition-all text-left
                    ${selectedSpot === spot.position 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card'
                    }
                    ${isProcessing && selectedSpot !== spot.position ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Spot #{spot.position}</span>
                        {isAvailable && (
                          <Badge variant="secondary" className="text-xs">Available</Badge>
                        )}
                      </div>
                      {spot.songTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          Currently: {spot.songTitle} by {spot.artistName}
                        </p>
                      )}
                      {!isAvailable && (
                        <p className="text-xs text-muted-foreground">
                          Current bid: €{spot.currentPrice.toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-primary">
                        €{spot.yourPrice.toFixed(2)}
                      </p>
                      {selectedSpot === spot.position && isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {isAvailable ? 'to claim' : `+${incrementPercent}%`}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}

            <p className="text-xs text-muted-foreground text-center pt-2">
              If someone outbids you, you'll receive an email notification with the option to bid again.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
