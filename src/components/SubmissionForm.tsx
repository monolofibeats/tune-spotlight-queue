import { useState, useRef, useEffect, useMemo } from 'react';
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
import { useStreamerFormFields } from '@/hooks/useStreamerFormFields';
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
  streamerSlug?: string;
  onSubmissionTracked?: (sub: { songTitle: string; artistName: string; songUrl: string; platform: string; audioFileUrl: string | null; streamerId: string | null; streamerSlug: string | null }) => void;
}

interface FlyingCard {
  id: string;
  songTitle: string;
  artistName: string;
  isPriority: boolean;
  amount: number;
}

export function SubmissionForm({ watchlistRef, streamerId, streamerSlug, onSubmissionTracked }: SubmissionFormProps) {
  const { user: authUser, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { isActive: skipLineActive } = usePricingConfig('skip_line');
  const { 
    minAmount: submissionPrice, 
    isActive: submissionPaid,
  } = usePricingConfig('submission');
  const { isActive: submissionsOpen } = usePricingConfig('submissions_open');

  const { fields: streamerFormFields } = useStreamerFormFields(streamerId);

  const fieldConfig = useMemo(() => {
    const map = new Map<
      string,
      { label?: string; placeholder?: string; enabled: boolean; required: boolean }
    >();

    for (const f of streamerFormFields) {
      map.set(f.field_name, {
        label: f.field_label || undefined,
        placeholder: f.placeholder || undefined,
        enabled: f.is_enabled ?? true,
        required: f.is_required ?? false,
      });
    }

    return map;
  }, [streamerFormFields]);

  const getEnabled = (name: string, fallback: boolean) => fieldConfig.get(name)?.enabled ?? fallback;
  const getRequired = (name: string, fallback: boolean) => fieldConfig.get(name)?.required ?? fallback;
  const getLabel = (name: string, fallback: string) => fieldConfig.get(name)?.label || fallback;
  const getPlaceholder = (name: string, fallback: string) => fieldConfig.get(name)?.placeholder || fallback;

  const showSongUrl = getEnabled('song_url', true);
  const showArtist = getEnabled('artist_name', true);
  const showTitle = getEnabled('song_title', true);
  const showEmail = getEnabled('email', true);
  const showMessage = getEnabled('message', true);

  const requireArtist = showArtist && getRequired('artist_name', true);
  const requireTitle = showTitle && getRequired('song_title', true);
  const requireEmail = showEmail && getRequired('email', false);
  const requireMessage = showMessage && getRequired('message', false);

  const songUrlLabel = getLabel('song_url', t('submission.linkLabel'));
  const songUrlPlaceholder = getPlaceholder('song_url', t('submission.linkPlaceholder'));
  const artistLabel = getLabel('artist_name', t('submission.artistLabel'));
  const artistPlaceholder = getPlaceholder('artist_name', t('submission.artistPlaceholder'));
  const titleLabel = getLabel('song_title', t('submission.titleLabel'));
  const titlePlaceholder = getPlaceholder('song_title', t('submission.titlePlaceholder'));
  const emailLabel = getLabel('email', t('submission.emailLabel'));
  const emailPlaceholder = getPlaceholder('email', t('submission.emailPlaceholder'));
  const messageLabel = getLabel('message', t('submission.messageLabel'));
  const messagePlaceholder = getPlaceholder('message', t('submission.messagePlaceholder'));

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
  const [showPostSubmitOffer, setShowPostSubmitOffer] = useState(false);
  const [lastSubmittedSong, setLastSubmittedSong] = useState<{
    songUrl: string;
    artistName: string;
    songTitle: string;
    message: string;
    email: string;
    platform: string;
    audioFileUrl: string | null;
  } | null>(null);
  const [user, setUser] = useState<any>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Store the uploaded URL directly for immediate use (avoid React state timing issues)
  const uploadedAudioUrlRef = useRef<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!showSongUrl && songUrl) {
      setSongUrl('');
    }
  }, [showSongUrl, songUrl]);

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

  const isStepEnabled = (fieldStep: number) => {
    if (fieldStep === 0) return showSongUrl;
    if (fieldStep === 2) return showArtist;
    if (fieldStep === 3) return showTitle;
    return true; // file upload step always exists
  };

  // Determine which field is the "next" one to fill (for progressive glow)
  // Order: 0=link, 1=file, 2=artistName, 3=songTitle
  const getFieldCompletionStep = (): number => {
    const hasLinkOrFile = (showSongUrl && songUrl.trim()) || audioFile;

    if (!hasLinkOrFile) {
      return showSongUrl ? 0 : 1;
    }

    if (showArtist && !artistName.trim()) return 2;
    if (showTitle && !songTitle.trim()) return 3;

    return 4;
  };

  const currentStep = getFieldCompletionStep();

  // Track which fields have shown their completion tick (to prevent re-animation)
  const [shownTicks, setShownTicks] = useState<Set<number>>(new Set());

  // Check if a specific field is completed
  const isFieldCompleted = (fieldStep: number): boolean => {
    if (!isStepEnabled(fieldStep)) return false;

    return (fieldStep === 0 && songUrl.trim() !== '') || 
      (fieldStep === 1 && audioFile !== null) ||
      (fieldStep === 2 && artistName.trim() !== '') ||
      (fieldStep === 3 && songTitle.trim() !== '');
  };

  // Track when fields become completed to show tick only once
  useEffect(() => {
    [0, 1, 2, 3].forEach((step) => {
      if (!isStepEnabled(step)) return;

      const completed = isFieldCompleted(step);
      if (completed && !shownTicks.has(step)) {
        setShownTicks((prev) => new Set(prev).add(step));
      } else if (!completed && shownTicks.has(step)) {
        // Remove from set if field is cleared
        setShownTicks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(step);
          return newSet;
        });
      }
    });
  }, [songUrl, audioFile, artistName, songTitle, showSongUrl, showArtist, showTitle, shownTicks]);

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
    if (!isStepEnabled(fieldStep)) return null;

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

      // Get current path without query params for history replacement
      const currentPath = window.location.pathname;

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

        window.history.replaceState({}, '', currentPath);
      } else if (paymentStatus === 'cancelled') {
        toast({
          title: "Payment cancelled",
          description: "Your submission was not processed.",
          variant: "destructive",
        });
        window.history.replaceState({}, '', currentPath);
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

            // Track the paid submission in localStorage (same as free submissions)
            const pendingRaw = localStorage.getItem('upstar_pending_paid_submission');
            if (pendingRaw) {
              try {
                const pending = JSON.parse(pendingRaw);
                onSubmissionTracked?.({
                  songTitle: pending.songTitle,
                  artistName: pending.artistName,
                  songUrl: pending.songUrl,
                  platform: pending.platform,
                  audioFileUrl: pending.audioFileUrl,
                  streamerId: pending.streamerId,
                  streamerSlug: pending.streamerSlug,
                });
              } catch {}
              localStorage.removeItem('upstar_pending_paid_submission');
            }
          }
        } catch (error) {
          console.error('Submission payment verification error:', error);
        }

        window.history.replaceState({}, '', currentPath);
      } else if (submissionPayment === 'cancelled') {
        localStorage.removeItem('upstar_pending_paid_submission');
        toast({
          title: "Payment cancelled",
          description: "Your submission was not processed.",
          variant: "destructive",
        });
        window.history.replaceState({}, '', currentPath);
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
    
    // Store in ref immediately so it's available for post-submit offer
    if (audioFileUrl) {
      uploadedAudioUrlRef.current = audioFileUrl;
    }
    
    // Direct database insert for free submissions
    const { error } = await supabase.from('submissions').insert({
      song_url: songUrl || 'direct-upload',
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
    if (audioFile && !uploadedAudioUrl && !uploadedAudioUrlRef.current) {
      try {
        const url = await uploadAudioFile();
        uploadedAudioUrlRef.current = url;
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

  // Sync ref with state for cases where state is set elsewhere
  useEffect(() => {
    uploadedAudioUrlRef.current = uploadedAudioUrl;
  }, [uploadedAudioUrl]);


  // Handle paid submission via Stripe
  const handlePaidSubmit = async () => {
    // Required fields
    if ((requireArtist && !artistName.trim()) || (requireTitle && !songTitle.trim())) {
      toast({
        title: "Missing information",
        description: "Please fill out the required fields.",
        variant: "destructive",
      });
      return;
    }

    if ((requireEmail && !email.trim()) || (requireMessage && !message.trim())) {
      toast({
        title: "Missing information",
        description: "Please fill out the required fields.",
        variant: "destructive",
      });
      return;
    }

    // Either song URL or audio file is required (depending on config)
    if ((showSongUrl && !songUrl && !audioFile) || (!showSongUrl && !audioFile)) {
      toast({
        title: "Missing information",
        description: showSongUrl
          ? "Please enter a song link or upload an audio file."
          : "Please upload an audio file.",
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

      // Save submission data to localStorage BEFORE Stripe redirect
      // so we can track it when the user returns
      const pendingData = {
        songTitle: songTitle || 'Untitled',
        artistName: artistName || 'Unknown Artist',
        songUrl: songUrl || 'direct-upload',
        platform: platform || 'other',
        audioFileUrl: audioFileUrl || null,
        streamerId: streamerId || null,
        streamerSlug: streamerSlug || null,
      };
      localStorage.setItem('upstar_pending_paid_submission', JSON.stringify(pendingData));
      
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
          streamerSlug: streamerSlug || null,
          streamerId: streamerId || null,
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
    uploadedAudioUrlRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Required fields
    if ((requireArtist && !artistName.trim()) || (requireTitle && !songTitle.trim())) {
      toast({
        title: "Missing information",
        description: "Please fill out the required fields.",
        variant: "destructive",
      });
      return;
    }

    if ((requireEmail && !email.trim()) || (requireMessage && !message.trim())) {
      toast({
        title: "Missing information",
        description: "Please fill out the required fields.",
        variant: "destructive",
      });
      return;
    }

    // Either song URL or audio file is required (depending on config)
    if ((showSongUrl && !songUrl && !audioFile) || (!showSongUrl && !audioFile)) {
      toast({
        title: "Missing information",
        description: showSongUrl
          ? "Please enter a song link or upload an audio file."
          : "Please upload an audio file.",
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
      
      // Capture form data BEFORE reset (but audio URL comes from handleFreeSubmit)
      const capturedSongUrl = songUrl || 'direct-upload';
      const capturedArtistName = cardData.artistName;
      const capturedSongTitle = cardData.songTitle;
      const capturedMessage = message || '';
      const capturedEmail = email || '';
      const capturedPlatform = platform || 'other';

      // handleFreeSubmit uploads the file and returns the URL via uploadedAudioUrlRef
      await handleFreeSubmit();
      
      // NOW capture the uploaded audio URL (after handleFreeSubmit has uploaded it)
      const uploadedFileUrl = uploadedAudioUrlRef.current;
      
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

      // Track submission in localStorage for upsell
      onSubmissionTracked?.({
        songTitle: capturedSongTitle,
        artistName: capturedArtistName,
        songUrl: capturedSongUrl,
        platform: capturedPlatform,
        audioFileUrl: uploadedFileUrl,
        streamerId: streamerId || null,
        streamerSlug: streamerSlug || null,
      });

      // Show skip the line offer after successful free submission (if feature is active)
      if (skipLineActive && !isAdmin) {
        setLastSubmittedSong({
          songUrl: capturedSongUrl,
          artistName: capturedArtistName,
          songTitle: capturedSongTitle,
          message: capturedMessage,
          email: capturedEmail,
          platform: capturedPlatform,
          audioFileUrl: uploadedFileUrl,
        });
        setTimeout(() => {
          setShowPostSubmitOffer(true);
        }, 1000);
      }
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
                  {showSongUrl ? (
                    <>
                      Provide a music link <span className="font-semibold">or</span> upload an audio file
                    </>
                  ) : (
                    <>Upload an audio file</>
                  )}
                </p>
              )}

              {/* Step 1: Music Link */}
              {showSongUrl && (
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
                      {songUrlLabel} {(showSongUrl ? <span className="text-destructive">*</span> : null)}
                    </label>
                    <Input
                      placeholder={songUrlPlaceholder}
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
              )}

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


              {/* Artist + Title */}
              {(showArtist || showTitle) && (
                <div className={`grid grid-cols-1 ${showArtist && showTitle ? 'md:grid-cols-2' : ''} gap-3`}>
                  {showArtist && (
                    <div className={`relative ${getFieldGlowClass(2)}`}>
                      <CompletionTick fieldStep={2} />
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        {artistLabel} {requireArtist && <span className="text-destructive">*</span>}
                      </label>
                      <Input
                        placeholder={artistPlaceholder}
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        className="h-10 text-sm bg-background/50"
                        required={requireArtist}
                      />
                    </div>
                  )}

                  {showTitle && (
                    <div className={`relative ${getFieldGlowClass(3)}`}>
                      <CompletionTick fieldStep={3} />
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        {titleLabel} {requireTitle && <span className="text-destructive">*</span>}
                      </label>
                      <Input
                        placeholder={titlePlaceholder}
                        value={songTitle}
                        onChange={(e) => setSongTitle(e.target.value)}
                        className="h-10 text-sm bg-background/50"
                        required={requireTitle}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Optional: Email */}
              {showEmail && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {emailLabel} {requireEmail && <span className="text-destructive">*</span>}
                  </label>
                  <Input
                    type="email"
                    placeholder={emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-sm bg-background/50"
                    required={requireEmail}
                  />
                </div>
              )}

              {/* Optional: Message */}
              {showMessage && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {messageLabel} {requireMessage && <span className="text-destructive">*</span>}
                  </label>
                  <Textarea
                    placeholder={messagePlaceholder}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[80px] text-sm resize-none bg-background/50"
                    required={requireMessage}
                  />
                </div>
              )}
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
                disabled={isUploadingFile || isSubmitting}
              >
                {isUploadingFile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    {t('submission.skipWaitingList')}
                  </>
                )}
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
        audioFileUrl={uploadedAudioUrl || uploadedAudioUrlRef.current}
        streamerId={streamerId}
        streamerSlug={streamerSlug}
        onSuccess={() => {
          watchlistRef?.current?.refreshList();
          resetForm();
        }}
      />

      {/* Post-Submit Skip Line Offer Dialog */}
      {lastSubmittedSong && (
        <SpotBiddingDialog
          open={showPostSubmitOffer}
          onOpenChange={(open) => {
            setShowPostSubmitOffer(open);
            if (!open) {
              setLastSubmittedSong(null);
            }
          }}
          songUrl={lastSubmittedSong.songUrl}
          artistName={lastSubmittedSong.artistName}
          songTitle={lastSubmittedSong.songTitle}
          message={lastSubmittedSong.message}
          email={lastSubmittedSong.email}
          platform={lastSubmittedSong.platform}
          audioFileUrl={lastSubmittedSong.audioFileUrl}
          streamerId={streamerId}
          streamerSlug={streamerSlug}
          onSuccess={() => {
            watchlistRef?.current?.refreshList();
            setLastSubmittedSong(null);
          }}
        />
      )}
    </>
  );
}
