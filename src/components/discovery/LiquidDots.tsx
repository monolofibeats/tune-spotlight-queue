import { motion } from 'framer-motion';

function generateGridDots() {
  const dots: { x: string; y: string; size: number; duration: number; delay: number }[] = [];
  const cols = 20;
  const rows = 14;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jitterX = (Math.random() - 0.5) * 2;
      const jitterY = (Math.random() - 0.5) * 2;
      dots.push({
        x: `${(c / (cols - 1)) * 94 + 3 + jitterX}%`,
        y: `${(r / (rows - 1)) * 94 + 3 + jitterY}%`,
        size: 2 + Math.random() * 1.5,
        duration: 4 + Math.random() * 5,
        delay: Math.random() * 3,
      });
    }
  }
  return dots;
}

const gridDots = generateGridDots();

export function LiquidDots() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {gridDots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-foreground/40"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
          }}
          animate={{
            x: [0, 6, -4, 3, 0],
            y: [0, -5, 4, -2, 0],
            opacity: [0.3, 0.6, 0.2, 0.5, 0.3],
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
