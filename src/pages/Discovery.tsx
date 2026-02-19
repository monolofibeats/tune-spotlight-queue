import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Radio, Users, Music, TrendingUp, ArrowRight, Sparkles, ChevronDown, ExternalLink, Search, Lock, Eye, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { useState, useMemo } from 'react';

const Discovery = () => {
  const { streamers, isLoading } = useActiveStreamers();
  const { t } = useLanguage();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [showAllStreamers, setShowAllStreamers] = useState(false);
  const { scrollYProgress } = useScroll();
  
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  const liveStreamers = streamers.filter(s => s.is_live);
  const offlineStreamers = streamers.filter(s => !s.is_live);
  
  // Top 6 streamers for the grid
  const displayedStreamers = useMemo(() => {
    const all = [...liveStreamers, ...offlineStreamers];
    return showAllStreamers ? all : all.slice(0, 6);
  }, [liveStreamers, offlineStreamers, showAllStreamers]);

  // Filtered streamers for roster dialog
  const filteredRosterStreamers = useMemo(() => {
    const all = [...liveStreamers, ...offlineStreamers];
    if (!rosterSearch.trim()) return all;
    const q = rosterSearch.toLowerCase();
    return all.filter(s => 
      s.display_name.toLowerCase().includes(q) || 
      s.slug.toLowerCase().includes(q) ||
      (s.bio && s.bio.toLowerCase().includes(q))
    );
  }, [liveStreamers, offlineStreamers, rosterSearch]);

  const stats = [
    { label: t('discovery.activeStreamers'), value: 0, icon: Users },
    { label: t('discovery.songsReviewed'), value: 0, icon: Music },
    { label: t('discovery.liveNow'), value: 0, icon: Radio },
    { label: t('discovery.weeklyViews'), value: 0, icon: TrendingUp },
  ];

  const faqs = [
    { question: t('discovery.faq1q'), answer: t('discovery.faq1a') },
    { question: t('discovery.faq2q'), answer: t('discovery.faq2a') },
    { question: t('discovery.faq3q'), answer: t('discovery.faq3a') },
    { question: t('discovery.faq4q'), answer: t('discovery.faq4a') },
    { question: t('discovery.faq5q'), answer: t('discovery.faq5a') },
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
        <div className="container mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.h1 
              className="text-3xl sm:text-5xl md:text-7xl font-display font-bold mb-6 leading-tight flex flex-col items-center gap-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="relative inline-flex justify-center">
                {t('discovery.heroTitle')}
                <motion.span
                  className="absolute -right-7 -top-3 sm:-right-9 sm:-top-4 md:-right-11 md:-top-5 pointer-events-none"
                  animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <img src={upstarHeroStar} alt="" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                </motion.span>
              </span>
              <motion.span 
                className="text-primary whitespace-nowrap"
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
                onClick={() => setShowRoster(true)}
              >
                <Radio className="w-5 h-5" />
                {t('discovery.browseStreamers')}
              </GlowButton>
              <motion.button
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium border border-border/50 bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
                disabled
              >
                <Lock className="w-4 h-4" />
                {t('discovery.becomeStreamerInvite')}
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

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
            >
              {t('discovery.sectionStreamers')}
            </motion.h2>
            <p className="text-muted-foreground text-lg">
              {t('discovery.sectionStreamersSubtitle')}
            </p>
          </motion.div>

          {/* Streamer Grid - Top 6 or all */}
          {displayedStreamers.length > 0 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedStreamers.map((streamer, index) => (
                  <StreamerCard key={streamer.id} streamer={streamer} index={index} isLive={streamer.is_live || false} />
                ))}
              </div>
              {!showAllStreamers && streamers.length > 6 && (
                <motion.div 
                  className="text-center mt-8"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  <GlowButton variant="outline" onClick={() => setShowRoster(true)}>
                    Show More
                    <ArrowRight className="w-4 h-4" />
                  </GlowButton>
                </motion.div>
              )}
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
              </div>
            </AnimatedCard>
          )}
        </div>
      </section>

      {/* Stats Section - Below streamers, 4 in a row */}
      <section className="py-16 px-4 relative z-10">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <AnimatedCard key={stat.label} delay={index * 0.1} className="text-center">
                <div className="p-5">
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <stat.icon className="w-7 h-7 text-primary mx-auto mb-3" />
                  </motion.div>
                  <div className="text-3xl font-bold mb-1">
                    <AnimatedCounter value={stat.value} />
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </AnimatedCard>
            ))}
          </div>
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

      {/* For Streamers Section - Features focused */}
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
                {t('discovery.streamerFeaturesTitle')}
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                {t('discovery.streamerFeaturesSubtitle')}
              </p>
              <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">{t('discovery.featuresLabel')}</h3>
              <ul className="space-y-4 mb-8">
                {[
                  t('discovery.feat1'),
                  t('discovery.feat2'),
                  t('discovery.feat3'),
                  t('discovery.feat4'),
                  t('discovery.feat5'),
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
              <h3 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">{t('discovery.monetizationLabel')}</h3>
              <p className="text-xs text-muted-foreground mb-6">
                {t('discovery.streamerCTA')}
              </p>
              <motion.button
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium border border-border/50 bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
                disabled
              >
                <Lock className="w-4 h-4" />
                {t('discovery.contactSales')}
              </motion.button>
              <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('discovery.applyDialogTitle')}</DialogTitle>
                  </DialogHeader>
                  <StreamerApplicationForm onSuccess={() => setShowApplicationForm(false)} />
                </DialogContent>
              </Dialog>
            </motion.div>

            {/* Features highlight card instead of money card */}
            <div className="relative bg-card rounded-xl border border-border/50 overflow-hidden">
              <motion.div
                className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-10 border border-primary/20"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="text-center space-y-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                  >
                    <Sparkles className="w-12 h-12 text-primary mx-auto mb-2" />
                  </motion.div>
                  <h3 className="text-2xl font-bold">{t('discovery.platformHighlightTitle')}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t('discovery.platformHighlightDesc')}
                  </p>
                  <motion.div 
                    className="text-sm text-muted-foreground p-4 rounded-lg bg-background/50 border border-border/30"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    {t('discovery.lowestFees')}
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Before FAQ */}
      <section className="py-16 px-4 relative z-10">
        <div className="container mx-auto max-w-3xl">
          <div className="p-10 text-center">
              <motion.h2
                className="text-2xl md:text-4xl font-display font-bold mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                {t('discovery.ctaTitle')}
              </motion.h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                {t('discovery.ctaSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <GlowButton variant="primary" size="lg" onClick={() => setShowRoster(true)}>
                  <Send className="w-5 h-5" />
                  {t('discovery.ctaSubmit')}
                </GlowButton>
                <motion.button
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium border border-border/50 bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
                  disabled
                >
                  <Eye className="w-5 h-5" />
                  {t('discovery.ctaReview')}
                </motion.button>
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

      {/* Streamer Roster Dialog */}
      <Dialog open={showRoster} onOpenChange={setShowRoster}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('discovery.rosterTitle')}</DialogTitle>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={t('discovery.rosterSearch')}
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {filteredRosterStreamers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRosterStreamers.map((streamer, index) => (
                <StreamerCard key={streamer.id} streamer={streamer} index={index} isLive={streamer.is_live || false} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{t('discovery.noResults')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              {streamer.bio || t('discovery.contentReviewer')}
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
