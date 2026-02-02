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
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="glass-strong rounded-2xl p-4 md:p-6 border-2 border-primary/30 relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 animate-pulse" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/20 shrink-0">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Special Event
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-display font-bold mb-1">
              {event.title}
            </h3>
            {event.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {event.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Reward: {event.reward}
              </span>
            </div>
          </div>

          {event.end_time && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="w-4 h-4" />
              <span>Ends {new Date(event.end_time).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
