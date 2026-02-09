import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Radio, Users, Music, TrendingUp, ArrowRight, Sparkles, ChevronDown, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useActiveStreamers } from '@/hooks/useStreamer';
import { useLanguage } from '@/hooks/useLanguage';
import { Footer } from '@/components/Footer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StreamerApplicationForm } from '@/components/StreamerApplicationForm';
import { CursorFollower } from '@/components/discovery/CursorFollower';
import { SoundwaveBackgroundCanvas } from '@/components/discovery/SoundwaveBackgroundCanvas';
import { AnimatedCounter } from '@/components/discovery/AnimatedCounter';
import { LiveCounter } from '@/components/discovery/LiveCounter';
import { BuildingPhaseBanner } from '@/components/BuildingPhaseBanner';
import { GlowButton } from '@/components/discovery/GlowButton';
import { AnimatedCard } from '@/components/discovery/AnimatedCard';
import { BlurReveal, GlitchText } from '@/components/discovery/TextEffects';
import { PerformanceToggle } from '@/components/PerformanceToggle';
import upstarLogo from '@/assets/upstar-logo.png';
import upstarHeroStar from '@/assets/upstar-hero-star.png';
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
    { label: t('discovery.activeStreamers'), value: 0, icon: Users, isLive: false },
    { label: t('discovery.songsReviewed'), value: 0, icon: Music, isLive: true },
    { label: t('discovery.liveNow'), value: 0, icon: Radio, isLive: false },
    { label: t('discovery.weeklyViews'), value: 0, icon: TrendingUp, isLive: false },
  ];

  const faqs = [
    {
      question: t('discovery.faq1q'),
      answer: t('discovery.faq1a'),
    },
    {
      question: t('discovery.faq2q'),
      answer: t('discovery.faq2a'),
    },
    {
      question: t('discovery.faq3q'),
      answer: t('discovery.faq3a'),
    },
    {
      question: t('discovery.faq4q'),
      answer: t('discovery.faq4a'),
    },
    {
      question: t('discovery.faq5q'),
      answer: t('discovery.faq5a'),
    },
  ];

  return (
    <>
      <SoundwaveBackgroundCanvas />
      <div className="min-h-screen relative overflow-hidden" style={{ background: 'transparent' }}>
        <CursorFollower />
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
                  {t('nav.library')}
                  <motion.span
                    className="absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-left"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                  />
                </motion.div>
              </Link>
              <Link to="/auth">
                <GlowButton variant="primary" size="default">
                  {t('nav.signIn')}
                </GlowButton>
              </Link>
              <TooltipProvider>
                <PerformanceToggle />
              </TooltipProvider>
            </nav>
          </div>
        </div>
      </motion.header>

      {/* Building Phase Banner */}
      <BuildingPhaseBanner />

      {/* Hero Section */}
      <motion.section 
        className="pt-8 pb-16 px-4 relative z-10"
        style={{ scale: heroScale }}
      >
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge removed */}
            
            <motion.h1 
              className="text-4xl md:text-7xl font-display font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {t('discovery.heroTitle')}{' '}
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
                {t('discovery.heroHighlight')}
                <motion.span
                  className="absolute -right-10 -top-6"
                  animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <img src={upstarHeroStar} alt="" className="w-10 h-10 object-contain" />
                </motion.span>
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {t('discovery.heroSubtitle')}
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
                {t('discovery.browseStreamers')}
              </GlowButton>
              <GlowButton 
                variant="outline" 
                size="lg"
                onClick={() => document.getElementById('for-streamers')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('discovery.becomeStreamer')}
                <ArrowRight className="w-5 h-5" />
              </GlowButton>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <section className="py-16 px-4 relative z-10">
        <div className="container mx-auto max-w-5xl">
          {/* Featured: Songs Reviewed Counter - Compact */}
          <AnimatedCard delay={0} className="mb-8 max-w-md mx-auto">
            <div className="p-6 text-center">
              <motion.div
                whileHover={{ scale: 1.2, rotate: 15 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
              >
                <Music className="w-10 h-10 text-primary mx-auto mb-3" />
              </motion.div>
              <motion.div
                className="text-4xl md:text-5xl font-bold mb-1"
                style={{ color: 'hsl(var(--glow-primary))' }}
                whileHover={{ 
                  scale: 1.05,
                  textShadow: '0 0 30px hsl(var(--primary) / 0.8)',
                }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <LiveCounter startValue={0} />
              </motion.div>
              <div className="text-base text-muted-foreground">{t('discovery.songsReviewed')}</div>
            </div>
          </AnimatedCard>

          {/* Other Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {stats.filter(s => !s.isLive).map((stat, index) => (
              <AnimatedCard key={stat.label} delay={index * 0.1} className="text-center">
                <div className="p-4 md:p-6">
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <stat.icon className="w-6 h-6 md:w-8 md:h-8 text-primary mx-auto mb-2 md:mb-3" />
                  </motion.div>
                  <div className="text-2xl md:text-4xl font-bold mb-1">
                    <AnimatedCounter value={stat.value} />
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
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
              {t('discovery.sectionStreamers')}
            </motion.h2>
            <p className="text-muted-foreground text-lg">
              {t('discovery.sectionStreamersSubtitle')} <BlurReveal>{t('discovery.yourMusic')}</BlurReveal>
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
                <h3 className="font-semibold text-xl">{t('discovery.liveNow')}</h3>
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
              <h3 className="font-semibold text-xl mb-6 text-muted-foreground">{t('discovery.allStreamers')}</h3>
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
              <p className="text-muted-foreground">{t('discovery.loadingStreamers')}</p>
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
                <h3 className="text-xl font-semibold mb-3">{t('discovery.noStreamersYet')}</h3>
                <p className="text-muted-foreground mb-6">{t('discovery.beFirstStreamer')}</p>
                <GlowButton 
                  onClick={() => document.getElementById('for-streamers')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('discovery.applyNow')}
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
              {t('discovery.howItWorksTitle')}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t('discovery.howItWorksSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {[
              { step: '01', title: t('discovery.step1Title'), desc: t('discovery.step1Desc') },
              { step: '02', title: t('discovery.step2Title'), desc: t('discovery.step2Desc') },
              { step: '03', title: t('discovery.step3Title'), desc: t('discovery.step3Desc') },
            ].map((item, index) => (
              <AnimatedCard key={item.step} delay={index * 0.15} className="h-full">
                <motion.div
                  className="relative p-8 text-center h-full flex flex-col min-h-[320px]"
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                >
                  <motion.span
                    className="absolute top-4 left-4 text-xs font-mono text-primary/50"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                  >
                    {item.step}
                  </motion.span>

                  <motion.div
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 border border-primary/20"
                    variants={{
                      rest: { scale: 1, rotate: 0 },
                      hover: {
                        scale: 1.1,
                        rotate: 360,
                        transition: { duration: 0.6, ease: 'easeInOut' },
                      },
                    }}
                  >
                    <motion.span
                      className="text-2xl font-bold text-primary"
                      variants={{
                        rest: { rotate: 0 },
                        hover: {
                          rotate: [0, -15, 15, 0],
                          transition: { duration: 0.45, ease: 'easeInOut' },
                        },
                      }}
                    >
                      {index + 1}
                    </motion.span>
                  </motion.div>

                  <h3 className="font-semibold text-lg mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{item.desc}</p>
                </motion.div>
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
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">{t('discovery.forStreamers')}</Badge>
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-5">
                {t('discovery.monetizeTitle')}
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                {t('discovery.monetizeSubtitle')}{' '}
                <BlurReveal>{t('discovery.artistsWorldwide')}</BlurReveal>.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  t('discovery.feature1'),
                  t('discovery.feature2'),
                  t('discovery.feature3'),
                  t('discovery.feature4'),
                  t('discovery.feature5'),
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
                {t('discovery.applyToJoin')}
                <ArrowRight className="w-5 h-5" />
              </GlowButton>
              <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('discovery.applyDialogTitle')}</DialogTitle>
                  </DialogHeader>
                  <StreamerApplicationForm onSuccess={() => setShowApplicationForm(false)} />
                </DialogContent>
              </Dialog>
            </motion.div>

            <div className="relative bg-card rounded-xl border border-border/50 overflow-hidden">
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
                  <div className="text-muted-foreground text-lg mb-6">{t('discovery.avgMonthlyEarnings')}</div>
                  <motion.div 
                    className="text-sm text-muted-foreground p-4 rounded-lg bg-background/50 border border-border/30"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    {t('discovery.topStreamersEarn')} <span className="text-primary font-semibold">$2,000+</span>{t('discovery.perMonth')}
                  </motion.div>
                </div>
              </motion.div>
            </div>
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
              {t('discovery.faqTitle')}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t('discovery.faqSubtitle')}
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
    </>
  );
};

// Streamer Card Component
function StreamerCard({ streamer, index, isLive = false }: { streamer: any; index: number; isLive?: boolean }) {
  const { t } = useLanguage();
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
              {streamer.bio || t('discovery.musicReviewer')}
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
