import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { SubmissionForm } from '@/components/SubmissionForm';
import { WatchlistDisplay, WatchlistRef } from '@/components/WatchlistDisplay';
import { StreamEmbed } from '@/components/StreamEmbed';
import { SpecialEventBanner } from '@/components/SpecialEventBanner';
import { HowItWorks } from '@/components/HowItWorks';
import { Sparkles } from 'lucide-react';

const Index = () => {
  const watchlistRef = useRef<WatchlistRef>(null);

  return (
    <div className="min-h-screen bg-background relative">
      <Header />
      
      {/* Hero Section - Minimal */}
      <section className="pt-24 pb-8 md:pt-32 md:pb-12 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card/30 mb-4">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Live Music Reviews</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-3 leading-tight">
              Get Your Music{' '}
              <span className="text-primary">Heard</span>
            </h1>
            
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              Submit songs for live reviews. No sign-up required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Special Event Banner */}
      <section className="px-4 pb-6">
        <div className="container mx-auto max-w-3xl">
          <SpecialEventBanner />
        </div>
      </section>

      {/* Stream Section */}
      <section className="pb-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <StreamEmbed />
        </div>
      </section>

      {/* Main Content - Stacked on mobile */}
      <section className="pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Submission Form */}
            <div>
              <SubmissionForm watchlistRef={watchlistRef} />
            </div>

            {/* Watchlist Display */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <WatchlistDisplay ref={watchlistRef} />
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-border/30 py-6 px-4">
        <div className="container mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 UpStar ⭐
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
