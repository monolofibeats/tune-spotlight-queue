import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSoundEffects, SOUNDBOARD_EFFECTS } from '@/hooks/useSoundEffects';
import { useStreamSession } from '@/hooks/useStreamSession';

export function Soundboard() {
  const { play } = useSoundEffects();
  const { isLive } = useStreamSession();

  if (!isLive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/50 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Volume2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Soundboard</h3>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {SOUNDBOARD_EFFECTS.map((effect) => (
          <motion.div key={effect.id} whileTap={{ scale: 0.9 }}>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-auto py-2 flex flex-col items-center gap-1 hover:bg-primary/10 hover:border-primary/50"
              onClick={() => play(effect.id)}
            >
              <span className="text-lg">{effect.emoji}</span>
              <span className="text-[10px] text-muted-foreground">{effect.label}</span>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
