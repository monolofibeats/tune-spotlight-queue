import { useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { StreamerProvider, useStreamer } from '@/hooks/useStreamer';
import { StreamSessionProvider } from '@/hooks/useStreamSession';
import { StreamerThemeProvider } from '@/components/StreamerThemeProvider';
import { StreamerAnnouncementBanner } from '@/components/StreamerAnnouncementBanner';
import { Header } from '@/components/Header';
import { SubmissionForm } from '@/components/SubmissionForm';
import { SubmissionTracker } from '@/components/SubmissionTracker';
import { StreamEmbed } from '@/components/StreamEmbed';
import { SpecialEventBanner } from '@/components/SpecialEventBanner';
import { HowItWorks } from '@/components/HowItWorks';
import { StreamerDashboardAccessButton } from '@/components/StreamerDashboardAccessButton';
import { PreStreamSpots } from '@/components/PreStreamSpots';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Footer } from '@/components/Footer';
import { useStreamSession } from '@/hooks/useStreamSession';
import { useLanguage } from '@/hooks/useLanguage';
import { useTrackedSubmission } from '@/hooks/useTrackedSubmission';


function StreamerPageContent() {
  const { slug } = useParams<{ slug: string }>();
  const { streamer, isLoading, error } = useStreamer();
  const { t } = useLanguage();
  const { currentSubmissions, trackSubmission } = useTrackedSubmission(slug || null);

  // useStreamSession is provided by StreamSessionProvider scoped to this streamer in StreamerPage
  const { isLive } = useStreamSession();

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

      {/* Stream Embed (looping video, Twitch, YouTube etc.) - always shown if configured */}
      <section className="pb-4 px-4">
        <div className="container mx-auto max-w-3xl">
          <StreamEmbed streamerId={streamer.id} />
        </div>
      </section>

      {/* Tracked Submissions - below the form */}
      {currentSubmissions.length > 0 && (
        <section className="pb-8 px-4">
          <div className="container mx-auto max-w-xl">
            <SubmissionTracker submissions={currentSubmissions} />
          </div>
        </section>
      )}

      <LanguageSwitcher />
      <Footer />

        {/* Custom CSS */}
        {streamer.custom_css && (
          <style dangerouslySetInnerHTML={{ __html: streamer.custom_css }} />
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
