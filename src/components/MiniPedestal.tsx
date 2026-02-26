import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Medal, Award } from 'lucide-react';

interface MiniPedestalProps {
  onSelect: (position: number) => void;
}

// Confetti particle type
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  vx: number;
  vy: number;
}

const POSITION_CONFIG = [
  {
    pos: 2,
    label: 'Silver',
    Icon: Medal,
    height: 'h-5',
    iconColor: 'text-slate-300',
    bgGradient: 'from-slate-400/25 via-slate-300/10 to-transparent',
    borderColor: 'border-slate-400/40',
    glowColor: 'slate-300',
    numColor: 'text-slate-300',
    confettiColors: ['#cbd5e1', '#94a3b8', '#e2e8f0', '#f1f5f9'],
    iconBg: 'bg-slate-400/20',
  },
  {
    pos: 1,
    label: 'Gold',
    Icon: Crown,
    height: 'h-7',
    iconColor: 'text-yellow-400',
    bgGradient: 'from-yellow-600/30 via-yellow-500/15 to-transparent',
    borderColor: 'border-yellow-500/40',
    glowColor: 'yellow-400',
    numColor: 'text-yellow-400',
    confettiColors: ['#fbbf24', '#f59e0b', '#fcd34d', '#fef3c7', '#eab308'],
    iconBg: 'bg-yellow-500/20',
  },
  {
    pos: 3,
    label: 'Bronze',
    Icon: Award,
    height: 'h-4',
    iconColor: 'text-amber-600',
    bgGradient: 'from-amber-700/25 via-amber-600/10 to-transparent',
    borderColor: 'border-amber-700/40',
    glowColor: 'amber-600',
    numColor: 'text-amber-600',
    confettiColors: ['#d97706', '#b45309', '#f59e0b', '#fbbf24'],
    iconBg: 'bg-amber-700/20',
  },
];

function ConfettiCanvas({ colors, onDone }: { colors: string[]; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 120;
    canvas.height = 100;

    // Create particles
    const particles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        id: i,
        x: 60,
        y: 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 1,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 5 - 2,
      });
    }
    particlesRef.current = particles;

    let frame = 0;
    const maxFrames = 60;

    const animate = () => {
      if (frame >= maxFrames) {
        onDone();
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.15; // gravity
        p.y += p.vy;
        p.rotation += 3;
        const alpha = 1 - frame / maxFrames;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        // Draw small rectangles and circles
        if (p.id % 3 === 0) {
          ctx.fillRect(-2 * p.scale, -1 * p.scale, 4 * p.scale, 2 * p.scale);
        } else if (p.id % 3 === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, 2 * p.scale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Small star shape
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            const angle = (s * 4 * Math.PI) / 5 - Math.PI / 2;
            const r = s % 2 === 0 ? 3 * p.scale : 1.5 * p.scale;
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      frame++;
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [colors, onDone]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

export function MiniPedestal({ onSelect }: MiniPedestalProps) {
  const [animatingPos, setAnimatingPos] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = useCallback((pos: number) => {
    // Trigger animation
    setAnimatingPos(pos);
    setShowConfetti(pos);

    // Play SFX with slight pitch variation per position
    try {
      const audio = new Audio('/sfx/crowd-ohh.mp3');
      // Vary playback rate: Gold = normal, Silver = slightly higher, Bronze = slightly lower
      audio.playbackRate = pos === 1 ? 1.0 : pos === 2 ? 1.1 : 0.9;
      audio.volume = pos === 1 ? 0.7 : 0.5;
      audio.play().catch(() => {});
      audioRef.current = audio;
    } catch {
      // SFX not critical
    }

    // Call parent handler
    onSelect(pos);

    // Reset animation after delay
    setTimeout(() => setAnimatingPos(null), 800);
  }, [onSelect]);

  const handleConfettiDone = useCallback(() => {
    setShowConfetti(null);
  }, []);

  return (
    <div className="flex items-end justify-center gap-1.5 py-1">
      {POSITION_CONFIG.map(({ pos, Icon, height, iconColor, bgGradient, borderColor, numColor, confettiColors, iconBg }) => {
        const isAnimating = animatingPos === pos;

        return (
          <motion.button
            key={pos}
            onClick={() => handleClick(pos)}
            className={`relative flex flex-col items-center ${
              pos === 1 ? 'w-10' : 'w-8'
            } cursor-pointer group`}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            title={`Add to Spot #${pos}`}
          >
            {/* Confetti overlay */}
            <AnimatePresence>
              {showConfetti === pos && (
                <ConfettiCanvas colors={confettiColors} onDone={handleConfettiDone} />
              )}
            </AnimatePresence>

            {/* Icon */}
            <motion.div
              className={`flex items-center justify-center rounded-full mb-0.5 z-10 ${iconBg} ${
                pos === 1 ? 'w-7 h-7' : 'w-6 h-6'
              }`}
              animate={isAnimating ? {
                scale: [1, 1.8, 1.3, 1],
                rotate: [0, -10, 10, 0],
              } : { scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <Icon className={`${pos === 1 ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${iconColor}`} />
            </motion.div>

            {/* Podium block */}
            <div
              className={`w-full ${height} rounded-t-md border border-b-0 bg-gradient-to-t ${bgGradient} ${borderColor} flex items-center justify-center transition-all group-hover:border-primary/40 ${
                isAnimating ? 'shadow-lg' : ''
              }`}
            >
              <span className={`text-[10px] font-black font-display ${numColor}`}>
                {pos}
              </span>
            </div>

            {/* Base */}
            <div className={`w-[calc(100%+4px)] h-0.5 rounded-b-sm ${
              pos === 1 ? 'bg-yellow-500/40' : pos === 2 ? 'bg-slate-400/40' : 'bg-amber-700/40'
            }`} />

            {/* Glow ring on animation */}
            <AnimatePresence>
              {isAnimating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 0.6, 0], scale: [0.5, 2, 2.5] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                  className={`absolute inset-0 rounded-full z-0 ${
                    pos === 1 ? 'bg-yellow-400/20' : pos === 2 ? 'bg-slate-300/20' : 'bg-amber-600/20'
                  }`}
                />
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
