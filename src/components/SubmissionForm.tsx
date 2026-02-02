import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Send, Loader2, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { MusicEmbed } from './MusicEmbed';
import { toast } from '@/hooks/use-toast';
import { WatchlistRef } from './WatchlistDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';

type Platform = 'spotify' | 'apple-music' | 'soundcloud' | 'youtube' | 'other';

const detectPlatform = (url: string): Platform => {
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('music.apple.com')) return 'apple-music';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'other';
};

interface SubmissionFormProps {
  watchlistRef?: React.RefObject<WatchlistRef>;
}

interface FlyingCard {
  id: string;
  songTitle: string;
  artistName: string;
  isPriority: boolean;
  amount: number;
}

export function SubmissionForm({ watchlistRef }: SubmissionFormProps) {
  const [songUrl, setSongUrl] = useState('');
  const [artistName, setArtistName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [priorityAmount, setPriorityAmount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flyingCard, setFlyingCard] = useState<FlyingCard | null>(null);
  const [highestBid, setHighestBid] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [searchParams] = useSearchParams();

  const platform = songUrl ? detectPlatform(songUrl) : null;
  const showPreview = songUrl && (platform === 'spotify' || platform === 'soundcloud');

  // Fetch highest current bid
  useEffect(() => {
    const fetchHighestBid = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('amount_paid')
        .eq('status', 'pending')
        .order('amount_paid', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setHighestBid(data.amount_paid);
      }
    };

    fetchHighestBid();

    // Subscribe to changes
    const channel = supabase
      .channel('highest_bid')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, fetchHighestBid)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle payment verification on return
  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const paymentStatus = searchParams.get('payment');

      if (paymentStatus === 'success' && sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { sessionId },
          });

          if (error) throw error;

          if (data.success) {
            toast({
              title: "Payment successful! 🎉",
              description: data.message,
            });
            watchlistRef?.current?.refreshList();
          }
        } catch (error) {
          console.error('Payment verification error:', error);
        }

        // Clean URL
        window.history.replaceState({}, '', '/');
      } else if (paymentStatus === 'cancelled') {
        toast({
          title: "Payment cancelled",
          description: "Your submission was not processed.",
          variant: "destructive",
        });
        window.history.replaceState({}, '', '/');
      }
    };

    verifyPayment();
  }, [searchParams, watchlistRef]);

  const handleFreeSubmit = async () => {
    // Direct database insert for free submissions
    const { error } = await supabase.from('submissions').insert({
      song_url: songUrl,
      platform: platform || 'other',
      artist_name: artistName || 'Unknown Artist',
      song_title: songTitle || 'Untitled',
      message: message || null,
      email: email || null,
      amount_paid: 0,
      is_priority: false,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const handlePrioritySubmit = async () => {
    // Redirect to Stripe checkout for priority submissions
    const { data, error } = await supabase.functions.invoke('create-priority-payment', {
      body: {
        amount: priorityAmount,
        songUrl,
        artistName: artistName || 'Unknown Artist',
        songTitle: songTitle || 'Untitled',
        message,
        email,
        platform: platform || 'other',
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('Failed to create checkout session');

    // Redirect to Stripe
    window.location.href = data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!songUrl) {
      toast({
        title: "Missing information",
        description: "Please enter a song link.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isPriority) {
        await handlePrioritySubmit();
        // Don't reset form - user will be redirected to Stripe
        return;
      }

      // Free submission
      const cardData: FlyingCard = {
        id: `flying-${Date.now()}`,
        songTitle: songTitle || 'Untitled',
        artistName: artistName || 'Unknown Artist',
        isPriority: false,
        amount: 0,
      };
      
      setFlyingCard(cardData);
      
      await handleFreeSubmit();
      
      setTimeout(() => {
        watchlistRef?.current?.addNewItem({
          songTitle: cardData.songTitle,
          artistName: cardData.artistName,
          isPriority: false,
          amountPaid: 0,
        });
      }, 400);
      
      setTimeout(() => {
        setFlyingCard(null);
      }, 800);
      
      toast({
        title: "Song submitted! 🎵",
        description: "Your song has been added to the watchlist.",
      });
      
      // Reset form
      setSongUrl('');
      setArtistName('');
      setSongTitle('');
      setEmail('');
      setMessage('');
      setIsPriority(false);
      setPriorityAmount(5);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit';
      toast({
        title: "Submission failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-2xl mx-auto relative"
    >
      {/* Flying Card Animation */}
      <AnimatePresence>
        {flyingCard && (
          <motion.div
            key={flyingCard.id}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={{ 
              opacity: [1, 1, 0.8, 0],
              scale: [1, 0.9, 0.7, 0.5],
              x: [0, 100, 300, 500],
              y: [0, -50, -100, -80],
              rotate: [0, 5, 10, 15],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0, 0.67, 0] }}
            className="absolute top-0 left-0 right-0 z-50 pointer-events-none"
          >
            <div className={`glass-strong rounded-2xl p-4 max-w-sm mx-auto shadow-2xl ${
              flyingCard.isPriority ? 'ring-2 ring-primary/50' : 'ring-2 ring-primary/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  flyingCard.isPriority ? 'bg-primary' : 'bg-primary/20'
                }`}>
                  <Star className={`w-5 h-5 ${flyingCard.isPriority ? 'text-primary-foreground fill-primary-foreground' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{flyingCard.songTitle}</p>
                  <p className="text-sm text-muted-foreground truncate">{flyingCard.artistName}</p>
                </div>
                {flyingCard.isPriority && <Sparkles className="w-5 h-5 text-primary" />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <motion.div 
          className="glass-strong rounded-2xl p-6 md:p-8 space-y-6"
          animate={flyingCard ? { scale: 0.98, opacity: 0.7 } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-display font-semibold">Submit Your Song</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Song Link (Spotify, Apple Music, SoundCloud, etc.) *
              </label>
              <Input
                placeholder="https://open.spotify.com/track/..."
                value={songUrl}
                onChange={(e) => setSongUrl(e.target.value)}
                className="bg-background/50"
              />
              {platform && (
                <div className="mt-2">
                  <Badge variant="queue" className="text-xs">
                    {platform === 'apple-music' ? 'Apple Music' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Badge>
                </div>
              )}
            </div>

            {showPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="overflow-hidden"
              >
                <label className="text-sm text-muted-foreground mb-2 block">Preview</label>
                <MusicEmbed url={songUrl} platform={platform!} />
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Artist Name</label>
                <Input
                  placeholder="Artist name"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Song Title</label>
                <Input
                  placeholder="Song title"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Email (optional, for updates)</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Message (optional)</label>
              <Textarea
                placeholder="Why should we check out this song?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-background/50 min-h-[100px] resize-none rounded-lg border-border focus-visible:ring-primary/50"
              />
            </div>
          </div>
        </motion.div>

        {/* Priority Upgrade with Bidding */}
        <motion.div
          className={`glass rounded-2xl p-6 border-2 transition-all duration-300 ${
            isPriority 
              ? 'border-primary/50 bg-primary/5' 
              : 'border-border hover:border-primary/30'
          }`}
        >
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsPriority(!isPriority)}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl transition-all ${isPriority ? 'bg-primary/20' : 'bg-secondary'}`}>
                <Sparkles className={`w-6 h-6 ${isPriority ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  Skip the Watchlist
                  <Badge variant="premium">From $5</Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pay more to outbid others and get reviewed first
                </p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
              isPriority ? 'border-primary bg-primary' : 'border-muted-foreground'
            }`}>
              {isPriority && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              )}
            </div>
          </div>

          {/* Bidding section */}
          <AnimatePresence>
            {isPriority && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-6 space-y-4">
                  {highestBid > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">
                        Current highest bid: <span className="text-primary font-semibold">${highestBid}</span>
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm text-muted-foreground">Your bid amount</label>
                      <div className="flex items-center gap-1 text-2xl font-display font-bold text-primary">
                        <DollarSign className="w-6 h-6" />
                        {priorityAmount}
                      </div>
                    </div>
                    <Slider
                      value={[priorityAmount]}
                      onValueChange={([value]) => setPriorityAmount(value)}
                      min={5}
                      max={100}
                      step={1}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>$5 min</span>
                      <span>$100</span>
                    </div>
                  </div>

                  {priorityAmount > highestBid && highestBid > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-primary flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      You'll be #1 in the queue!
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <Button
          type="submit"
          variant={isPriority ? 'premium' : 'hero'}
          size="xl"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isPriority ? 'Redirecting to payment...' : 'Submitting...'}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              {isPriority ? `Submit with Priority - $${priorityAmount}` : 'Submit Song (Free)'}
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
