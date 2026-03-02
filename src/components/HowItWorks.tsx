import { motion, AnimatePresence } from 'framer-motion';
import { Link2, ArrowDown, Headphones, ArrowRight, Sparkles, HelpCircle, ChevronRight, Zap, Copy, Check } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

function LinkIllustration() {
  return (
    <div className="relative w-full h-32 flex items-center justify-center">
      {/* Floating link icon */}
      <motion.div
        className="absolute w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        <Link2 className="w-6 h-6 text-primary" />
      </motion.div>

      {/* Orbiting dots */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/40"
          animate={{
            x: [0, Math.cos((i * 2 * Math.PI) / 3) * 40, 0],
            y: [0, Math.sin((i * 2 * Math.PI) / 3) * 40, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{ repeat: Infinity, duration: 4, delay: i * 0.5, ease: 'easeInOut' }}
        />
      ))}

      {/* Simulated URL bar */}
      <motion.div
        className="absolute bottom-2 w-48 h-7 rounded-md bg-card/80 border border-border/40 flex items-center px-2.5 gap-1.5 overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
        <motion.span
          className="text-[9px] font-mono text-primary/70 whitespace-nowrap"
          animate={{ x: [60, -120] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
        >
          spotify.com/track/my-new-song · soundcloud.com/artist/beat · youtube.com/watch
        </motion.span>
      </motion.div>
    </div>
  );
}

function QueueIllustration() {
  const [phase, setPhase] = useState<'idle' | 'reviewing' | 'climbing'>('idle');
  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cycle = () => {
      setPhase('idle');
      cycleRef.current = setTimeout(() => {
        setPhase('reviewing');
        cycleRef.current = setTimeout(() => {
          setPhase('climbing');
          cycleRef.current = setTimeout(cycle, 2800);
        }, 1200);
      }, 2200);
    };
    cycle();
    return () => { if (cycleRef.current) clearTimeout(cycleRef.current); };
  }, []);

  // Track data: label, width, isYou
  const tracks = [
    { label: 'Track A', w: '85%', isYou: false },
    { label: 'YOU ⚡', w: '70%', isYou: true },
    { label: 'Track C', w: '55%', isYou: false },
    { label: 'Track D', w: '40%', isYou: false },
  ];

  // During 'idle': show all 4 at positions 1-4
  // During 'reviewing': #1 gets a checkmark + fades
  // During 'climbing': #1 gone, others shift up, show in positions 1-3

  const showReviewBadge = phase === 'reviewing';
  const shifted = phase === 'climbing';

  const visibleTracks = shifted ? tracks.slice(1) : tracks;

  return (
    <div className="relative w-full h-32 flex flex-col items-center justify-center gap-1.5 px-6">
      <AnimatePresence mode="popLayout">
        {visibleTracks.map((track, index) => {
          const pos = index + 1;
          const isFirst = index === 0 && !shifted;
          const widths: Record<string, string> = { '85%': '85%', '70%': '78%', '55%': '68%', '40%': '55%' };

          return (
            <motion.div
              key={track.label}
              layout
              className="flex items-center gap-2 w-full max-w-[200px]"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: showReviewBadge && isFirst ? 0.4 : 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <span className="text-[9px] font-mono text-muted-foreground/40 w-4 shrink-0 text-right">
                #{pos}
              </span>
              <motion.div
                className={`h-5 rounded-md ${
                  track.isYou
                    ? 'bg-gradient-to-r from-primary/30 to-primary/10 border border-primary/30'
                    : showReviewBadge && isFirst
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'bg-muted/30 border border-border/20'
                }`}
                style={{ width: shifted ? widths[track.w] || track.w : track.w }}
                animate={track.isYou && !showReviewBadge ? { scale: [1, 1.03, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <div className="h-full flex items-center px-2">
                  {showReviewBadge && isFirst ? (
                    <motion.span
                      className="text-[8px] font-bold text-emerald-400 tracking-wide"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      ✓ Reviewed
                    </motion.span>
                  ) : track.isYou ? (
                    <span className="text-[8px] font-bold text-primary tracking-wide">YOU ⚡</span>
                  ) : null}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Arrow indicating upward movement */}
      <motion.div
        className="absolute right-4 top-1/2 -translate-y-1/2"
        animate={shifted
          ? { y: [-4, -12, -4], opacity: [0.5, 0.9, 0.5] }
          : { y: [-8, 8, -8], opacity: [0.3, 0.7, 0.3] }
        }
        transition={{ repeat: Infinity, duration: shifted ? 1 : 2 }}
      >
        <ArrowDown className={`w-3 h-3 text-primary/40 ${shifted ? 'rotate-180' : ''}`} />
      </motion.div>
    </div>
  );
}

function LiveIllustration() {
  return (
    <div className="relative w-full h-32 flex items-center justify-center">
      {/* Pulsing live ring */}
      <motion.div
        className="absolute w-20 h-20 rounded-full border border-destructive/20"
        animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute w-20 h-20 rounded-full border border-destructive/20"
        animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 0.7 }}
      />

      {/* Center headphones */}
      <motion.div
        className="relative w-14 h-14 rounded-full bg-card border border-border/40 flex items-center justify-center z-10"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <Headphones className="w-6 h-6 text-foreground" />
      </motion.div>

      {/* Sound wave bars */}
      <div className="absolute bottom-3 flex items-end gap-[3px]">
        {[3, 5, 8, 12, 8, 5, 3, 6, 10, 7, 4].map((h, i) => (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-primary/50"
            animate={{ height: [`${h}px`, `${h * 2.5}px`, `${h}px`] }}
            transition={{ repeat: Infinity, duration: 1 + Math.random(), delay: i * 0.08 }}
          />
        ))}
      </div>
    </div>
  );
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TIP-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface HowItWorksProps {
  compact?: boolean;
}

const scrollToSubmissionForm = () => {
  const form = document.querySelector('form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const firstInput = form.querySelector('input, textarea, select') as HTMLElement;
      firstInput?.focus();
    }, 500);
  }
};

export function HowItWorks({ compact = false }: HowItWorksProps) {
  const [showTip, setShowTip] = useState(false);
  const [tipExpanded, setTipExpanded] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [mobileCardsExpanded, setMobileCardsExpanded] = useState(false);
  const referralCreatedRef = useRef(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInViewRef = useRef(false);

  const handleTipExpand = useCallback(async () => {
    setTipExpanded(true);
    if (referralCreatedRef.current) return;
    referralCreatedRef.current = true;

    // Generate a fresh code every session (no localStorage persistence)
    const code = generateReferralCode();
    const { error } = await supabase.from('referral_codes').insert({
      code,
      discount_percent: 5,
      source: 'homepage',
      is_used: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (!error) {
      setReferralCode(code);
    }
  }, []);

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCodeCopied(true);
    toast({ title: '5% discount code copied!', description: referralCode });
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const startTimer = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      if (isInViewRef.current) setShowTip(true);
    }, 2000);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !showTip) {
          startTimer();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [startTimer, showTip]);

  const { t } = useLanguage();
  const steps = [
    {
      step: '01',
      title: t('howItWorks.step1.fullTitle'),
      description: t('howItWorks.step1.fullDesc'),
      illustration: <LinkIllustration />,
    },
    {
      step: '02',
      title: t('howItWorks.step2.title'),
      description: t('howItWorks.step2.fullDesc'),
      illustration: <QueueIllustration />,
    },
    {
      step: '03',
      title: t('howItWorks.step3.fullTitle'),
      description: t('howItWorks.step3.fullDesc'),
      illustration: <LiveIllustration />,
    },
  ];

  return (
    <section ref={sectionRef} className={compact ? 'py-2 px-4' : 'py-16 px-4'}>
      <div className={`container mx-auto ${compact ? 'max-w-3xl' : 'max-w-4xl'}`}>
        {!compact && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
              {t('howItWorks.title')}
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {t('howItWorks.noSignup')}
            </p>
          </motion.div>
        )}

        {/* 3-step grid */}
        <div className="relative">

        {/* Mobile "Need help?" toggle — compact (submit page) only */}
        {compact && (
          <div className="sm:hidden mb-3 flex justify-center">
            <button
              onClick={() => setMobileCardsExpanded(!mobileCardsExpanded)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm text-sm font-medium text-foreground hover:border-primary/50 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-primary" />
              {mobileCardsExpanded ? t('howItWorks.title') : (t('howItWorks.needHelp') || 'Need help?')}
              <motion.div
                animate={{ rotate: mobileCardsExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            </button>
          </div>
        )}

        <div className={`${compact ? `flex flex-col items-center sm:grid sm:grid-cols-3 sm:gap-3 sm:mx-0 sm:items-stretch ${!mobileCardsExpanded ? 'max-sm:hidden' : ''}` : 'grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-stretch'}`}>
            {steps.map((item, index) => {
              // Compact mobile: stacked cards with alternating left/right offsets and overlap
              const mobileCardStyles = compact ? {
                marginTop: index === 0 ? 0 : -12,
                marginLeft: index === 0 ? 'auto' : index === 1 ? 0 : 'auto',
                marginRight: index === 0 ? 0 : index === 1 ? 'auto' : 0,
                width: '85%',
                maxWidth: 280,
              } : {};

              const compactMobileAnimate = compact ? {
                x: index === 0 ? 20 : index === 1 ? -20 : 16,
                rotate: index === 0 ? 2 : index === 1 ? -2.5 : 1.5,
              } : {};

              return (
              <div key={item.step} className={`relative ${compact ? 'sm:!w-full sm:!max-w-none sm:!mx-0 sm:!mt-0 sm:h-full' : 'h-full'}`} style={{ zIndex: compact ? 3 - index : (index === 2 ? 10 : 1), ...(compact ? mobileCardStyles : {}) }}>
                <motion.div
                  initial={{ opacity: 0, y: compact ? 15 : 24, ...(compact ? { x: 0, rotate: 0 } : {}) }}
                  whileInView={{ opacity: 1, y: 0, ...compactMobileAnimate }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ delay: index * 0.12, duration: 0.45, type: 'spring', stiffness: 200, damping: 20 }}
                  whileHover={compact ? { y: -3, scale: 1.03 } : { y: -4 }}
                   onClick={compact ? scrollToSubmissionForm : () => window.location.href = '/browse'}
                   className={`group relative rounded-xl border border-border/40 bg-card overflow-hidden transition-shadow duration-300 hover:shadow-md hover:shadow-primary/5 hover:border-primary/30 h-full cursor-pointer flex flex-col ${compact ? 'shadow-lg shadow-black/20 sm:!transform-none sm:!rotate-0 sm:shadow-none' : 'rounded-2xl'}`}
                >
                  {!compact && (
                    <div className="absolute top-3 right-3 text-[40px] font-display font-bold text-muted/20 leading-none select-none">
                      {item.step}
                    </div>
                  )}
                  {compact ? (
                     <div className="relative flex items-center justify-center" style={{ height: 44 }}>
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: 'scale(0.36)', transformOrigin: 'center center' }}>
                        {item.illustration}
                       </div>
                     </div>
                  ) : (
                    <div className="relative pt-2">
                      {item.illustration}
                    </div>
                  )}
                   <div className={compact ? 'px-2.5 pb-2 sm:px-2.5 sm:pb-2 pt-1 sm:flex-1' : 'p-5 pt-2 flex-1'}>
                     {compact && (
                       <span className="text-[8px] sm:text-[7px] font-mono text-primary/60 font-bold">{item.step}</span>
                     )}
                     <h3 className={`font-display font-bold ${compact ? 'text-[10px] sm:text-[9px] mb-0.5 leading-tight' : 'text-base mb-1.5'}`}>{item.title}</h3>
                     <p className={`text-muted-foreground ${compact ? 'text-[8px] sm:text-[8px] leading-snug' : 'text-sm leading-relaxed'}`}>{item.description}</p>
                  </div>
                  <motion.div
                    className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-primary/80 to-primary/20"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.4 }}
                    style={{ transformOrigin: 'left', width: '100%' }}
                  />
                </motion.div>

                {/* Desktop PS tip — peek to the right of card 3 */}
                {index === 2 && !tipExpanded && (
                  <AnimatePresence>
                    {showTip && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`hidden ${compact ? 'sm:block' : 'md:block'} absolute top-3 -right-3 translate-x-full`}
                        style={{ zIndex: 10 }}
                      >
                        <motion.div
                          onClick={(e) => { e.stopPropagation(); handleTipExpand(); }}
                          className="cursor-pointer"
                          whileHover={{ scale: 1.05, x: 4 }}
                          whileTap={{ scale: 0.97 }}
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/90 shadow-lg shadow-emerald-500/10">
                            <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                             <p className={`text-emerald-300/90 font-medium whitespace-nowrap ${compact ? 'text-[8px]' : 'text-[9px]'}`}>
                               <span className="text-emerald-200 font-semibold">{t('howItWorks.tip.psst')}</span> {t('howItWorks.tip.secret')}
                            </p>
                            <motion.div 
                              className="w-5 h-5 rounded-full border border-emerald-400/50 bg-emerald-500/25 flex items-center justify-center shrink-0"
                              animate={{ scale: [1, 1.15, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <ChevronRight className="w-3 h-3 text-emerald-300" />
                            </motion.div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {/* Expanded tip — positioned to the right of card 3 */}
                {index === 2 && (
                  <AnimatePresence>
                    {tipExpanded && showTip && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className={`hidden ${compact ? 'sm:block' : 'md:block'} absolute top-0 bottom-0 -right-3 translate-x-full`}
                        style={{ zIndex: 10, width: '200px' }}
                      >
                        <div className="h-full rounded-xl border border-emerald-500/25 bg-emerald-950/60 backdrop-blur-xl shadow-lg shadow-emerald-500/5 flex flex-col justify-center p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                              <Zap className="w-3 h-3 text-emerald-400" />
                            </div>
                            <h3 className="font-display font-bold text-[10px] text-emerald-200">{t('howItWorks.tip.boostTitle')}</h3>
                          </div>
                          <p className="text-[9px] text-emerald-200/80 leading-relaxed mb-2.5">
                            {t('howItWorks.tip.boostDesc')}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); scrollToSubmissionForm(); }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold hover:bg-emerald-500/30 transition-colors mb-1"
                          >
                            {t('howItWorks.tip.boostNow')}
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                          {referralCode && (
                            <div className="mt-1.5 pt-1.5 border-t border-emerald-500/20">
                              <p className="text-[8px] text-emerald-300/70 mb-1">🎁 {t('howItWorks.tip.discountCode')}</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); copyReferralCode(); }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors w-full"
                              >
                                <code className="text-[9px] font-mono font-bold text-emerald-200 tracking-wider">{referralCode}</code>
                                {codeCopied ? <Check className="w-2.5 h-2.5 text-emerald-300 ml-auto" /> : <Copy className="w-2.5 h-2.5 text-emerald-400/60 ml-auto" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
              );
            })}
          </div>

          {/* Mobile PS tip - single expanding box */}
        {(
          <AnimatePresence>
            {showTip && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={`${compact ? 'sm:hidden' : 'md:hidden'} -mt-3 flex justify-end pr-2`}
                style={{ zIndex: 0 }}
              >
                <motion.div
                  onClick={() => { if (!tipExpanded) handleTipExpand(); }}
                  className={`cursor-pointer rounded-lg border border-emerald-500/30 bg-emerald-950/80 backdrop-blur-md ${compact ? 'px-2 py-1' : 'px-3.5 py-1.5'} ${tipExpanded ? (compact ? 'max-w-[200px]' : 'max-w-[260px]') : ''}`}
                  animate={!tipExpanded ? { scale: [1, 1.08, 1, 1.05, 1], boxShadow: ['0 0 0px rgba(16,185,129,0)', '0 0 12px rgba(16,185,129,0.4)', '0 0 0px rgba(16,185,129,0)', '0 0 8px rgba(16,185,129,0.3)', '0 0 0px rgba(16,185,129,0)'] } : {}}
                  transition={!tipExpanded ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {}}
                >
                  {/* Header row */}
                  <div className="flex items-center gap-1.5">
                    <Sparkles className={`${compact ? 'w-2 h-2' : 'w-3 h-3'} text-emerald-400 shrink-0`} />
                    <p className={`${compact ? 'text-[8px]' : 'text-[11px]'} text-emerald-300/90 italic`}>
                      <span className="text-emerald-200 font-semibold not-italic">{t('howItWorks.tip.psst')}</span> {t('howItWorks.tip.secret')} 🤫
                    </p>
                    {!tipExpanded && (
                      <div className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} rounded-full border border-emerald-400/40 bg-emerald-500/20 flex items-center justify-center shrink-0`}>
                        <HelpCircle className={`${compact ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5'} text-emerald-300`} />
                      </div>
                    )}
                  </div>

                  {/* Expanded content - same box */}
                  <AnimatePresence>
                    {tipExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`${compact ? 'pt-1.5 mt-1.5' : 'pt-2 mt-2'} border-t border-emerald-500/20`}>
                          <p className={`${compact ? 'text-[9px] mb-1.5' : 'text-xs mb-3'} text-emerald-200/90 leading-relaxed`}>
                            {t('howItWorks.tip.boostDesc')}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); scrollToSubmissionForm(); }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 ${compact ? 'text-[9px]' : 'text-[11px]'} font-semibold hover:bg-emerald-500/30 transition-colors`}
                          >
                            {t('howItWorks.tip.boostNow')}
                            <ArrowRight className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                          </button>
                          {referralCode && (
                            <div className={`${compact ? 'mt-1.5 pt-1' : 'mt-3 pt-2'} border-t border-emerald-500/20`}>
                              <p className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-emerald-300/70 mb-1`}>🎁 {t('howItWorks.tip.discountCode')}</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); copyReferralCode(); }}
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors w-full"
                              >
                                <code className={`${compact ? 'text-[9px]' : 'text-[11px]'} font-mono font-bold text-emerald-200 tracking-wider`}>{referralCode}</code>
                                {codeCopied ? <Check className="w-2.5 h-2.5 text-emerald-300 ml-auto" /> : <Copy className="w-2.5 h-2.5 text-emerald-400/60 ml-auto" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        </div>

        {/* CTA - only on homepage */}
        {!compact && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-14 text-center"
          >
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:brightness-110 transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              {t('howItWorks.cta')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
