import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, AlertCircle, TrendingUp, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { OutbidCounterDialog } from '@/components/OutbidCounterDialog';
import { supabase } from '@/integrations/supabase/client';
import { StreamerProvider, useStreamer } from '@/hooks/useStreamer';
import { StreamSessionProvider, useStreamSession } from '@/hooks/useStreamSession';
import { sanitizeCSS } from '@/lib/sanitizeCSS';
import { StreamerThemeProvider } from '@/components/StreamerThemeProvider';
import { StreamerAnnouncementBanner } from '@/components/StreamerAnnouncementBanner';
import { Header } from '@/components/Header';
import { SubmissionForm } from '@/components/SubmissionForm';
import { SubmissionTracker } from '@/components/SubmissionTracker';
import { TopSongsPublicDisplay } from '@/components/TopSongsPublicDisplay';
import { StreamEmbed } from '@/components/StreamEmbed';
import { SpecialEventBanner } from '@/components/SpecialEventBanner';
import { HowItWorks } from '@/components/HowItWorks';
import { StreamerDashboardAccessButton } from '@/components/StreamerDashboardAccessButton';
import { PreStreamSpots } from '@/components/PreStreamSpots';
import { PublicQueueDisplay } from '@/components/PublicQueueDisplay';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Footer } from '@/components/Footer';
import { StarTrailLeaderboard } from '@/components/games/StarTrailLeaderboard';

import { useLanguage } from '@/hooks/useLanguage';
import { useTrackedSubmission } from '@/hooks/useTrackedSubmission';


function StreamerPageContent() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { streamer, isLoading, error } = useStreamer();
  const { t } = useLanguage();
  const { currentSubmissions, trackSubmission, clearSubmission } = useTrackedSubmission(slug || null);

  // useStreamSession is provided by StreamSessionProvider scoped to this streamer in StreamerPage
  const { isLive } = useStreamSession();

  // Handle ?outbid= query param from email magic links
  const outbidSubmissionId = searchParams.get('outbid');
  const bidPaymentStatus = searchParams.get('bid_payment');
  const [outbidInfo, setOutbidInfo] = useState<{ songTitle: string; artistName: string; suggestedAmountCents: number; submissionId: string } | null>(null);
  const [showOutbidBanner, setShowOutbidBanner] = useState(false);
  const [showOutbidDialog, setShowOutbidDialog] = useState(false);

  // Handle bid payment success redirect
  useEffect(() => {
    if (bidPaymentStatus === 'success') {
      const bidSessionId = searchParams.get('session_id');
      
      // Verify the bid payment
      if (bidSessionId) {
        supabase.functions.invoke('verify-bid-payment', {
          body: { sessionId: bidSessionId },
        }).then(({ data }) => {
          if (data?.success) {
            toast({
              title: '🎉 Bid successful!',
              description: data.message || 'Your song has been boosted in the queue.',
            });
          }
        }).catch(() => {
          // Webhook will handle it as fallback
          toast({
            title: '🎉 Bid successful!',
            description: 'Your song has been boosted in the queue.',
          });
        });
      } else {
        toast({
          title: '🎉 Bid successful!',
          description: 'Your song has been boosted in the queue.',
        });
      }
      
      searchParams.delete('bid_payment');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
    } else if (bidPaymentStatus === 'cancelled') {
      toast({
        title: 'Bid cancelled',
        description: 'Your bid was not placed.',
        variant: 'destructive',
      });
      searchParams.delete('bid_payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [bidPaymentStatus]);

  useEffect(() => {
    if (!outbidSubmissionId) return;
    
    const fetchOutbidInfo = async () => {
      const { data: sub } = await supabase
        .from('submissions')
        .select('song_title, artist_name')
        .eq('id', outbidSubmissionId)
        .maybeSingle();

      const { data: notif } = await supabase
        .from('bid_notifications')
        .select('offer_amount_cents')
        .eq('submission_id', outbidSubmissionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        const amountCents = notif?.offer_amount_cents || 200;
        setOutbidInfo({
          songTitle: sub.song_title,
          artistName: sub.artist_name,
          suggestedAmountCents: amountCents,
          submissionId: outbidSubmissionId!,
        });
        setShowOutbidBanner(true);
      }

      // Clean up URL
      searchParams.delete('outbid');
      setSearchParams(searchParams, { replace: true });
    };

    fetchOutbidInfo();
  }, [outbidSubmissionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !streamer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Streamer Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This streamer profile doesn't exist or hasn't been approved yet.
          </p>
          <a href="/" className="text-primary hover:underline">
            Browse all streamers →
          </a>
        </div>
      </div>
    );
  }

  // isLive is already scoped to this streamer's sessions via StreamSessionProvider
  const isStreamerLive = isLive;

  return (
    <StreamerThemeProvider streamer={streamer}>
      <div className="min-h-screen relative">
        {/* Background layer — gradient at low opacity, image with blur */}
        {streamer.background_type === 'gradient' && streamer.background_gradient && (
          <div
            className="fixed inset-0 -z-10 pointer-events-none"
            style={{ background: streamer.background_gradient, opacity: 0.28 }}
          />
        )}
        {streamer.background_type === 'image' && streamer.background_image_url && (
          <div
            className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
          >
            <div
              className="absolute inset-[-20px]"
              style={{
                backgroundImage: `url(${streamer.background_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(10px)',
                opacity: 0.55,
              }}
            />
          </div>
        )}
        {/* Streamer Announcement Banner - at very top */}
        <StreamerAnnouncementBanner streamer={streamer} />
        
        <Header />
      
      {/* Streamer Banner */}
      {streamer.banner_url && (
        <div className="w-full h-32 md:h-48 relative overflow-hidden">
          <img
            src={streamer.banner_url}
            alt={`${streamer.display_name} banner`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      {/* Hero Section */}
      <section className={`${streamer.banner_url ? 'pt-6' : 'pt-24'} pb-6 md:pb-8 px-4`}>
        <div className="container mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Streamer Avatar */}
            <div className="flex justify-center mb-4">
              {streamer.avatar_url ? (
                <img
                  src={streamer.avatar_url}
                  alt={streamer.display_name}
                  className="w-20 h-20 rounded-full border-4 border-background shadow-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-background shadow-lg bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {streamer.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card/30 mb-4 ${isStreamerLive ? 'pulse-glow' : ''}`}>
              <Sparkles className={`w-3 h-3 ${isStreamerLive ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
              <span className="text-xs font-medium text-muted-foreground">
                {isStreamerLive ? t('hero.badge.live') : t('hero.badge.offline')}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-3 leading-tight">
              {streamer.hero_title || 'Submit Your Music'}
            </h1>
            
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              {streamer.hero_subtitle || t('hero.subtitle')}
            </p>

            <div className="mt-4">
              <StreamerDashboardAccessButton streamerId={streamer.id} streamerUserId={streamer.user_id} streamerSlug={streamer.slug} />
            </div>

            {streamer.welcome_message && (
              <p className="mt-4 text-sm text-muted-foreground/80 italic max-w-lg mx-auto">
                "{streamer.welcome_message}"
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Outbid Banner */}
      <AnimatePresence>
        {showOutbidBanner && outbidInfo && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pb-4 px-4"
          >
            <div className="container mx-auto max-w-xl">
              <div className="relative rounded-xl border border-primary/30 bg-primary/5 p-5">
                <button
                  onClick={() => setShowOutbidBanner(false)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">You've been outbid!</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Someone placed a higher bid on <strong className="text-foreground">"{outbidInfo.songTitle}"</strong> by {outbidInfo.artistName}. 
                      Bid <strong className="text-primary">€{(outbidInfo.suggestedAmountCents / 100).toFixed(2)}</strong> or more to reclaim your spot.
                    </p>
                    <Button
                      size="sm"
                      variant="hero"
                      onClick={() => setShowOutbidDialog(true)}
                    >
                      Place Higher Bid →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Outbid Counter Dialog */}
      {outbidInfo && (
        <OutbidCounterDialog
          open={showOutbidDialog}
          onOpenChange={setShowOutbidDialog}
          submissionId={outbidInfo.submissionId}
          songTitle={outbidInfo.songTitle}
          artistName={outbidInfo.artistName}
          suggestedAmountCents={outbidInfo.suggestedAmountCents}
          streamerSlug={streamer?.slug}
        />
      )}

      {/* How It Works - between hero and form */}
      {(streamer.show_how_it_works ?? true) && (
        <section className="pb-4 px-4">
          <div className="container mx-auto max-w-3xl">
            <HowItWorks compact />
          </div>
        </section>
      )}

      {/* Main Content - Submission Form */}
      <section className="pb-4 px-4">
        <div className="container mx-auto max-w-xl">
          <SubmissionForm
            streamerId={streamer.id}
            streamerSlug={streamer.slug}
            onSubmissionTracked={(sub) => trackSubmission(sub)}
          />
        </div>
      </section>

      {/* Top Songs Pedestal - below form when public */}
      {!!streamer.show_top_songs && (
        <section className="pb-4 px-4">
          <div className="container mx-auto max-w-xl">
            <TopSongsPublicDisplay streamerId={streamer.id} showTopSongs={true} topSongsMessage={streamer.top_songs_message} />
          </div>
        </section>
      )}

      {/* Public Waiting List */}
      {(streamer as any).show_public_queue !== false && (
        <section className="pb-4 px-4">
          <div className="container mx-auto max-w-xl">
            <PublicQueueDisplay
              streamerId={streamer.id}
              streamerSlug={streamer.slug}
              trackedSubmissions={currentSubmissions}
            />
          </div>
        </section>
      )}

      {/* Stream Embed (looping video, Twitch, YouTube etc.) */}
      {(streamer.show_stream_embed ?? true) && (
        <section className="pb-4 px-4">
          <div className="container mx-auto max-w-3xl">
            <StreamEmbed streamerId={streamer.id} />
          </div>
        </section>
      )}

      {/* Star Trail Leaderboard */}
      <section className="pb-4 px-4">
        <div className="container mx-auto max-w-xl">
          <StarTrailLeaderboard streamerId={streamer.id} />
        </div>
      </section>

      {/* Tracked Submissions - below the form */}
      {currentSubmissions.length > 0 && (
        <section className="pb-8 px-4">
          <div className="container mx-auto max-w-xl">
            <SubmissionTracker submissions={currentSubmissions} onDismiss={(trackedAt) => clearSubmission(slug || null, trackedAt)} />
          </div>
        </section>
      )}

      <LanguageSwitcher />
      <Footer />

        {/* Custom CSS */}
        {streamer.custom_css && (
          <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(streamer.custom_css) }} />
        )}
      </div>
    </StreamerThemeProvider>
  );
}

export default function StreamerPage() {
  const { slug } = useParams<{ slug: string }>();

  // List of reserved routes that shouldn't be treated as streamer slugs
  const reservedRoutes = ['library', 'auth', 'dashboard', 'user', 'imprint', 'admin'];
  
  if (!slug || reservedRoutes.includes(slug)) {
    return <Navigate to="/" replace />;
  }

  return (
    <StreamerProvider slug={slug}>
      <StreamerPageWithSession slug={slug} />
    </StreamerProvider>
  );
}

// Inner wrapper that reads the streamer ID to scope the session provider
function StreamerPageWithSession({ slug }: { slug: string }) {
  const { streamer } = useStreamer();
  return (
    <StreamSessionProvider streamerId={streamer?.id}>
      <StreamerPageContent />
    </StreamSessionProvider>
  );
}
