import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music2, Clock, Euro, Star, TrendingUp, Mic2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import shootingStar from '@/assets/upstar-shooting-star.png';

interface SessionEndSummaryProps {
  open: boolean;
  onClose: () => void;
  streamerId: string;
  startedAt: string;
  endedAt: string;
}

function CountUp({ to, decimals = 0, prefix = '', suffix = '', delay = 0 }: {
  to: number; decimals?: number; prefix?: string; suffix?: string; delay?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1200;
      const fps = 60;
      const steps = Math.round(duration / (1000 / fps));
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(to * eased);
        if (step >= steps) { setValue(to); clearInterval(timer); }
      }, 1000 / fps);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(timeout);
  }, [to, delay]);

  return <>{prefix}{value.toFixed(decimals)}{suffix}</>;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function SessionEndSummary({ open, onClose, streamerId, startedAt, endedAt }: SessionEndSummaryProps) {
  const [stats, setStats] = useState<{
    durationSeconds: number;
    totalSubmissions: number;
    prioritySubmissions: number;
    totalEarnings: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchStats();
  }, [open]);

  const fetchStats = async () => {
    const [subRes, earningsRes] = await Promise.all([
      supabase.from('submissions').select('id, is_priority').eq('streamer_id', streamerId),
      supabase.from('streamer_earnings').select('streamer_share_cents').eq('streamer_id', streamerId),
    ]);

    const subs = subRes.data || [];
    const earnings = earningsRes.data || [];
    const durationSeconds = Math.max(0, Math.floor(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
    ));

    setStats({
      durationSeconds,
      totalSubmissions: subs.length,
      prioritySubmissions: subs.filter(s => s.is_priority).length,
      totalEarnings: earnings.reduce((sum, e) => sum + (e.streamer_share_cents || 0), 0) / 100,
    });
  };

  const cards = stats ? [
    {
      icon: Clock,
      label: 'Stream Duration',
      value: formatDuration(stats.durationSeconds),
      animatedValue: <CountUp to={Math.floor(stats.durationSeconds / 60)} suffix="m" delay={400} />,
      gradient: 'from-blue-500/20 to-blue-700/5',
      border: 'border-blue-500/25',
      iconColor: 'text-blue-400',
    },
    {
      icon: Music2,
      label: 'Submissions',
      value: stats.totalSubmissions,
      animatedValue: <CountUp to={stats.totalSubmissions} delay={550} />,
      gradient: 'from-violet-500/20 to-violet-700/5',
      border: 'border-violet-500/25',
      iconColor: 'text-violet-400',
    },
    {
      icon: Star,
      label: 'Priority Spots',
      value: stats.prioritySubmissions,
      animatedValue: <CountUp to={stats.prioritySubmissions} delay={700} />,
      gradient: 'from-amber-500/20 to-amber-700/5',
      border: 'border-amber-500/25',
      iconColor: 'text-amber-400',
    },
    {
      icon: Euro,
      label: 'Your Earnings',
      value: stats.totalEarnings,
      animatedValue: <CountUp to={stats.totalEarnings} decimals={2} prefix="€" delay={850} />,
      gradient: 'from-emerald-500/20 to-emerald-700/5',
      border: 'border-emerald-500/25',
      iconColor: 'text-emerald-400',
    },
  ] : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(18px)', backgroundColor: 'hsl(var(--background) / 0.82)' }}
        >
          {/* Shooting star animation */}
          <motion.img
            src={shootingStar}
            alt=""
            aria-hidden
            initial={{ x: '-30vw', y: '30vh', rotate: -30, opacity: 0, scale: 0.5 }}
            animate={{ x: '60vw', y: '-40vh', rotate: -30, opacity: [0, 1, 1, 0], scale: [0.5, 1.1, 1, 0.7] }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.1, times: [0, 0.2, 0.7, 1] }}
            className="absolute pointer-events-none z-10"
            style={{ width: 110, left: '50%', top: '50%', filter: 'drop-shadow(0 0 18px hsl(45 90% 60%))' }}
          />

          {/* Ambient glow blob */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1.6, opacity: 0.12 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary pointer-events-none"
            style={{ filter: 'blur(90px)' }}
          />

          <motion.div
            initial={{ scale: 0.86, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.06 }}
            className="relative w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Top accent bar */}
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.65, delay: 0.2, ease: 'easeOut' }}
              className="h-[3px] bg-gradient-to-r from-primary via-primary/50 to-transparent"
            />

            <div className="p-6 space-y-5">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 }}
                className="flex items-start justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Mic2 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">
                      Session Complete
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Stream Recap</h2>
                  <p className="text-sm text-muted-foreground">Here's how your stream went</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mt-1" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>

              {/* Stat cards */}
              {!stats ? (
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {cards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 18, scale: 0.93 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.32 + i * 0.07 }}
                        className={`relative rounded-xl border bg-gradient-to-br p-4 overflow-hidden ${card.gradient} ${card.border}`}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
                          <span className="text-[11px] text-muted-foreground">{card.label}</span>
                        </div>
                        <div className="text-2xl font-bold tracking-tight">
                          {card.animatedValue}
                        </div>
                        {/* Shimmer */}
                        <motion.div
                          initial={{ x: '-110%' }}
                          animate={{ x: '210%' }}
                          transition={{ delay: 0.9 + i * 0.1, duration: 0.75, ease: 'easeInOut' }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent -skew-x-12 pointer-events-none"
                        />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Footer tip */}
              {stats && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/8 border border-primary/15"
                >
                  <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {stats.totalSubmissions > 0
                      ? `Great stream! You received ${stats.totalSubmissions} submission${stats.totalSubmissions !== 1 ? 's' : ''} and earned €${stats.totalEarnings.toFixed(2)}.`
                      : 'Stream ended. No submissions were recorded this session.'}
                  </p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.05 }}
              >
                <Button onClick={onClose} className="w-full">Done</Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
