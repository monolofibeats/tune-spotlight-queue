import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

interface PriorityAlert {
  id: string;
  artistName: string;
  songTitle: string;
}

export function PrioritySubmissionAlert({ streamerId }: { streamerId: string }) {
  const [alerts, setAlerts] = useState<PriorityAlert[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { language } = useLanguage();

  // Preload SFX
  useEffect(() => {
    audioRef.current = new Audio('/sfx/fairy-sparkle.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  const showAlert = useCallback((alert: PriorityAlert) => {
    setAlerts(prev => [...prev, alert]);
    audioRef.current?.play().catch(() => {});
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 5000);
  }, []);

  useEffect(() => {
    // Mark all existing priority submissions as seen on mount
    const loadExisting = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id')
        .eq('streamer_id', streamerId)
        .eq('is_priority', true)
        .neq('status', 'deleted');
      if (data) {
        data.forEach(s => seenIdsRef.current.add(s.id));
      }
      initialLoadRef.current = false;
    };
    loadExisting();

    const channel = supabase
      .channel(`priority-alerts-${streamerId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'submissions',
        filter: `streamer_id=eq.${streamerId}`,
      }, (payload) => {
        const row = payload.new as any;
        if (row.is_priority && row.amount_paid > 0 && !seenIdsRef.current.has(row.id) && !initialLoadRef.current) {
          seenIdsRef.current.add(row.id);
          showAlert({
            id: row.id,
            artistName: row.artist_name || 'Someone',
            songTitle: row.song_title || 'a track',
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamerId, showAlert]);

  const getMessage = (artistName: string, songTitle: string) => {
    if (language === 'de') {
      return `${artistName} mit "${songTitle}" lässt nicht auf sich warten!`;
    }
    return `${artistName} with "${songTitle}" isn't waiting around!`;
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none max-w-md">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 120, scale: 0.8, rotateZ: 5 }}
            animate={{ opacity: 1, x: 0, scale: 1, rotateZ: 0 }}
            exit={{ opacity: 0, x: 120, scale: 0.7, rotateZ: -3 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            className="relative pointer-events-auto overflow-hidden rounded-2xl"
          >
            {/* Glow background */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-orange-500/30 blur-xl animate-pulse" />
            
            {/* Card */}
            <div className="relative bg-card/80 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-4 shadow-[0_0_40px_-8px_hsl(45_90%_50%/0.4)]">
              {/* Sparkle particles */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-amber-400"
                    initial={{
                      x: `${20 + Math.random() * 60}%`,
                      y: `${20 + Math.random() * 60}%`,
                      opacity: 0,
                      scale: 0,
                    }}
                    animate={{
                      y: [`${50 + Math.random() * 30}%`, `${-10 - Math.random() * 20}%`],
                      x: [`${20 + Math.random() * 60}%`, `${10 + Math.random() * 80}%`],
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                    }}
                    transition={{
                      duration: 1.5 + Math.random() * 1,
                      delay: Math.random() * 0.8,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="relative flex items-start gap-3">
                {/* Icon */}
                <motion.div
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
                  animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <Zap className="w-5 h-5 text-background fill-background" />
                </motion.div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {language === 'de' ? 'Priority!' : 'Priority!'}
                    </span>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </div>

                  {/* Message */}
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {getMessage(alert.artistName, alert.songTitle)}
                  </p>
                </div>
              </div>

              {/* Animated border shimmer */}
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, hsl(45 90% 50% / 0.3), transparent)',
                  backgroundSize: '200% 100%',
                }}
                animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
