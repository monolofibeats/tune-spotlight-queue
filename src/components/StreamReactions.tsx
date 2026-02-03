import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Reaction {
  id: string;
  emoji: string;
  x: number;
}

interface StreamReactionsProps {
  roomId: string;
}

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '🎵', '⭐', '💯', '🚀'];

export function StreamReactions({ roomId }: StreamReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`reactions:${roomId}`, {
      config: { broadcast: { self: true } },
    });

    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      const reaction: Reaction = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        emoji: payload.emoji,
        x: 10 + Math.random() * 80, // Random horizontal position
      };
      setReactions((prev) => [...prev.slice(-20), reaction]);

      // Remove reaction after animation
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3000);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const sendReaction = (emoji: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji },
      });
    }
  };

  return (
    <>
      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {reactions.map((reaction) => (
            <motion.div
              key={reaction.id}
              initial={{ opacity: 1, y: '100%', x: `${reaction.x}%` }}
              animate={{ opacity: 0, y: '-20%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: 'easeOut' }}
              className="absolute bottom-0 text-3xl"
              style={{ left: `${reaction.x}%` }}
            >
              {reaction.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction Buttons */}
      <div className="flex items-center gap-1 flex-wrap">
        {REACTION_EMOJIS.map((emoji) => (
          <motion.div key={emoji} whileTap={{ scale: 0.8 }}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-lg hover:bg-primary/10"
              onClick={() => sendReaction(emoji)}
            >
              {emoji}
            </Button>
          </motion.div>
        ))}
      </div>
    </>
  );
}
