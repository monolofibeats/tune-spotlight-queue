import { motion } from 'framer-motion';

function generateWaveDots() {
  const dots: { x: number; y: number; size: number; duration: number; delay: number }[] = [];
  const count = 200;
  
  for (let i = 0; i < count; i++) {
    // Base position with loose clustering
    const baseX = Math.random() * 100;
    const baseY = Math.random() * 100;
    
    // Apply sine wave distortion to Y based on X position
    const waveOffset = Math.sin((baseX / 100) * Math.PI * 3) * 12;
    const wave2 = Math.cos((baseX / 100) * Math.PI * 2 + 1.5) * 8;
    
    // Density variation — more dots cluster near wave peaks
    const densityBias = Math.abs(Math.sin((baseX / 100) * Math.PI * 2.5));
    if (Math.random() > 0.4 + densityBias * 0.4) continue;
    
    const y = baseY + waveOffset + wave2;
    if (y < 0 || y > 100) continue;
    
    dots.push({
      x: baseX,
      y,
      size: 1.5 + Math.random() * 2,
      duration: 5 + Math.random() * 7,
      delay: Math.random() * 4,
    });
  }
  return dots;
}

const waveDots = generateWaveDots();

export function LiquidDots() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {waveDots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-foreground/40"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
          }}
          animate={{
            x: [0, 10, -8, 5, 0],
            y: [0, -8, 6, -4, 0],
            opacity: [0.25, 0.55, 0.15, 0.45, 0.25],
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
