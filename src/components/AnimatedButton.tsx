import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import { useSoundEffects, SoundEffect } from '@/hooks/useSoundEffects';

interface AnimatedButtonProps extends ButtonProps {
  sound?: SoundEffect;
  haptic?: boolean;
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ sound = 'click', haptic = true, onClick, children, ...props }, ref) => {
    const { play } = useSoundEffects();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      play(sound);
      
      // Haptic feedback for mobile
      if (haptic && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
      
      onClick?.(e);
    };

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Button ref={ref} onClick={handleClick} {...props}>
          {children}
        </Button>
      </motion.div>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';
