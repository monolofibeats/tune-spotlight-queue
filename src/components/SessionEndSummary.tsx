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
      const duration = 1400;
      const fps = 60;
      const steps = Math.round(duration / (1000 / fps));
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const eased = 1 - Math.pow(1 - step / steps, 3);
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

const LAND_DELAY = 0.6;
const EXPAND_DELAY = LAND_DELAY + 0.05;
const STATS_DELAY = LAND_DELAY + 0.55;

export function SessionEndSummary({ open, onClose, streamerId, startedAt, endedAt }: SessionEndSummaryProps) {
  const [stats, setStats] = useState<{
    durationSeconds: number;
    totalSubmissions: number;
    prioritySubmissions: number;
    totalEarnings: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setStats(null);
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backdropFilter: 'blur(22px)', backgroundColor: 'hsl(var(--background) / 0.78)' }}
        >
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: STATS_DELAY + 0.4 }}
            onClick={onClose}
            className="absolute top-6 right-6 z-30 w-9 h-9 rounded-full bg-background/60 border border-border/50 flex items-center justify-center hover:bg-background/90 transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>

          {/* Ambient background glow */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 2.2, opacity: 0.22 }}
            transition={{ delay: EXPAND_DELAY, duration: 1.0, ease: 'easeOut' }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div
              className="w-[500px] h-[500px] rounded-full bg-primary"
              style={{ filter: 'blur(120px)' }}
            />
          </motion.div>

          {/* ── THE STAR: shoots in, expands to fill center ── */}
          <div className="relative flex items-center justify-center" style={{ width: 780, height: 680 }}>

            {/* Phase 1: shooting star flying in */}
            <motion.img
              src={shootingStar}
              alt=""
              aria-hidden
              initial={{ x: '-120vw', y: '15vh', rotate: -22, scale: 0.9, opacity: 1 }}
              animate={{ x: 0, y: 0, rotate: 0, scale: [0.9, 1.05, 1], opacity: 1 }}
              transition={{ duration: LAND_DELAY, ease: [0.12, 0.9, 0.28, 1] }}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
              style={{ filter: 'drop-shadow(0 0 60px hsl(45 95% 55%)) drop-shadow(0 0 120px hsl(45 90% 50% / 0.6))' }}
            />

            {/* Shockwave on landing */}
            <motion.div
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 3.5, opacity: 0 }}
              transition={{ delay: LAND_DELAY - 0.02, duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full pointer-events-none z-20"
              style={{ background: 'radial-gradient(circle, hsl(45 95% 65% / 0.8) 0%, transparent 65%)' }}
            />

            {/* ── Stats overlaid on the star ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: STATS_DELAY, duration: 0.4 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 px-24 pt-6"
            >
              {/* Session complete label */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: STATS_DELAY + 0.05 }}
                className="flex items-center gap-2 mb-1"
              >
                <Mic2 className="w-5 h-5 text-white/90" />
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-white/90"
                  style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
                  Session Complete
                </span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: STATS_DELAY + 0.1, type: 'spring', stiffness: 300, damping: 22 }}
                className="text-4xl font-black tracking-tight text-white mb-2"
                style={{ textShadow: '0 3px 20px rgba(0,0,0,0.7)' }}
              >
                Stream Recap
              </motion.h2>

              {/* Stats 2×2 grid */}
              {!stats ? (
                <div className="grid grid-cols-2 gap-3 w-full max-w-[380px]">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-2xl bg-black/30 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 w-full max-w-[380px]">
                  {[
                    { icon: Clock, label: 'Duration', value: <CountUp to={Math.floor(stats.durationSeconds / 60)} suffix="m" delay={(STATS_DELAY + 0.2) * 1000} /> },
                    { icon: Music2, label: 'Submissions', value: <CountUp to={stats.totalSubmissions} delay={(STATS_DELAY + 0.3) * 1000} /> },
                    { icon: Star, label: 'Priority', value: <CountUp to={stats.prioritySubmissions} delay={(STATS_DELAY + 0.4) * 1000} /> },
                    { icon: Euro, label: 'Earnings', value: <CountUp to={stats.totalEarnings} decimals={2} prefix="€" delay={(STATS_DELAY + 0.5) * 1000} /> },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, scale: 0.75, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: STATS_DELAY + 0.18 + i * 0.07, type: 'spring', stiffness: 360, damping: 24 }}
                        className="flex flex-col items-center justify-center py-4 px-3 rounded-2xl"
                        style={{
                          background: 'rgba(0,0,0,0.62)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255,255,255,0.18)',
                          boxShadow: '0 6px 30px rgba(0,0,0,0.4)',
                        }}
                      >
                        <Icon className="w-5 h-5 text-yellow-300 mb-1.5" />
                        <span className="text-xs text-white/60 uppercase tracking-wider font-bold mb-1">{item.label}</span>
                        <span className="text-3xl font-black text-white leading-none">{item.value}</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Done button */}
              {stats && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: STATS_DELAY + 0.65 }}
                  className="mt-2"
                >
                  <button
                    onClick={onClose}
                    className="px-10 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all text-white"
                    style={{
                      background: 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.75)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')}
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
