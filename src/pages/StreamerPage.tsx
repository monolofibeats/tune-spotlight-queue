import { useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { StreamerProvider, useStreamer } from '@/hooks/useStreamer';
import { StreamerThemeProvider } from '@/components/StreamerThemeProvider';
import { StreamerAnnouncementBanner } from '@/components/StreamerAnnouncementBanner';
import { Header } from '@/components/Header';
import { SubmissionForm } from '@/components/SubmissionForm';
import { SubmissionTracker } from '@/components/SubmissionTracker';
import { StreamEmbed } from '@/components/StreamEmbed';
import { SpecialEventBanner } from '@/components/SpecialEventBanner';
import { HowItWorks } from '@/components/HowItWorks';
import { PreStreamSpots } from '@/components/PreStreamSpots';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Footer } from '@/components/Footer';
import { useStreamSession } from '@/hooks/useStreamSession';
import { useLanguage } from '@/hooks/useLanguage';
import { useTrackedSubmission } from '@/hooks/useTrackedSubmission';

function StreamerPageContent() {
  const { streamer, isLoading, error } = useStreamer();
  const { isLive } = useStreamSession();
  const { t } = useLanguage();
  const { currentSubmission, trackSubmission, clearSubmission } = useTrackedSubmission(null);

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

  const isStreamerLive = streamer.is_live || isLive;

  return (
    <StreamerThemeProvider streamer={streamer}>
      <div className="min-h-screen bg-background relative">
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
              {streamer.hero_title || 'Submit Your Music'}{' '}
              <span className={isStreamerLive ? 'text-primary' : 'text-muted-foreground'}>
                {streamer.display_name}
              </span>
            </h1>
            
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              {streamer.hero_subtitle || t('hero.subtitle')}
            </p>

            {streamer.welcome_message && (
              <p className="mt-4 text-sm text-muted-foreground/80 italic max-w-lg mx-auto">
                "{streamer.welcome_message}"
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Main Content - Submission Form */}
      <section className="pb-8 px-4">
        <div className="container mx-auto max-w-xl">
          <SubmissionForm streamerId={streamer.id} streamerSlug={streamer.slug} />
        </div>
      </section>

      {/* How It Works - Conditional */}
      {streamer.show_how_it_works && <HowItWorks />}

      {/* Pre-Stream Spots - Only visible when NOT live */}
      {!isStreamerLive && (
        <section className="px-4 pb-6">
          <div className="container mx-auto max-w-3xl">
            <PreStreamSpots />
          </div>
        </section>
      )}

      {/* Special Event Banner */}
      <section className="px-4 pb-6">
        <div className="container mx-auto max-w-3xl">
          <SpecialEventBanner />
        </div>
      </section>

      {/* Stream Section - Conditional */}
      {streamer.show_stream_embed && (
        <section className="pb-8 px-4">
          <div className="container mx-auto max-w-3xl">
            <StreamEmbed />
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
  const reservedRoutes = ['library', 'auth', 'dashboard', 'my-dashboard', 'imprint', 'admin'];
  
  if (!slug || reservedRoutes.includes(slug)) {
    return <Navigate to="/" replace />;
  }

  return (
    <StreamerProvider slug={slug}>
      <StreamerPageContent />
    </StreamerProvider>
  );
}
