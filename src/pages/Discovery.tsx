import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, Users, Music, TrendingUp, ArrowRight, ChevronDown, ExternalLink, Search, Lock, Eye, Send, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useActiveStreamers } from '@/hooks/useStreamer';
import { useLanguage } from '@/hooks/useLanguage';
import { Footer } from '@/components/Footer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StreamerApplicationForm } from '@/components/StreamerApplicationForm';
import { BuildingPhaseBanner } from '@/components/BuildingPhaseBanner';
import { HowItWorks } from '@/components/HowItWorks';
import { LiquidDots } from '@/components/discovery/LiquidDots';
import upstarLogo from '@/assets/upstar-logo.png';
import upstarLogoSquare from '@/assets/upstar-logo-square.png';
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
  }),
};

const Discovery = () => {
  const { streamers, isLoading } = useActiveStreamers();
  const { t } = useLanguage();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [showAllStreamers, setShowAllStreamers] = useState(false);

  const liveStreamers = streamers.filter(s => s.is_live);
  const offlineStreamers = streamers.filter(s => !s.is_live);
  
  const displayedStreamers = useMemo(() => {
    const all = [...liveStreamers, ...offlineStreamers];
    return showAllStreamers ? all : all.slice(0, 6);
  }, [liveStreamers, offlineStreamers, showAllStreamers]);

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


  const faqs = [
    { question: t('discovery.faq1q'), answer: t('discovery.faq1a') },
    { question: t('discovery.faq2q'), answer: t('discovery.faq2a') },
    { question: t('discovery.faq3q'), answer: t('discovery.faq3a') },
    { question: t('discovery.faq4q'), answer: t('discovery.faq4a') },
    { question: t('discovery.faq5q'), answer: t('discovery.faq5a') },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Liquid dots background */}
      <LiquidDots />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center">
              <img src={upstarLogo} alt="UpStar" className="h-20 w-auto" />
            </Link>
            <nav className="flex items-center gap-3">
              <Link to="/auth">
                <Button size="sm" className="h-9 px-5 text-xs font-medium">
                  {t('nav.signIn')}
                </Button>
              </Link>
              <LanguageSwitcher variant="header" />
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-8 pb-20 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Big UpStar Logo */}
            <motion.div variants={fadeUp} custom={0} className="flex justify-center">
              <img
                src={upstarLogoSquare}
                alt="UpStar"
                className="w-40 h-40 md:w-56 md:h-56 object-contain"
              />
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl md:text-7xl font-display font-bold leading-[1.1] tracking-tight"
            >
              {t('discovery.heroTitle')}
              <br />
              <span className="text-primary">{t('discovery.heroHighlight')}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
            >
              {t('discovery.heroSubtitle')}
            </motion.p>

            {/* CTA Button */}
            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex justify-center pt-2"
            >
              <Link to="/browse">
                <Button
                  size="lg"
                  className="h-14 px-12 text-base font-medium gap-2.5"
                >
                  <Radio className="w-5 h-5" />
                  {t('discovery.browseStreamers')}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />




      {/* Active Streamers */}
      <section id="streamers" className="py-20 px-4 relative z-10">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-4xl font-display font-bold mb-3">
              {t('discovery.sectionStreamers')}
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              {t('discovery.sectionStreamersSubtitle')}
            </p>
          </motion.div>

          {displayedStreamers.length > 0 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedStreamers.map((streamer, index) => (
                  <StreamerCard key={streamer.id} streamer={streamer} index={index} isLive={streamer.is_live || false} />
                ))}
              </div>
              {!showAllStreamers && streamers.length > 6 && (
                <div className="text-center mt-8">
                  <Link to="/browse">
                    <Button variant="outline" size="sm" className="gap-2">
                      Show More
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
              <p className="text-sm text-muted-foreground">{t('discovery.loadingStreamers')}</p>
            </div>
          )}

          {!isLoading && streamers.length === 0 && (
            <div className="text-center py-16 rounded-xl border border-border/50 bg-card/30">
              <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('discovery.noStreamersYet')}</h3>
              <p className="text-sm text-muted-foreground">{t('discovery.beFirstStreamer')}</p>
            </div>
          )}
        </div>
      </section>




      {/* For Streamers */}
      <section id="for-streamers" className="py-20 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-xs font-mono">
                {t('discovery.forStreamers')}
              </Badge>
              <h2 className="text-2xl md:text-4xl font-display font-bold mb-4">
                {t('discovery.streamerFeaturesTitle')}
              </h2>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                {t('discovery.streamerFeaturesSubtitle')}
              </p>
              <h3 className="text-xs font-display font-semibold text-primary mb-3 uppercase tracking-widest">
                {t('discovery.featuresLabel')}
              </h3>
              <ul className="space-y-3 mb-8">
                {[
                  t('discovery.feat1'),
                  t('discovery.feat2'),
                  t('discovery.feat3'),
                  t('discovery.feat4'),
                  t('discovery.feat5'),
                ].map((feature, index) => (
                  <motion.li
                    key={feature}
                    className="flex items-center gap-3 text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06 }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{feature}</span>
                  </motion.li>
                ))}
              </ul>
              <h3 className="text-xs font-display font-semibold text-primary mb-2 uppercase tracking-widest">
                {t('discovery.monetizationLabel')}
              </h3>
              <p className="text-xs text-muted-foreground mb-6">
                {t('discovery.streamerCTA')}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Lock className="w-3.5 h-3.5" />
                  {t('discovery.contactSales')}
                </Button>
              </div>
              <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('discovery.applyDialogTitle')}</DialogTitle>
                  </DialogHeader>
                  <StreamerApplicationForm onSuccess={() => setShowApplicationForm(false)} />
                </DialogContent>
              </Dialog>
            </motion.div>

            {/* Feature highlight card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-xl border border-border/50 bg-card/30 p-10 text-center space-y-5"
            >
              <Zap className="w-10 h-10 text-primary mx-auto" />
              <h3 className="text-xl font-display font-bold">{t('discovery.platformHighlightTitle')}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('discovery.platformHighlightDesc')}
              </p>
              <div className="text-xs text-muted-foreground p-3 rounded-lg bg-background/50 border border-border/30 font-mono">
                {t('discovery.lowestFees')}
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-16 px-4 relative z-10">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.h2
            className="text-2xl md:text-4xl font-display font-bold mb-4"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {t('discovery.ctaTitle')}
          </motion.h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto">
            {t('discovery.ctaSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/browse">
              <Button size="lg" className="h-12 px-8 gap-2">
                <Send className="w-4 h-4" />
                {t('discovery.ctaSubmit')}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 gap-2"
              onClick={() => setShowApplicationForm(true)}
            >
              <Eye className="w-4 h-4" />
              {t('discovery.ctaReview')}
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl md:text-4xl font-display font-bold mb-3">
              {t('discovery.faqTitle')}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t('discovery.faqSubtitle')}
            </p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-border/50 bg-card/30 overflow-hidden hover:border-border/80 transition-colors duration-200"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium text-sm">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-4" />
                  </motion.div>
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: expandedFaq === index ? 'auto' : 0,
                    opacity: expandedFaq === index ? 1 : 0,
                  }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </motion.div>
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

      {/* Building Phase Banner */}
      <BuildingPhaseBanner />

      <Footer />
    </div>
  );
};

// Streamer Card — clean, no 3D tilt
function StreamerCard({ streamer, index, isLive = false }: { streamer: any; index: number; isLive?: boolean }) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Link
        to={`/${streamer.slug}`}
        className={`block p-5 rounded-xl border border-border/50 bg-card/30 hover:border-primary/30 transition-colors duration-200 ${
          isLive ? 'border-l-2 border-l-destructive' : ''
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {streamer.avatar_url ? (
              <img
                src={streamer.avatar_url}
                alt={streamer.display_name}
                className="w-12 h-12 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <span className="text-lg font-display font-bold text-primary">
                  {streamer.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {isLive && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-semibold text-sm truncate">{streamer.display_name}</h3>
              {isLive && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                  LIVE
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mb-1.5">
              {streamer.bio || t('discovery.contentReviewer')}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {streamer.twitch_url && <ExternalLink className="w-3 h-3" />}
              <span className="font-mono text-[11px]">/{streamer.slug}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default Discovery;
