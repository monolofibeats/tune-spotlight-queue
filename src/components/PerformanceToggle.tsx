import { Sparkles, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePerformanceMode } from '@/hooks/usePerformanceMode';
import { motion } from 'framer-motion';

export function PerformanceToggle() {
  const { mode, toggleMode } = usePerformanceMode();
  const isHeavy = mode === 'heavy';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggleMode}
          className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{
            backgroundColor: isHeavy 
              ? 'hsl(var(--primary) / 0.3)' 
              : 'hsl(var(--muted))',
          }}
          aria-label={isHeavy ? 'Switch to light animations' : 'Switch to full animations'}
        >
          {/* Track glow for heavy mode */}
          {isHeavy && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: '0 0 12px hsl(var(--primary) / 0.4)',
              }}
              animate={{
                boxShadow: [
                  '0 0 8px hsl(var(--primary) / 0.3)',
                  '0 0 16px hsl(var(--primary) / 0.5)',
                  '0 0 8px hsl(var(--primary) / 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          
          {/* Thumb */}
          <motion.span
            className="pointer-events-none flex h-6 w-6 items-center justify-center rounded-full shadow-lg"
            style={{
              backgroundColor: isHeavy 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--foreground))',
            }}
            animate={{
              x: isHeavy ? 28 : 2,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {isHeavy ? (
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-background" />
            )}
          </motion.span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {isHeavy ? 'Full animations active' : 'Light mode (better performance)'}
      </TooltipContent>
    </Tooltip>
  );
}
