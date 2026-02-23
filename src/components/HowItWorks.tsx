import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Zap, Headphones, ArrowRight, CheckCircle2, ExternalLink, Play } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    icon: Link2,
    step: '01',
    title: 'Drop Your Link',
    action: 'Paste a link to try it',
    description: 'Paste any Spotify, SoundCloud, or YouTube link and we handle the rest.',
    demo: 'link',
  },
  {
    icon: Zap,
    step: '02',
    title: 'Join the Queue',
    action: 'Choose your spot',
    description: 'Submit for free or boost your position to get reviewed faster.',
    demo: 'queue',
  },
  {
    icon: Headphones,
    step: '03',
    title: 'Get Reviewed Live',
    action: 'Watch it happen',
    description: 'The streamer plays your track on stream and gives real-time feedback.',
    demo: 'live',
  },
];

function LinkDemo({ active }: { active: boolean }) {
  const [pasted, setPasted] = useState(false);

  return (
    <div className="relative h-full flex flex-col items-center justify-center gap-3 px-4">
      <motion.div
        className="w-full max-w-[260px] rounded-lg border border-border/60 bg-background/80 overflow-hidden"
        animate={active ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0.5 }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 text-xs">
          <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <motion.div
            className="flex-1 truncate font-mono"
            initial={{ width: 0, opacity: 0 }}
            animate={active ? { width: '100%', opacity: 1 } : {}}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            onAnimationComplete={() => active && setPasted(true)}
          >
            <span className="text-primary">spotify.com/track/your-song</span>
          </motion.div>
        </div>
      </motion.div>
      <AnimatePresence>
        {pasted && active && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-primary font-medium"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Link detected!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QueueDemo({ active }: { active: boolean }) {
  return (
    <div className="relative h-full flex flex-col items-center justify-center gap-2 px-4">
      {[
        { pos: '#4', name: 'Free submission', you: false, boost: false },
        { pos: '#2', name: 'Your Track ⚡', you: true, boost: true },
        { pos: '#1', name: 'Now playing', you: false, boost: false },
      ].reverse().map((item, i) => (
        <motion.div
          key={i}
          className={`w-full max-w-[240px] flex items-center gap-2 rounded-lg px-3 py-2 text-xs border ${
            item.you
              ? 'border-primary/50 bg-primary/10 text-primary font-semibold'
              : 'border-border/40 bg-card/40 text-muted-foreground'
          }`}
          initial={{ opacity: 0, x: -20 }}
          animate={active ? { opacity: 1, x: 0 } : { opacity: 0.4, x: 0 }}
          transition={{ delay: active ? i * 0.15 + 0.2 : 0 }}
        >
          <span className="font-mono text-[10px] w-5 shrink-0 opacity-60">{item.pos}</span>
          <span className="flex-1 truncate">{item.name}</span>
          {item.boost && (
            <motion.span
              className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              BOOSTED
            </motion.span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function LiveDemo({ active }: { active: boolean }) {
  return (
    <div className="relative h-full flex flex-col items-center justify-center gap-3 px-4">
      <motion.div
        className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
        animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <Play className="w-6 h-6 text-primary ml-0.5" />
        {active && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/40"
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </motion.div>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
              </span>
              <span className="text-xs font-bold text-destructive uppercase tracking-wider">Live</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Streamer is reviewing your track...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DEMOS: Record<string, React.FC<{ active: boolean }>> = {
  link: LinkDemo,
  queue: QueueDemo,
  live: LiveDemo,
};

export function HowItWorks() {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="py-14 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            {t('howItWorks.title')}
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Click each step to see how it works — then try it for real.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {STEPS.map((item, index) => {
            const isActive = activeStep === index;
            const DemoComponent = DEMOS[item.demo];

            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActiveStep(index)}
                className={`group relative rounded-xl border cursor-pointer transition-all duration-300 overflow-hidden ${
                  isActive
                    ? 'border-primary/50 bg-card/80 shadow-lg shadow-primary/10'
                    : 'border-border/40 bg-card/30 hover:border-border/60'
                }`}
              >
                {/* Step header */}
                <div className="p-4 pb-2 flex items-center gap-3">
                  <motion.div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                      isActive ? 'bg-primary/20' : 'bg-muted/40'
                    }`}
                    animate={isActive ? { rotate: [0, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground/50">{item.step}</span>
                      <h3 className="font-display font-semibold text-sm">{item.title}</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  </div>
                </div>

                {/* Interactive demo area */}
                <motion.div
                  className="relative overflow-hidden border-t border-border/20"
                  animate={{ height: isActive ? 140 : 0, opacity: isActive ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <DemoComponent active={isActive} />
                </motion.div>

                {/* Step indicator */}
                <motion.div
                  className="h-0.5 bg-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isActive ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ transformOrigin: 'left' }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-sm hover:brightness-110 transition-all"
          >
            Find a Streamer & Submit
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
