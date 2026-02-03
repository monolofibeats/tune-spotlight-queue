import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Star, Zap, Loader2, Lock, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useStreamSession } from '@/hooks/useStreamSession';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PreStreamSpot {
  id: string;
  spot_number: number;
  price_cents: number;
  is_available: boolean;
  purchased_by: string | null;
  submission_id: string | null;
}

const SPOT_CONFIG = [
  { number: 1, price: 100, label: 'First', color: 'from-yellow-400 to-amber-500' },
  { number: 2, price: 75, label: 'Second', color: 'from-gray-300 to-gray-400' },
  { number: 3, price: 50, label: 'Third', color: 'from-amber-600 to-amber-700' },
  { number: 4, price: 30, label: 'Fourth', color: 'from-zinc-400 to-zinc-500' },
  { number: 5, price: 15, label: 'Fifth', color: 'from-zinc-500 to-zinc-600' },
];

export function PreStreamSpots() {
  const { user, isAdmin } = useAuth();
  const { isLive } = useStreamSession();
  const { play } = useSoundEffects();
  const [searchParams] = useSearchParams();
  const [spots, setSpots] = useState<PreStreamSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [songUrl, setSongUrl] = useState('');
  const [artistName, setArtistName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const fetchSpots = async () => {
    const { data, error } = await (supabase
      .from('pre_stream_spots' as any)
      .select('*')
      .is('session_id', null)
      .order('spot_number', { ascending: true })) as any;

    if (!error && data) {
      setSpots(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSpots();

    const channel = supabase
      .channel('prestream_spots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_stream_spots' }, fetchSpots)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle payment verification
  useEffect(() => {
    const verifyPayment = async () => {
      const spotPayment = searchParams.get('spot_payment');
      const sessionId = searchParams.get('session_id');
      const spotId = searchParams.get('spot_id');

      if (spotPayment === 'success' && sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-spot-payment', {
            body: { sessionId, spotId },
          });

          if (error) throw error;

          if (data.success) {
            play('success');
            toast({
              title: `Spot #${data.spotNumber} Purchased! 🎉`,
              description: data.message,
            });
            fetchSpots();
          }
        } catch (error) {
          console.error('Spot payment verification error:', error);
        }

        window.history.replaceState({}, '', '/');
      } else if (spotPayment === 'cancelled') {
        toast({
          title: "Payment cancelled",
          description: "Your spot purchase was not processed.",
          variant: "destructive",
        });
        window.history.replaceState({}, '', '/');
      }
    };

    verifyPayment();
  }, [searchParams, play]);

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please sign in to purchase a pre-stream spot",
        variant: "destructive",
      });
      return;
    }

    if (!songUrl) {
      toast({
        title: "Missing information",
        description: "Please enter your song link",
        variant: "destructive",
      });
      return;
    }

    const spot = spots.find(s => s.spot_number === selectedSpot);
    if (!spot || !spot.is_available) {
      toast({
        title: "Spot unavailable",
        description: "This spot has already been purchased",
        variant: "destructive",
      });
      return;
    }

    setIsPurchasing(true);

    try {
      const { data, error } = await supabase.functions.invoke('purchase-prestream-spot', {
        body: {
          spotNumber: selectedSpot,
          spotId: spot.id,
          songUrl,
          artistName: artistName || 'Unknown Artist',
          songTitle: songTitle || 'Untitled',
          message,
          platform: songUrl.includes('spotify') ? 'spotify' : 
                   songUrl.includes('soundcloud') ? 'soundcloud' : 'other',
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to create checkout session');

      play('click');
      window.location.href = data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process';
      toast({
        title: "Purchase failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  // Don't show when live
  if (isLive || isLoading) return null;

  // If no spots exist, show nothing
  if (spots.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/50 bg-card/50 p-4 md:p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Pre-Stream Priority Spots</h3>
            <p className="text-xs text-muted-foreground">
              Secure your spot at the start of the next stream
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {SPOT_CONFIG.map((config) => {
            const spot = spots.find(s => s.spot_number === config.number);
            const isAvailable = spot?.is_available ?? false;

            return (
              <motion.button
                key={config.number}
                whileHover={isAvailable ? { scale: 1.05 } : undefined}
                whileTap={isAvailable ? { scale: 0.95 } : undefined}
                onClick={() => isAvailable && setSelectedSpot(config.number)}
                disabled={!isAvailable}
                className={`relative flex flex-col items-center justify-center p-2 md:p-3 rounded-xl border transition-all ${
                  isAvailable 
                    ? 'border-primary/30 bg-gradient-to-br hover:border-primary cursor-pointer ' + config.color 
                    : 'border-border/30 bg-muted/30 cursor-not-allowed opacity-50'
                }`}
              >
                <span className="text-lg md:text-2xl font-display font-bold text-black">
                  #{config.number}
                </span>
                <span className="text-xs font-semibold text-black/80">
                  €{config.price}
                </span>
                {!isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-3">
          {spots.filter(s => s.is_available).length} spots available • Resets each stream
        </p>
      </motion.div>

      {/* Purchase Dialog */}
      <Dialog open={selectedSpot !== null} onOpenChange={() => setSelectedSpot(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Purchase Spot #{selectedSpot}
            </DialogTitle>
            <DialogDescription>
              Your song will be reviewed {SPOT_CONFIG.find(c => c.number === selectedSpot)?.label?.toLowerCase()} 
              {' '}when the stream starts
            </DialogDescription>
          </DialogHeader>

          {!user ? (
            <div className="text-center py-4">
              <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Please sign in to purchase a spot
              </p>
              <Button asChild>
                <a href="/auth">Sign In</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Song Link *
                </label>
                <Input
                  placeholder="Spotify, SoundCloud, or any link..."
                  value={songUrl}
                  onChange={(e) => setSongUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Artist</label>
                  <Input
                    placeholder="Artist name"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Title</label>
                  <Input
                    placeholder="Song title"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Message (optional)</label>
                <Input
                  placeholder="Anything you want us to know?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
                <span className="font-medium">Total</span>
                <span className="text-xl font-display font-bold text-primary">
                  €{SPOT_CONFIG.find(c => c.number === selectedSpot)?.price}
                </span>
              </div>

              <Button
                onClick={handlePurchase}
                disabled={isPurchasing || !songUrl}
                className="w-full"
                size="lg"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Purchase Spot #{selectedSpot}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
