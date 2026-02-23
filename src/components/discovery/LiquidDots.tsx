import { motion } from 'framer-motion';

const dots = [
  { x: '12%', y: '18%', size: 6, duration: 7, delay: 0 },
  { x: '78%', y: '25%', size: 8, duration: 9, delay: 1.2 },
  { x: '45%', y: '60%', size: 5, duration: 8, delay: 0.5 },
  { x: '88%', y: '70%', size: 7, duration: 10, delay: 2 },
  { x: '25%', y: '80%', size: 9, duration: 11, delay: 0.8 },
  { x: '60%', y: '15%', size: 4, duration: 6, delay: 1.5 },
  { x: '35%', y: '42%', size: 6, duration: 8.5, delay: 3 },
  { x: '92%', y: '45%', size: 5, duration: 7.5, delay: 2.5 },
  { x: '8%', y: '55%', size: 8, duration: 9.5, delay: 1 },
  { x: '55%', y: '85%', size: 6, duration: 8, delay: 0.3 },
  { x: '70%', y: '50%', size: 4, duration: 7, delay: 3.5 },
  { x: '18%', y: '35%', size: 7, duration: 10, delay: 1.8 },
];

export function LiquidDots() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/[0.07]"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size * 8,
            height: dot.size * 8,
            filter: `blur(${dot.size * 3}px)`,
          }}
          animate={{
            x: [0, 30, -20, 15, 0],
            y: [0, -25, 15, -10, 0],
            scale: [1, 1.3, 0.8, 1.15, 1],
            opacity: [0.4, 0.7, 0.3, 0.6, 0.4],
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
