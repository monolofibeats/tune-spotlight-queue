import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Timer, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SpecialEvent {
  id: string;
  title: string;
  description: string | null;
  reward: string;
  is_active: boolean;
  start_time: string;
  end_time: string | null;
}

export function SpecialEventBanner() {
  const [event, setEvent] = useState<SpecialEvent | null>(null);

  useEffect(() => {
    const fetchActiveEvent = async () => {
      const { data, error } = await supabase
        .from('special_events')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setEvent(data);
      }
    };

    fetchActiveEvent();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('special_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_events',
        },
        () => {
          fetchActiveEvent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!event) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-lg p-4 border border-primary/30 bg-primary/5 relative overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Event
              </span>
            </div>
            <h3 className="text-sm font-display font-bold mb-0.5 truncate">
              {event.title}
            </h3>
            <div className="flex items-center gap-1.5">
              <Gift className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary">
                {event.reward}
              </span>
            </div>
          </div>

          {event.end_time && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
              <Timer className="w-3 h-3" />
              <span>{new Date(event.end_time).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
