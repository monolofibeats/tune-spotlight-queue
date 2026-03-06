import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const { language } = useLanguage();

  const showAlert = useCallback((alert: PriorityAlert) => {
    setAlerts(prev => [...prev, alert]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 6000);
  }, []);

  useEffect(() => {
    const loadExisting = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id')
        .eq('streamer_id', streamerId)
        .eq('is_priority', true)
        .neq('status', 'deleted');
      if (data) data.forEach(s => seenIdsRef.current.add(s.id));
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
        if (row.is_priority && !seenIdsRef.current.has(row.id) && !initialLoadRef.current) {
          seenIdsRef.current.add(row.id);
          showAlert({
            id: row.id,
            artistName: row.artist_name || 'Someone',
            songTitle: row.song_title || 'a track',
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'submissions',
        filter: `streamer_id=eq.${streamerId}`,
      }, (payload) => {
        const row = payload.new as any;
        const old = payload.old as any;
        if (row.is_priority && !old.is_priority && !seenIdsRef.current.has(row.id) && !initialLoadRef.current) {
          seenIdsRef.current.add(row.id);
          showAlert({
            id: row.id,
            artistName: row.artist_name || 'Someone',
            songTitle: row.song_title || 'a track',
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamerId, showAlert]);

  const getMessage = (artistName: string, songTitle: string) => {
    if (language === 'de') {
      return (
        <>
          <span className="font-bold text-primary">{artistName}</span>
          {' mit '}
          <span className="italic text-primary/80">"{songTitle}"</span>
          {' lässt nicht auf sich warten! ⚡'}
        </>
      );
    }
    return (
      <>
        <span className="font-bold text-primary">{artistName}</span>
        {' with '}
        <span className="italic text-primary/80">"{songTitle}"</span>
        {' isn\'t waiting around! ⚡'}
      </>
    );
  };

  if (alerts.length === 0) return null;

  return (
    <div className="w-full space-y-1.5 py-1">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="relative text-center py-2 px-4 rounded-lg bg-primary/5 border border-primary/15">
              {/* Subtle shimmer */}
              <motion.div
                className="absolute inset-0 rounded-lg pointer-events-none opacity-30"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.15) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                }}
                animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                transition={{ duration: 3, repeat: 1, ease: 'linear' }}
              />
              <p className="relative text-sm text-foreground/90">
                {getMessage(alert.artistName, alert.songTitle)}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
