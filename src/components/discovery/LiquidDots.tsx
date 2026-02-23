import { motion } from 'framer-motion';
import { useMemo } from 'react';

function generateDots() {
  const dots: { x: string; y: string; size: number; duration: number; delay: number }[] = [];
  for (let i = 0; i < 60; i++) {
    dots.push({
      x: `${5 + Math.random() * 90}%`,
      y: `${5 + Math.random() * 90}%`,
      size: 2 + Math.random() * 2,
      duration: 5 + Math.random() * 6,
      delay: Math.random() * 4,
    });
  }
  return dots;
}

const staticDots = generateDots();

export function LiquidDots() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {staticDots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-foreground/20"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
          }}
          animate={{
            x: [0, 8, -6, 4, 0],
            y: [0, -7, 5, -3, 0],
            opacity: [0.15, 0.4, 0.1, 0.3, 0.15],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: dot.delay,
          }}
        />
      ))}
    </div>
  );
}
