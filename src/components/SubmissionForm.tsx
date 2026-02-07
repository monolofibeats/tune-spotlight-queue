import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, Loader2, DollarSign, Zap, Shield, Ban, Upload, X, Music2, Check } from 'lucide-react';
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
import { parseUrlMetadata, parseFilename } from '@/lib/songMetadataParser';

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
  streamerId?: string;
}

interface FlyingCard {
  id: string;
  songTitle: string;
  artistName: string;
  isPriority: boolean;
  amount: number;
}

export function SubmissionForm({ watchlistRef, streamerId }: SubmissionFormProps) {
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
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
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

  const autofillFromSpotify = async (url: string) => {
    // Browser fetch to Spotify pages is often blocked by CORS; use backend function instead.
    if (!url.includes('spotify.com') || !url.includes('/track/')) return;

    try {
      const { data, error } = await supabase.functions.invoke('fetch-spotify-metadata', {
        body: { url },
      });
      if (error) return;

      const meta = data as { songTitle?: string; artistName?: string } | null;
      if (!meta) return;

      if (meta.artistName && !artistName.trim()) {
        setArtistName(meta.artistName);
      }
      if (meta.songTitle && !songTitle.trim()) {
        setSongTitle(meta.songTitle);
      }
    } catch {
      // Ignore autofill errors (user can always type manually)
    }
  };

  // Determine which field is the "next" one to fill (for progressive glow)
  // Order: 0=link/file, 1=file (if no link), 2=artistName, 3=songTitle
  const getFieldCompletionStep = (): number => {
    const hasLinkOrFile = songUrl.trim() || audioFile;
    if (!hasLinkOrFile) return 0; // Focus on link
    if (!songUrl.trim() && !audioFile) return 1; // Focus on file upload
    if (!artistName.trim()) return 2; // Focus on artist name
    if (!songTitle.trim()) return 3; // Focus on song title
    return 4; // All done
  };

  const currentStep = getFieldCompletionStep();

  // Track which fields have shown their completion tick (to prevent re-animation)
  const [shownTicks, setShownTicks] = useState<Set<number>>(new Set());

  // Check if a specific field is completed
  const isFieldCompleted = (fieldStep: number): boolean => {
    return (fieldStep === 0 && songUrl.trim() !== '') || 
      (fieldStep === 1 && audioFile !== null) ||
      (fieldStep === 2 && artistName.trim() !== '') ||
      (fieldStep === 3 && songTitle.trim() !== '');
  };

  // Track when fields become completed to show tick only once
  useEffect(() => {
    [0, 1, 2, 3].forEach((step) => {
      const completed = isFieldCompleted(step);
      if (completed && !shownTicks.has(step)) {
        setShownTicks(prev => new Set(prev).add(step));
      } else if (!completed && shownTicks.has(step)) {
        // Remove from set if field is cleared
        setShownTicks(prev => {
          const newSet = new Set(prev);
          newSet.delete(step);
          return newSet;
        });
      }
    });
  }, [songUrl, audioFile, artistName, songTitle]);

  // Get glow class for a field based on whether it's the next one to fill
  const getFieldGlowClass = (fieldStep: number): string => {
    if (isFieldCompleted(fieldStep)) {
      return 'field-glow field-glow-completed';
    }

    // The current step gets the bright glow
    if (fieldStep === currentStep) {
      return 'field-glow field-glow-active';
    }

    // Future steps get a subtle pulse
    if (fieldStep > currentStep) {
      return 'field-glow field-glow-pending';
    }

    // Past steps: keep animation running but invisible (prevents future desync)
    return 'field-glow';
  };

  // Completion tick component - only animates when first added to shownTicks
  const CompletionTick = ({ fieldStep }: { fieldStep: number }) => {
    const isCompleted = isFieldCompleted(fieldStep);
    const hasBeenShown = shownTicks.has(fieldStep);
    
    return (
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            key={`tick-${fieldStep}`}
            initial={hasBeenShown ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center z-10 shadow-lg shadow-emerald-500/30"
          >
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

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
    
    // Auto-fill artist and song title from filename
    const metadata = parseFilename(file.name);
    if (metadata.artistName && !artistName.trim()) {
      setArtistName(metadata.artistName);
    }
    if (metadata.songTitle && !songTitle.trim()) {
      setSongTitle(metadata.songTitle);
    }
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
      streamer_id: streamerId || null,
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

  const handleSkipTheLine = async () => {
    // Upload audio file first if present (before opening dialog)
    if (audioFile && !uploadedAudioUrl) {
      try {
        const url = await uploadAudioFile();
        setUploadedAudioUrl(url);
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Failed to upload audio file",
          variant: "destructive",
        });
        return;
      }
    }
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
      // Upload audio file FIRST before redirecting to Stripe
      const audioFileUrl = await uploadAudioFile();
      
      const { data, error } = await supabase.functions.invoke('create-submission-payment', {
        body: {
          amount: submissionPrice,
          songUrl: songUrl || 'direct-upload',
          artistName: artistName || 'Unknown Artist',
          songTitle: songTitle || 'Untitled',
          message,
          email: user?.email || email,
          platform: platform || 'other',
          audioFileUrl, // Pass the uploaded file path
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
    setUploadedAudioUrl(null);
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
            className={`field-glow-sync rounded-xl p-4 md:p-6 space-y-4 bg-card/50 border border-border/50 relative ${
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
              {/* Input method toggle hint */}
              {!songUrl && !audioFile && (
                <p className="text-xs text-muted-foreground text-center">
                  Provide a music link <span className="font-semibold">or</span> upload an audio file
                </p>
              )}

              {/* Step 1: Music Link - stays mounted (so glow rhythm stays globally in sync) */}
              <motion.div
                initial={false}
                animate={
                  audioFile
                    ? { opacity: 0, height: 0, marginTop: 0, pointerEvents: 'none' }
                    : { opacity: 1, height: 'auto', marginTop: 0, pointerEvents: 'auto' }
                }
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
                aria-hidden={!!audioFile}
              >
                <div className={`relative ${getFieldGlowClass(0)}`}>
                  <CompletionTick fieldStep={0} />
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {t('submission.linkLabel')} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder={t('submission.linkPlaceholder')}
                    value={songUrl}
                    onChange={(e) => {
                      const url = e.target.value;
                      setSongUrl(url);

                      // Non-Spotify: best-effort sync parsing
                      if (url.includes('http') && !url.includes('spotify.com')) {
                        const metadata = parseUrlMetadata(url);
                        if (metadata.artistName && !artistName.trim()) {
                          setArtistName(metadata.artistName);
                        }
                        if (metadata.songTitle && !songTitle.trim()) {
                          setSongTitle(metadata.songTitle);
                        }
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (!pasted || !pasted.includes('http')) return;

                      // Replace whatever was in the input with the pasted URL (more reliable)
                      e.preventDefault();
                      setSongUrl(pasted);

                      if (pasted.includes('spotify.com')) {
                        void autofillFromSpotify(pasted);
                        return;
                      }

                      const metadata = parseUrlMetadata(pasted);
                      if (metadata.artistName && !artistName.trim()) {
                        setArtistName(metadata.artistName);
                      }
                      if (metadata.songTitle && !songTitle.trim()) {
                        setSongTitle(metadata.songTitle);
                      }
                    }}
                    onBlur={() => {
                      if (songUrl.includes('spotify.com')) {
                        void autofillFromSpotify(songUrl);
                      }
                    }}
                    className="h-10 text-sm bg-background/50"
                  />
                  {platform && (
                    <div className="mt-1.5">
                      <Badge variant="platform" className="text-xs">
                        {platform === 'apple-music' ? 'Apple Music' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Step 2: Audio File Upload - stays mounted (so glow rhythm stays globally in sync) */}
              <motion.div
                initial={false}
                animate={
                  songUrl
                    ? { opacity: 0, height: 0, marginTop: 0, pointerEvents: 'none' }
                    : { opacity: 1, height: 'auto', marginTop: 0, pointerEvents: 'auto' }
                }
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
                aria-hidden={!!songUrl}
              >
                <div className={`relative ${getFieldGlowClass(1)}`}>
                  <CompletionTick fieldStep={1} />
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {t('submission.audioFileLabel')} (max 100MB) <span className="text-destructive">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="audio-file-input"
                  />
                  {audioFile ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <Music2 className="w-5 h-5 text-emerald-500 shrink-0" />
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
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-10 text-sm border border-dashed border-border/50 bg-transparent hover:bg-transparent hover:border-border transition-all duration-200 hover:scale-[1.01] group"
                    >
                      <Upload className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                      <span className="transition-transform duration-200 group-hover:scale-105">{t('submission.uploadFile')}</span>
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* Show selected input method indicator when one is chosen */}
              <AnimatePresence>
                {(songUrl || audioFile) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    {songUrl && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Using link</span>
                        <button
                          type="button"
                          onClick={() => setSongUrl('')}
                          className="text-primary hover:text-primary/80 underline"
                        >
                          Switch to file upload
                        </button>
                      </div>
                    )}
                    {audioFile && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Using file: <span className="font-medium text-foreground">{audioFile.name}</span></span>
                        <button
                          type="button"
                          onClick={removeAudioFile}
                          className="text-primary hover:text-primary/80 underline"
                        >
                          Switch to link
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 3 & 4: Artist Name and Song Title */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`relative ${getFieldGlowClass(2)}`}>
                  <CompletionTick fieldStep={2} />
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
                <div className={`relative ${getFieldGlowClass(3)}`}>
                  <CompletionTick fieldStep={3} />
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

              {/* Optional: Email */}
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

              {/* Optional: Message */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">{t('submission.messageLabel')}</label>
                <Textarea
                  placeholder={t('submission.messagePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[80px] text-sm resize-none bg-background/50"
                />
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
        audioFileUrl={uploadedAudioUrl}
        onSuccess={() => {
          watchlistRef?.current?.refreshList();
          resetForm();
        }}
      />
    </>
  );
}
