import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Radio, Users, Music, TrendingUp, ArrowRight, Sparkles, ChevronDown, ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActiveStreamers } from '@/hooks/useStreamer';
import { useLanguage } from '@/hooks/useLanguage';
import { Footer } from '@/components/Footer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StreamerApplicationForm } from '@/components/StreamerApplicationForm';
import { CursorFollower } from '@/components/discovery/CursorFollower';
import { InteractiveBackground } from '@/components/discovery/InteractiveBackground';
import { AnimatedCounter } from '@/components/discovery/AnimatedCounter';
import { GlowButton } from '@/components/discovery/GlowButton';
import { AnimatedCard } from '@/components/discovery/AnimatedCard';
import { BlurReveal, GlitchText } from '@/components/discovery/TextEffects';
import upstarLogo from '@/assets/upstar-logo.png';
import { useState } from 'react';

const Discovery = () => {
  const { streamers, isLoading } = useActiveStreamers();
  const { t } = useLanguage();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const { scrollYProgress } = useScroll();
  
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  const liveStreamers = streamers.filter(s => s.is_live);
  const offlineStreamers = streamers.filter(s => !s.is_live);

  const stats = [
    { label: 'Active Streamers', value: streamers.length, icon: Users },
    { label: 'Songs Reviewed', value: '10K+', icon: Music },
    { label: 'Live Now', value: liveStreamers.length, icon: Radio },
    { label: 'Weekly Views', value: '50K+', icon: TrendingUp },
  ];

  const faqs = [
    {
      question: 'What is UpStar?',
      answer: 'UpStar is a platform that connects music artists with streamers who review and react to songs live on stream. Get real-time feedback from content creators and their audiences.',
    },
    {
      question: 'How do I submit my music?',
      answer: 'Simply visit a streamer\'s page, paste your song link (Spotify, YouTube, SoundCloud, etc.) or upload an audio file, and submit. You can optionally pay to skip the queue for priority review.',
    },
    {
      question: 'How do streamers join?',
      answer: 'Streamers can apply to join the platform by clicking "Become a Streamer" below. Applications are reviewed within 24-48 hours. Once approved, you\'ll get your own customizable page.',
    },
    {
      question: 'Is it free to submit music?',
      answer: 'Each streamer sets their own pricing. Some offer free submissions, while others may charge for submissions or priority queue placement. Check each streamer\'s page for their specific rates.',
    },
    {
      question: 'What platforms are supported?',
      answer: 'We support Spotify, Apple Music, SoundCloud, YouTube, and direct file uploads (up to 100MB). If your music is hosted elsewhere, you can paste any link or upload the file directly.',
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <CursorFollower />
      <InteractiveBackground />
      
      {/* Header */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ opacity: headerOpacity }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center group">
              <motion.img 
                src={upstarLogo} 
                alt="UpStar" 
                className="h-20 w-auto"
                whileHover={{ scale: 1.05, rotate: -2 }}
                transition={{ type: "spring", stiffness: 400 }}
              />
            </Link>
            <nav className="flex items-center gap-3">
              <Link to="/library">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                >
                  Library
                  <motion.span
                    className="absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-left"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                  />
                </motion.div>
              </Link>
              <Link to="/auth">
                <GlowButton variant="primary" size="default">
                  Sign In
                </GlowButton>
              </Link>
            </nav>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        className="pt-28 pb-16 px-4 relative z-10"
        style={{ scale: heroScale }}
      >
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-4 gap-1.5 px-4 py-1.5 border-primary/30 bg-primary/5">
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </motion.span>
                <span className="text-sm">Music Review Platform</span>
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-7xl font-display font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Get Your Music{' '}
              <motion.span 
                className="text-primary relative inline-block"
                animate={{ 
                  textShadow: [
                    '0 0 20px hsl(var(--primary) / 0.5)',
                    '0 0 40px hsl(var(--primary) / 0.8)',
                    '0 0 20px hsl(var(--primary) / 0.5)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Reviewed Live
                <motion.span
                  className="absolute -right-8 -top-4"
                  animate={{ rotate: [0, 20, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Star className="w-6 h-6 text-primary fill-primary" />
                </motion.span>
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Submit your tracks to streamers and get real-time feedback from creators and their audiences. Join{' '}
              <BlurReveal>thousands of artists</BlurReveal>{' '}
              getting <GlitchText>discovered</GlitchText>.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <GlowButton 
                variant="primary" 
                size="lg"
                onClick={() => document.getElementById('streamers')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Radio className="w-5 h-5" />
                Browse Streamers
              </GlowButton>
              <GlowButton 
                variant="outline" 
                size="lg"
                onClick={() => document.getElementById('for-streamers')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Become a Streamer
                <ArrowRight className="w-5 h-5" />
              </GlowButton>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <section className="py-16 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <AnimatedCard key={stat.label} delay={index * 0.1} className="text-center">
                <div className="p-6">
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  </motion.div>
                  <div className="text-3xl md:text-4xl font-bold mb-1">
                    <AnimatedCounter value={stat.value} />
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Active Streamers Section */}
      <section id="streamers" className="py-16 px-4 relative z-10">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.h2 
              className="text-3xl md:text-5xl font-display font-bold mb-4"
              whileInView={{ 
                backgroundSize: ['100% 0%', '100% 100%'],
              }}
            >
              Active Streamers
            </motion.h2>
            <p className="text-muted-foreground text-lg">
              Find a streamer to review your music
            </p>
          </motion.div>

          {/* Live Streamers */}
          {liveStreamers.length > 0 && (
            <div className="mb-10">
              <motion.div 
                className="flex items-center gap-3 mb-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <motion.div 
                  className="w-3 h-3 bg-destructive rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <h3 className="font-semibold text-xl">Live Now</h3>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {liveStreamers.map((streamer, index) => (
                  <StreamerCard key={streamer.id} streamer={streamer} index={index} isLive />
                ))}
              </div>
            </div>
          )}

          {/* Offline Streamers */}
          {offlineStreamers.length > 0 && (
            <div>
              <h3 className="font-semibold text-xl mb-6 text-muted-foreground">All Streamers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {offlineStreamers.map((streamer, index) => (
                  <StreamerCard key={streamer.id} streamer={streamer} index={index} />
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-16">
              <motion.div 
                className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-muted-foreground">Loading streamers...</p>
            </div>
          )}

          {!isLoading && streamers.length === 0 && (
            <AnimatedCard className="text-center">
              <div className="py-16 px-8">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-3">No streamers yet</h3>
                <p className="text-muted-foreground mb-6">Be the first to join as a streamer!</p>
                <GlowButton 
                  onClick={() => document.getElementById('for-streamers')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Apply Now
                </GlowButton>
              </div>
            </AnimatedCard>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Three simple steps to get your music reviewed
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Choose a Streamer', desc: 'Browse our active streamers and find one that matches your genre and style.' },
              { step: '02', title: 'Submit Your Track', desc: 'Paste your song link or upload a file. Add details and optionally skip the queue.' },
              { step: '03', title: 'Get Reviewed Live', desc: 'Watch the stream as your music gets played and receive real-time feedback.' },
            ].map((item, index) => (
              <AnimatedCard key={item.step} delay={index * 0.15}>
                <div className="relative p-8 text-center">
                  <motion.span 
                    className="absolute top-4 left-4 text-xs font-mono text-primary/50"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                  >
                    {item.step}
                  </motion.span>
                  <motion.div 
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 border border-primary/20"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="text-2xl font-bold text-primary">{index + 1}</span>
                  </motion.div>
                  <h3 className="font-semibold text-lg mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* For Streamers Section */}
      <section id="for-streamers" className="py-20 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">For Streamers</Badge>
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-5">
                Monetize Your Music Reviews
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Join UpStar as a streamer and create a new revenue stream. Set your own prices, customize your page, and engage with artists worldwide.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Set your own submission prices',
                  'Fully customizable profile page',
                  'Real-time queue management',
                  'Built-in payment processing',
                  'Analytics and insights',
                ].map((feature, index) => (
                  <motion.li 
                    key={feature} 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <motion.div 
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                    />
                    <span>{feature}</span>
                  </motion.li>
                ))}
              </ul>
              <GlowButton size="lg" onClick={() => setShowApplicationForm(true)}>
                Apply to Join
                <ArrowRight className="w-5 h-5" />
              </GlowButton>
              <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Apply to Become a Streamer</DialogTitle>
                  </DialogHeader>
                  <StreamerApplicationForm onSuccess={() => setShowApplicationForm(false)} />
                </DialogContent>
              </Dialog>
            </motion.div>

            <AnimatedCard className="overflow-hidden">
              <motion.div
                className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-10 border border-primary/20"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="text-center">
                  <motion.div 
                    className="text-6xl font-bold mb-3"
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-primary">$</span>
                    <AnimatedCounter value={500} />
                    <span className="text-primary">+</span>
                  </motion.div>
                  <div className="text-muted-foreground text-lg mb-6">Average monthly earnings</div>
                  <motion.div 
                    className="text-sm text-muted-foreground p-4 rounded-lg bg-background/50 border border-border/30"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    Top streamers earn <span className="text-primary font-semibold">$2,000+</span>/month from music reviews
                  </motion.div>
                </div>
              </motion.div>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about UpStar
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <AnimatedCard>
                  <motion.button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left"
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <span className="font-medium text-lg">{faq.question}</span>
                    <motion.div
                      animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  </motion.button>
                  <motion.div
                    initial={false}
                    animate={{ 
                      height: expandedFaq === index ? 'auto' : 0,
                      opacity: expandedFaq === index ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <LanguageSwitcher />
      <Footer />
    </div>
  );
};

// Streamer Card Component
function StreamerCard({ streamer, index, isLive = false }: { streamer: any; index: number; isLive?: boolean }) {
  return (
    <AnimatedCard delay={index * 0.08} glowColor={isLive ? '--destructive' : '--primary'}>
      <Link
        to={`/${streamer.slug}`}
        className={`block p-5 ${
          isLive ? 'bg-gradient-to-br from-destructive/10 to-transparent' : ''
        }`}
      >
        <div className="flex items-start gap-4">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            {streamer.avatar_url ? (
              <img
                src={streamer.avatar_url}
                alt={streamer.display_name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
                <span className="text-xl font-bold text-primary">
                  {streamer.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {isLive && (
              <motion.div 
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-destructive rounded-full border-2 border-background flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="w-2 h-2 bg-white rounded-full" />
              </motion.div>
            )}
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">{streamer.display_name}</h3>
              {isLive && (
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                    LIVE
                  </Badge>
                </motion.div>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mb-2">
              {streamer.bio || 'Music reviewer'}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {streamer.twitch_url && (
                <motion.div whileHover={{ scale: 1.2 }}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </motion.div>
              )}
              <span className="font-mono">/{streamer.slug}</span>
            </div>
          </div>
        </div>
      </Link>
    </AnimatedCard>
  );
}

export default Discovery;
