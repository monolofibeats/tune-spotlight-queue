import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Send, Loader2, DollarSign, TrendingUp, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { MusicEmbed } from './MusicEmbed';
import { toast } from '@/hooks/use-toast';
import { WatchlistRef } from './WatchlistDisplay';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useSearchParams } from 'react-router-dom';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
  const { user: authUser, isAdmin } = useAuth();
  const [songUrl, setSongUrl] = useState('');
  const [artistName, setArtistName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [priorityAmount, setPriorityAmount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flyingCard, setFlyingCard] = useState<FlyingCard | null>(null);
  const [highestBid, setHighestBid] = useState(0);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [user, setUser] = useState<any>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [searchParams] = useSearchParams();

  const platform = songUrl ? detectPlatform(songUrl) : null;
  const showPreview = songUrl && (platform === 'spotify' || platform === 'soundcloud');

  // Check user auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch highest current bid
  useEffect(() => {
    const fetchHighestBid = async () => {
      try {
        // Use maybeSingle() so we don't throw/emit a 406 when there are 0 rows.
        const { data, error } = await supabase
          .from('submissions')
          .select('amount_paid')
          .eq('is_priority', true)
          .eq('status', 'pending')
          .order('amount_paid', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setHighestBid(data?.amount_paid ?? 0);
      } catch (e) {
        console.error('Error fetching highest bid:', e);
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

  const { play } = useSoundEffects();

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
      user_id: user?.id || null,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast({
      title: "Signed out",
      description: "You've been logged out",
    });
  };

  const handleSkipTheLine = () => {
    if (!songUrl) {
      toast({
        title: "Missing information",
        description: "Please enter a song link first.",
        variant: "destructive",
      });
      return;
    }
    setShowPriorityDialog(true);
  };

  // Admin bypass: directly insert priority submission without payment
  const handleAdminPrioritySubmit = async () => {
    setIsProcessingPayment(true);
    
    try {
      const { error } = await supabase.from('submissions').insert({
        song_url: songUrl,
        platform: platform || 'other',
        artist_name: artistName || 'Unknown Artist',
        song_title: songTitle || 'Untitled',
        message: message || null,
        email: authUser?.email || email || null,
        amount_paid: priorityAmount, // Record the amount for sorting
        is_priority: true,
        user_id: authUser?.id || null,
      });

      if (error) throw error;

      play('success');
      toast({
        title: "Priority submission added! 🎉",
        description: "Admin bypass: No payment required",
      });
      
      setShowPriorityDialog(false);
      watchlistRef?.current?.refreshList();
      
      // Reset form
      setSongUrl('');
      setArtistName('');
      setSongTitle('');
      setEmail('');
      setMessage('');
      setPriorityAmount(5);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit';
      toast({
        title: "Submission failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePriorityPayment = async () => {
    // Admin bypass - no payment required
    if (isAdmin) {
      await handleAdminPrioritySubmit();
      return;
    }

    if (!user) {
      toast({
        title: "Login required",
        description: "Please sign in to use priority submissions",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-priority-payment', {
        body: {
          amount: priorityAmount,
          songUrl,
          artistName: artistName || 'Unknown Artist',
          songTitle: songTitle || 'Untitled',
          message,
          email: user.email || email,
          platform: platform || 'other',
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to create checkout session');

      // Open Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process payment';
      toast({
        title: "Payment failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
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
      
      play('submit');
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-xl mx-auto relative"
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
                x: [0, 50, 150, 250],
                y: [0, -30, -60, -50],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.32, 0, 0.67, 0] }}
              className="absolute top-0 left-0 right-0 z-50 pointer-events-none"
            >
              <div className="rounded-xl p-3 max-w-xs mx-auto shadow-lg bg-card border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20">
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{flyingCard.songTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">{flyingCard.artistName}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div 
            className="rounded-xl p-4 md:p-6 space-y-4 bg-card/50 border border-border/50"
          >
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-primary" />
              <h2 className="text-base font-display font-semibold">Submit Your Song</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Song Link *
                </label>
                <Input
                  placeholder="Paste Spotify, SoundCloud, or any link..."
                  value={songUrl}
                  onChange={(e) => setSongUrl(e.target.value)}
                  className="h-10 text-sm bg-background/50"
                />
                {platform && (
                  <div className="mt-1.5">
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
                  <MusicEmbed url={songUrl} platform={platform!} />
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Artist</label>
                  <Input
                    placeholder="Artist name"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="h-10 text-sm bg-background/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Title</label>
                  <Input
                    placeholder="Song title"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    className="h-10 text-sm bg-background/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Email (optional)</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-sm bg-background/50"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Message (optional)</label>
                <Textarea
                  placeholder="Why should we check this out?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[80px] text-sm resize-none bg-background/50"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons - Stacked on mobile */}
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit (Free)
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleSkipTheLine}
              variant="outline"
              size="lg"
              className="w-full border-primary/30 text-primary hover:bg-primary/10"
            >
              <Zap className="w-4 h-4" />
              Skip the Line
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Priority Payment Dialog */}
      <Dialog open={showPriorityDialog} onOpenChange={setShowPriorityDialog}>
        <DialogContent className="glass-strong border-border/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Skip the Line - Priority Submission
            </DialogTitle>
            <DialogDescription>
              Get your song reviewed faster by bidding for priority placement. Higher bids = higher position!
            </DialogDescription>
          </DialogHeader>

          {!user ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground text-center">
                Sign in to use priority submissions
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => handleSocialLogin('google')}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
                <Button
                  onClick={() => handleSocialLogin('apple')}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Continue with Apple
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Signed in as {user.email}</span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>

              {highestBid > 0 && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-primary/10">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">
                    Current highest bid: <span className="text-primary font-semibold">${highestBid}</span>
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Your Bid Amount</label>
                  <div className="flex items-center gap-1 text-2xl font-bold text-amber-500">
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
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
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

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-200">
                  <strong>Song:</strong> {songTitle || 'Untitled'} by {artistName || 'Unknown Artist'}
                </p>
              </div>

              <Button
                onClick={handlePriorityPayment}
                disabled={isProcessingPayment}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                size="lg"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to payment...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Pay ${priorityAmount} & Skip the Line
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
