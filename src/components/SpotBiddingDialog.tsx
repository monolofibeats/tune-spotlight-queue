import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Loader2, Crown, Medal, Award, Tag, Check, Clock, TrendingUp, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SpotPrice {
  position: number;
  currentPrice: number;
  yourPrice: number;
  songTitle?: string;
  artistName?: string;
  locked?: boolean;
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
  audioFileUrl?: string | null;
  streamerId?: string | null;
  streamerSlug?: string | null;
  originalSubmissionId?: string | null;
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
  streamerSlug,
  originalSubmissionId,
  onSuccess,
}: SpotBiddingDialogProps) {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [spots, setSpots] = useState<SpotPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [incrementPercent, setIncrementPercent] = useState(10);
  const [minBidAmount, setMinBidAmount] = useState<number | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [queuePosition, setQueuePosition] = useState<{ position: number; total: number } | null>(null);

  const MINUTES_PER_SONG = 5;

  useEffect(() => {
    if (open) {
      fetchSpotPrices();
      fetchQueuePosition();
      setDiscountCode('');
      setDiscountPercent(null);
    }
  }, [open]);

  const fetchQueuePosition = async () => {
    if (!originalSubmissionId || !streamerId) {
      // No existing submission to track position of — just show total queue size
      if (streamerId) {
        const { data } = await supabase
          .from('public_submissions_queue')
          .select('id')
          .eq('streamer_id', streamerId)
          .eq('status', 'pending');
        if (data) {
          setQueuePosition({ position: data.length, total: data.length });
        }
      }
      return;
    }

    const { data } = await supabase
      .from('public_submissions_queue')
      .select('id, is_priority, boost_amount, amount_paid, created_at')
      .eq('streamer_id', streamerId)
      .eq('status', 'pending')
      .order('is_priority', { ascending: false })
      .order('boost_amount', { ascending: false })
      .order('amount_paid', { ascending: false })
      .order('created_at', { ascending: true });

    if (!data) return;

    const idx = data.findIndex(q => q.id === originalSubmissionId);
    if (idx !== -1) {
      setQueuePosition({ position: idx + 1, total: data.length });
    } else {
      setQueuePosition({ position: data.length + 1, total: data.length + 1 });
    }
  };

  const fetchSpotPrices = async () => {
    setIsLoading(true);
    
    try {
      // Get bid increment configuration (prefer streamer-specific, fall back to global)
      const { data: bidConfigs } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('config_type', 'bid_increment');

      const bidConfig = bidConfigs?.find(r => streamerId && r.streamer_id === streamerId)
        ?? bidConfigs?.find(r => r.streamer_id === null)
        ?? bidConfigs?.[0];

      if (bidConfig) {
        setIncrementPercent(bidConfig.min_amount_cents); // Stored as %
      }

      // Get skip_line minimum price - REQUIRED for proper validation (prefer streamer-specific, fall back to global)
      const { data: skipConfigs, error: skipError } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('config_type', 'skip_line');

      const skipConfig = skipConfigs?.find(r => streamerId && r.streamer_id === streamerId)
        ?? skipConfigs?.find(r => r.streamer_id === null)
        ?? skipConfigs?.[0];

      if (skipError) {
        console.warn('Failed to load skip_line config, using default:', skipError);
      }

      const loadedMinBid = skipConfig ? skipConfig.min_amount_cents / 100 : 2.50;
      setMinBidAmount(loadedMinBid);

      // Fetch configured spot prices from pre_stream_spots
      const { data: spotRows } = await (supabase
        .from('pre_stream_spots' as any)
        .select('spot_number, price_cents')
        .eq('streamer_id', streamerId ?? '')
        .is('session_id', null)
        .order('spot_number', { ascending: true })) as any;

      const configuredSpotPrices: Record<number, number> = {};
      if (spotRows) {
        spotRows.forEach((s: any) => {
          configuredSpotPrices[s.spot_number] = s.price_cents / 100;
        });
      }

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
          .from('public_submission_bids')
          .select('submission_id, total_paid_cents')
          .in('submission_id', submissionIds);

        if (bids) {
          bidsMap = bids.reduce((acc, bid) => {
            acc[bid.submission_id] = bid.total_paid_cents / 100;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      // Calculate spot prices with sequential fill logic:
      // - Spots fill from #1 upward
      // - Only the NEXT empty spot is claimable, others greyed out
      // - Occupied spots can be outbid (pushing occupant down)
      const calculatedSpots: SpotPrice[] = [];
      const percent = bidConfig?.min_amount_cents || 10;
      let firstEmptyFound = false;

      for (let i = 0; i < 3; i++) {
        const spotNum = i + 1;
        const basePrice = configuredSpotPrices[spotNum] ?? loadedMinBid;
        const submission = pendingSubmissions?.[i];
        if (submission) {
          // Occupied spot — outbiddable
          const totalPaid = bidsMap[submission.id || ''] || Number(submission.amount_paid) || 0;
          // Use the higher of basePrice or totalPaid as reference, then apply increment
          const reference = Math.max(basePrice, totalPaid);
          const yourPrice = Math.ceil(reference * (1 + percent / 100) * 100) / 100;
          
          calculatedSpots.push({
            position: spotNum,
            currentPrice: totalPaid,
            yourPrice,
            songTitle: submission.song_title || undefined,
            artistName: submission.artist_name || undefined,
          });
        } else {
          // Empty spot
          calculatedSpots.push({
            position: spotNum,
            currentPrice: 0,
            yourPrice: basePrice,
            // Mark whether this is the first (claimable) empty spot
            ...(firstEmptyFound ? { locked: true } : {}),
          });
          firstEmptyFound = true;
        }
      }

      setSpots(calculatedSpots);
    } catch (error) {
      console.error('Error fetching spot prices:', error);
      toast({
        title: t('bidding.error'),
        description: t('bidding.errorLoadSpots'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateDiscountCode = async (code: string) => {
    if (!code.trim()) {
      setDiscountPercent(null);
      return;
    }
    setIsValidatingCode(true);
    try {
      const { data, error } = await supabase
        .rpc('validate_discount_code', { code_input: code.trim().toUpperCase() });

      if (error || !data || data.length === 0 || !data[0].is_valid) {
        setDiscountPercent(null);
        toast({ title: t('bidding.invalidCode'), description: t('bidding.invalidCodeDesc'), variant: 'destructive' });
      } else {
        setDiscountPercent(data[0].discount_percent);
        toast({ title: t('bidding.discountAppliedToast').replace('{percent}', String(data[0].discount_percent)), description: t('bidding.discountAppliedToastDesc') });
      }
    } catch {
      setDiscountPercent(null);
    }
    setIsValidatingCode(false);
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

        // Soft-delete the original free submission to prevent duplicates
        if (originalSubmissionId) {
          await supabase
            .from('submissions')
            .update({ status: 'deleted' })
            .eq('id', originalSubmissionId)
            .eq('status', 'pending');
        }

        toast({
          title: t('bidding.adminBypass'),
          description: t('bidding.adminBypassDesc').replace('{position}', String(spotPosition)),
        });
        
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      // Send the pre-discount amount - server applies discount
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
          streamerSlug: streamerSlug || null,
          originalSubmissionId: originalSubmissionId || null,
          referralCode: discountPercent ? discountCode.trim().toUpperCase() : undefined,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to create checkout session');

      // Save submission data so it can be tracked after payment redirect
      localStorage.setItem('upstar_pending_priority_submission', JSON.stringify({
        songTitle,
        artistName,
        songUrl,
        platform,
        audioFileUrl: audioFileUrl || null,
        streamerId: streamerId || null,
        streamerSlug: streamerSlug || null,
      }));

      window.location.href = data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process';
      toast({
        title: t('bidding.failed'),
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
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] rounded-xl p-3 sm:p-4">
        <DialogHeader className="space-y-0.5">
          <DialogTitle className="flex items-center gap-1.5 text-sm sm:text-base">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            {t('bidding.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Song info + queue position — compact */}
        <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Music2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-xs font-medium truncate flex-1 min-w-0">{songTitle} <span className="text-muted-foreground font-normal">– {artistName}</span></p>
          </div>

          {queuePosition && (
            <div className="text-[11px] text-muted-foreground leading-snug">
              <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
              Spot <span className="font-bold text-primary">#{queuePosition.position}</span> of {queuePosition.total} — est. wait{' '}
              <span className="font-bold text-primary">
                {(() => {
                  const totalMin = queuePosition.position * MINUTES_PER_SONG;
                  const h = Math.floor(totalMin / 60);
                  const m = totalMin % 60;
                  return h > 0 ? `~${h}h${m > 0 ? ` ${m}min` : ''}` : `~${m}min`;
                })()}
              </span>.
              {' '}Buy a top spot below to skip the line!
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-1.5 py-1">
            {spots.map((spot, index) => {
              const Icon = SPOT_ICONS[index] || Award;
              const colorClass = SPOT_COLORS[index] || 'text-muted-foreground';
              const isAvailable = spot.currentPrice === 0;
              const isLocked = !!spot.locked;

              // Estimate wait if you grab this spot
              const spotWaitMin = spot.position * MINUTES_PER_SONG;
              const wH = Math.floor(spotWaitMin / 60);
              const wM = spotWaitMin % 60;
              const waitLabel = wH > 0 ? `~${wH}h${wM > 0 ? ` ${wM}min` : ''}` : `~${wM}min`;
              
              return (
                <motion.button
                  key={spot.position}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => !isLocked && handleSelectSpot(spot.position)}
                  disabled={isProcessing || isLocked}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-all text-left overflow-hidden
                    ${isLocked
                      ? 'border-border/30 bg-muted/30 opacity-40 cursor-not-allowed'
                      : selectedSpot === spot.position 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card'
                    }
                    ${isProcessing && selectedSpot !== spot.position ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 ${isLocked ? 'text-muted-foreground' : colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs sm:text-sm">#{spot.position}</span>
                        {isAvailable && !isLocked && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{t('bidding.available')}</Badge>
                        )}
                        {isLocked && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">Unavailable</Badge>
                        )}
                      </div>
                      {spot.songTitle && (
                        <p className="text-[10px] text-muted-foreground truncate">{spot.songTitle} – {spot.artistName}</p>
                      )}
                      {!isLocked && (
                        <p className="text-[10px] text-muted-foreground">
                          <TrendingUp className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                          wait: {waitLabel}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {!isLocked && discountPercent ? (
                        <div className="flex items-center gap-1 justify-end">
                          <p className="text-[10px] text-muted-foreground line-through">€{spot.yourPrice.toFixed(2)}</p>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1 py-0">-{discountPercent}%</Badge>
                        </div>
                      ) : null}
                      <p className={`text-sm font-bold ${isLocked ? 'text-muted-foreground' : 'text-primary'}`}>
                        €{(discountPercent && !isLocked ? spot.yourPrice * (1 - discountPercent / 100) : spot.yourPrice).toFixed(2)}
                      </p>
                      {selectedSpot === spot.position && isProcessing ? (
                        <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                      ) : !isLocked ? (
                        <p className="text-[9px] text-muted-foreground">{isAvailable ? t('bidding.toClaim') : t('bidding.toOutbid')}</p>
                      ) : null}
                    </div>
                  </div>
                </motion.button>
              );
            })}

            {/* Discount Code Input */}
            {!isAdmin && (
              <div className="pt-1.5 border-t border-border/30 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input
                      placeholder={t('bidding.discountPlaceholder')}
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value.toUpperCase());
                        setDiscountPercent(null);
                      }}
                      className="h-7 text-[11px] pl-7 bg-background/50 font-mono tracking-wider"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] px-2"
                    disabled={!discountCode.trim() || isValidatingCode || discountPercent !== null}
                    onClick={() => validateDiscountCode(discountCode)}
                  >
                    {isValidatingCode ? <Loader2 className="w-3 h-3 animate-spin" /> : discountPercent ? <Check className="w-3 h-3 text-emerald-400" /> : t('bidding.apply')}
                  </Button>
                </div>
                {discountPercent && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30">
                    <Tag className="w-2.5 h-2.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-300 font-medium">
                      {t('bidding.discountApplied').replace('{percent}', String(discountPercent))}
                    </span>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">{t('bidding.outbidNotice')}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
