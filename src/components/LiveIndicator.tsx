import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { useStreamSession } from '@/hooks/useStreamSession';

export function LiveIndicator() {
  const { isLive } = useStreamSession();

  if (!isLive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1]
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Radio className="w-4 h-4 text-red-500" />
      </motion.div>
      <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Live</span>
    </motion.div>
  );
}
