import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, Loader2, DollarSign, Zap, Shield, Ban, Upload, X, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MusicEmbed } from './MusicEmbed';
import { SpotBiddingDialog } from './SpotBiddingDialog';
import { toast } from '@/hooks/use-toast';
import { WatchlistRef } from './WatchlistDisplay';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useSearchParams } from 'react-router-dom';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { useLanguage } from '@/hooks/useLanguage';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

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
  const { t } = useLanguage();
  const { isActive: skipLineActive } = usePricingConfig('skip_line');
  const { 
    minAmount: submissionPrice, 
    isActive: submissionPaid,
  } = usePricingConfig('submission');
  const { isActive: submissionsOpen } = usePricingConfig('submissions_open');
  
  const [songUrl, setSongUrl] = useState('');
  const [artistName, setArtistName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flyingCard, setFlyingCard] = useState<FlyingCard | null>(null);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [user, setUser] = useState<any>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const { play } = useSoundEffects();

  // Handle payment verification on return
  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const paymentStatus = searchParams.get('payment');
      const submissionPayment = searchParams.get('submission_payment');

      // Handle priority payment verification
      if (paymentStatus === 'success' && sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { sessionId },
          });

          if (error) throw error;

          if (data.success) {
            play('success');
            toast({
              title: "Payment successful! 🎉",
              description: data.message,
            });
            watchlistRef?.current?.refreshList();
          }
        } catch (error) {
          console.error('Payment verification error:', error);
        }

        window.history.replaceState({}, '', '/');
      } else if (paymentStatus === 'cancelled') {
        toast({
          title: "Payment cancelled",
          description: "Your submission was not processed.",
          variant: "destructive",
        });
        window.history.replaceState({}, '', '/');
      }

      // Handle submission payment verification
      if (submissionPayment === 'success' && sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-submission-payment', {
            body: { sessionId },
          });

          if (error) throw error;

          if (data.success) {
            play('success');
            toast({
              title: "Song submitted! 🎵",
              description: data.message,
            });
            watchlistRef?.current?.refreshList();
          }
        } catch (error) {
          console.error('Submission payment verification error:', error);
        }

        window.history.replaceState({}, '', '/');
      } else if (submissionPayment === 'cancelled') {
        toast({
          title: "Payment cancelled",
          description: "Your submission was not processed.",
          variant: "destructive",
        });
        window.history.replaceState({}, '', '/');
      }
    };

    verifyPayment();
  }, [searchParams, watchlistRef, play]);

  const uploadAudioFile = async (): Promise<string | null> => {
    if (!audioFile) return null;
    
    setIsUploadingFile(true);
    try {
      const fileExt = audioFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('song-files')
        .upload(fileName, audioFile, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload audio file');
      }
      
      // Return just the file path - signed URLs will be generated on demand for playback
      return fileName;
    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload audio file';
      throw new Error(errorMessage);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive",
      });
      return;
    }
    
    setAudioFile(file);
  };

  const removeAudioFile = () => {
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFreeSubmit = async () => {
    // Upload audio file if present
    const audioFileUrl = await uploadAudioFile();
    
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
      audio_file_url: audioFileUrl,
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
    // No longer require song URL - can skip with just audio file
    setShowPriorityDialog(true);
  };


  // Handle paid submission via Stripe
  const handlePaidSubmit = async () => {
    // Artist name and song title are required
    if (!artistName.trim() || !songTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both artist name and song title.",
        variant: "destructive",
      });
      return;
    }
    
    // Either song URL or audio file is required
    if (!songUrl && !audioFile) {
      toast({
        title: "Missing information",
        description: "Please enter a song link or upload an audio file.",
        variant: "destructive",
      });
      return;
    }

    // Admin bypass - submit for free
    if (isAdmin) {
      setIsSubmitting(true);
      try {
        await handleFreeSubmit();
        play('success');
        toast({
          title: "Song submitted! 🎵",
          description: "Admin bypass: No payment required",
        });
        watchlistRef?.current?.refreshList();
        resetForm();
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
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-submission-payment', {
        body: {
          amount: submissionPrice,
          songUrl,
          artistName: artistName || 'Unknown Artist',
          songTitle: songTitle || 'Untitled',
          message,
          email: user?.email || email,
          platform: platform || 'other',
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to create checkout session');

      play('click');
      window.location.href = data.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process payment';
      toast({
        title: "Payment failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSongUrl('');
    setArtistName('');
    setSongTitle('');
    setEmail('');
    setMessage('');
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Artist name and song title are required
    if (!artistName.trim() || !songTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both artist name and song title.",
        variant: "destructive",
      });
      return;
    }
    
    // Either song URL or audio file is required
    if (!songUrl && !audioFile) {
      toast({
        title: "Missing information",
        description: "Please enter a song link or upload an audio file.",
        variant: "destructive",
      });
      return;
    }
    if (submissionPaid && !isAdmin) {
      await handlePaidSubmit();
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
      
      resetForm();
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
            className={`rounded-xl p-4 md:p-6 space-y-4 bg-card/50 border border-border/50 relative ${
              !submissionsOpen ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {/* Submissions Closed Overlay */}
            {!submissionsOpen && (
              <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl bg-background/80 backdrop-blur-sm">
                <div className="text-center p-6">
                  <Ban className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-1">Submissions Closed</h3>
                  <p className="text-sm text-muted-foreground">
                    New submissions are temporarily disabled. Check back soon!
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-primary" />
              <h2 className="text-base font-display font-semibold">{t('submission.title')}</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('submission.linkLabel')}
                </label>
                <Input
                  placeholder={t('submission.linkPlaceholder')}
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
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {t('submission.artistLabel')} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder={t('submission.artistPlaceholder')}
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="h-10 text-sm bg-background/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {t('submission.titleLabel')} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder={t('submission.titlePlaceholder')}
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    className="h-10 text-sm bg-background/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">{t('submission.emailLabel')}</label>
                <Input
                  type="email"
                  placeholder={t('submission.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-sm bg-background/50"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">{t('submission.messageLabel')}</label>
                <Textarea
                  placeholder={t('submission.messagePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[80px] text-sm resize-none bg-background/50"
                />
              </div>

              {/* Audio File Upload */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('submission.audioFileLabel')} (max 100MB)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="audio-file-input"
                />
                {audioFile ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <Music2 className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{audioFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeAudioFile}
                      className="shrink-0 h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 text-sm border-dashed"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {t('submission.uploadFile')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Submit Buttons - Stacked on mobile */}
          <div className="flex flex-col gap-2">
            {/* Free/Default Submit Button - Dark style */}
            <Button
              type="submit"
              size="lg"
              variant={submissionPaid && !isAdmin ? "default" : "secondary"}
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {submissionPaid && !isAdmin ? 'Processing...' : 'Submitting...'}
                </>
              ) : submissionPaid && !isAdmin ? (
                <>
                  <DollarSign className="w-4 h-4" />
                  Submit (€{submissionPrice.toFixed(2)})
                </>
              ) : isAdmin && submissionPaid ? (
                <>
                  <Shield className="w-4 h-4" />
                  {t('submission.submitAdminFree')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('submission.submitFree')}
                </>
              )}
            </Button>

            {/* Skip Line Button - Bright/Primary style */}
            {skipLineActive && (
              <Button
                type="button"
                onClick={handleSkipTheLine}
                variant="hero"
                size="lg"
                className="w-full"
              >
                <Zap className="w-4 h-4" />
                {t('submission.skipWaitingList')}
              </Button>
            )}
          </div>
        </form>
      </motion.div>

      {/* Spot Bidding Dialog */}
      <SpotBiddingDialog
        open={showPriorityDialog}
        onOpenChange={setShowPriorityDialog}
        songUrl={songUrl}
        artistName={artistName || 'Unknown Artist'}
        songTitle={songTitle || 'Untitled'}
        message={message}
        email={user?.email || email}
        platform={platform || 'other'}
        onSuccess={() => {
          watchlistRef?.current?.refreshList();
          resetForm();
        }}
      />
    </>
  );
}
