import { motion, AnimatePresence } from 'framer-motion';
import { Link2, ArrowDown, Headphones, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  const rows = [
    { pos: 1, w: '85%', highlight: false, delay: 0 },
    { pos: 2, w: '70%', highlight: true, delay: 0.1 },
    { pos: 3, w: '55%', highlight: false, delay: 0.2 },
    { pos: 4, w: '40%', highlight: false, delay: 0.3 },
  ];

  return (
    <div className="relative w-full h-32 flex flex-col items-center justify-center gap-1.5 px-6">
      {rows.map((row) => (
        <motion.div
          key={row.pos}
          className="flex items-center gap-2 w-full max-w-[200px]"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: row.delay + 0.3 }}
        >
          <span className="text-[9px] font-mono text-muted-foreground/40 w-4 shrink-0 text-right">
            #{row.pos}
          </span>
          <motion.div
            className={`h-5 rounded-md ${
              row.highlight
                ? 'bg-gradient-to-r from-primary/30 to-primary/10 border border-primary/30'
                : 'bg-muted/30 border border-border/20'
            }`}
            style={{ width: row.w }}
            animate={row.highlight ? { scale: [1, 1.03, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {row.highlight && (
              <div className="h-full flex items-center px-2">
                <span className="text-[8px] font-bold text-primary tracking-wide">YOU ⚡</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      ))}

      {/* Animated arrow showing queue movement */}
      <motion.div
        className="absolute right-4 top-1/2 -translate-y-1/2"
        animate={{ y: [-8, 8, -8], opacity: [0.3, 0.7, 0.3] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <ArrowDown className="w-3 h-3 text-primary/40" />
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

export function HowItWorks() {
  const [showTip, setShowTip] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInViewRef = useRef(false);

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
        if (entry.isIntersecting) {
          startTimer();
        } else {
          setShowTip(false);
          if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(section);

    const handleScroll = () => {
      if (isInViewRef.current) {
        setShowTip(false);
        startTimer();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [startTimer]);

  const { t } = useLanguage();
  const steps = [
    {
      step: '01',
      title: 'Drop Your Link',
      description: 'Paste any music link — Spotify, SoundCloud, YouTube, anything.',
      illustration: <LinkIllustration />,
    },
    {
      step: '02',
      title: 'Join the Queue',
      description: 'Your track enters the live queue. The streamer plays it on stream.',
      illustration: <QueueIllustration />,
    },
    {
      step: '03',
      title: 'Get Reviewed Live',
      description: 'Watch in real-time as the streamer listens and gives feedback.',
      illustration: <LiveIllustration />,
    },
  ];

  return (
    <section ref={sectionRef} className="py-16 px-4">
      <div className="container mx-auto max-w-4xl">
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
            Three steps. No sign-up needed. Just your music.
          </p>
        </motion.div>

        {/* Steps grid with floating PS tip */}
        <div className="relative">
          {/* PS tip - floating above card 3, right-aligned, delayed appearance */}
          <AnimatePresence>
            {showTip && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9, rotate: -2 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 1.5 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="hidden md:flex absolute -top-5 -right-3 z-10 items-center gap-2 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md shadow-lg shadow-emerald-500/5"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <p className="text-[11px] text-emerald-300/90 italic">
                  <span className="text-emerald-200 font-semibold not-italic">Psst…</span> Boost your spot & support creators 💚
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="w-4 h-4 rounded-full border border-emerald-400/40 bg-emerald-500/20 flex items-center justify-center shrink-0 hover:bg-emerald-500/30 transition-colors" onClick={(e) => e.stopPropagation()}>
                      <HelpCircle className="w-2.5 h-2.5 text-emerald-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                    Pay a small fee to jump ahead in the queue. 100% of the boost goes directly to the streamer you're supporting!
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: index * 0.12, duration: 0.5 }}
                whileHover={{ y: -4 }}
                onClick={() => window.location.href = '/browse'}
                className="group relative rounded-2xl border border-border/40 bg-card/40 overflow-hidden transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 cursor-pointer"
              >
                <div className="absolute top-3 right-3 text-[40px] font-display font-bold text-muted/20 leading-none select-none">
                  {item.step}
                </div>
                <div className="relative pt-2">
                  {item.illustration}
                </div>
                <div className="p-5 pt-2">
                  <h3 className="font-display font-bold text-base mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
                <motion.div
                  className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-primary/80 to-primary/20"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.4 }}
                  style={{ transformOrigin: 'left', width: '100%' }}
                />
              </motion.div>
            ))}
          </div>

          {/* Mobile PS tip */}
          <AnimatePresence>
            {showTip && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="md:hidden mt-4 flex justify-end"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <p className="text-[11px] text-emerald-300/90 italic">
                    <span className="text-emerald-200 font-semibold not-italic">Psst…</span> Boost your spot & support creators 💚
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="w-4 h-4 rounded-full border border-emerald-400/40 bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-2.5 h-2.5 text-emerald-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      Pay a small fee to jump ahead in the queue. 100% of the boost goes directly to the streamer you're supporting!
                    </TooltipContent>
                  </Tooltip>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA */}
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
            Find a Streamer & Submit
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
