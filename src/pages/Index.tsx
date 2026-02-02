import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { SubmissionForm } from '@/components/SubmissionForm';
import { WatchlistDisplay, WatchlistRef } from '@/components/WatchlistDisplay';
import { mockSubmissions } from '@/lib/mockData';
import { Sparkles, Zap, Shield, Music } from 'lucide-react';

const features = [
  {
    icon: Music,
    title: 'Any Platform',
    description: 'Spotify, Apple Music, SoundCloud & more',
  },
  {
    icon: Zap,
    title: 'Instant Embed',
    description: 'Listen directly in the stream',
  },
  {
    icon: Sparkles,
    title: 'Priority Watchlist',
    description: 'Skip ahead for faster reviews',
  },
  {
    icon: Shield,
    title: 'No Sign-Up',
    description: 'Submit in seconds, no account needed',
  },
];

const Index = () => {
  const watchlistRef = useRef<WatchlistRef>(null);

  return (
    <div className="min-h-screen bg-background bg-mesh noise relative">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-12 md:pt-40 md:pb-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Live Music Reviews</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
              Get Your Music{' '}
              <span className="text-gradient">Heard & Reviewed</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Submit your songs for live reactions. No sign-up required. 
              Get honest feedback from creators and their communities.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="glass rounded-2xl p-4 text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
            {/* Submission Form */}
            <div className="flex-1 w-full">
              <SubmissionForm watchlistRef={watchlistRef} />
            </div>

            {/* Watchlist Display */}
            <div className="w-full lg:w-auto lg:sticky lg:top-24">
              <WatchlistDisplay ref={watchlistRef} submissions={mockSubmissions} />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2024 SongReact. Built for music lovers.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
