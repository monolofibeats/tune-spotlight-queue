import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring, useVelocity } from 'framer-motion';

interface WaveParticle {
  id: number;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  waveOffset: number;
  floatOffset: number;
  floatSpeed: number;
}

export function SoundwaveBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { damping: 50, stiffness: 100 });
  const scrollVelocity = useVelocity(scrollYProgress);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 300 });
  
  const waveFormation = useTransform(smoothProgress, [0, 0.5, 1], [0, 0.6, 1]);
  const waveAmplitude = useTransform(smoothProgress, [0, 0.5, 1], [80, 50, 30]);
  const waveFrequency = useTransform(smoothProgress, [0, 1], [0.5, 2]);
  
  const particles = useMemo(() => {
    const count = 100;
    const list: WaveParticle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        baseX: (i / count) * 100,
        baseY: 50 + (Math.random() - 0.5) * 60,
        x: (i / count) * 100,
        y: 50,
        size: Math.random() * 8 + 6,
        opacity: Math.random() * 0.3 + 0.7,
        waveOffset: Math.random() * Math.PI * 2,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 0.4,
      });
    }
    return list;
  }, []);

  const [animatedParticles, setAnimatedParticles] = useState(particles);

  useEffect(() => {
    if (!mounted) return;
    
    let animationId: number;
    
    const animate = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;
      
      let formation = 0, amplitude = 60, frequency = 1, velocity = 0;
      try {
        const f = waveFormation.get();
        const a = waveAmplitude.get();
        const fr = waveFrequency.get();
        const v = smoothVelocity.get();
        formation = Number.isFinite(f) ? f : 0;
        amplitude = Number.isFinite(a) ? a : 60;
        frequency = Number.isFinite(fr) ? fr : 1;
        velocity = Number.isFinite(v) ? Math.abs(v) * 50 : 0;
      } catch {}
      
      setAnimatedParticles(prev => prev.map((p, i) => {
        const waveY = 50 + Math.sin((p.baseX * 0.1 * frequency) + time * 2 + p.waveOffset) * amplitude * 0.5;
        const floatX = Math.sin(time * p.floatSpeed + p.floatOffset) * 12;
        const floatY = Math.cos(time * p.floatSpeed * 0.7 + p.floatOffset) * 25;
        const chaoticX = p.baseX + floatX;
        const chaoticY = p.baseY + floatY;
        
        const xRaw = chaoticX + (p.baseX - chaoticX) * formation;
        const yRaw = chaoticY + (waveY - chaoticY) * formation + velocity * Math.sin(time * 5 + i) * 2;
        const opRaw = p.opacity * (0.85 + Math.sin(time * 2 + i * 0.1) * 0.15) * (0.7 + formation * 0.3);

        return {
          ...p,
          x: Number.isFinite(xRaw) ? Math.max(0, Math.min(100, xRaw)) : p.x,
          y: Number.isFinite(yRaw) ? Math.max(0, Math.min(100, yRaw)) : p.y,
          opacity: Number.isFinite(opRaw) ? opRaw : p.opacity,
        };
      }));
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [mounted, waveFormation, waveAmplitude, waveFrequency, smoothVelocity]);

  const gradientOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.4, 0.6, 0.8]);

  return (
    <div 
      ref={containerRef}
      data-soundwave="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {/* Gradient glow */}
      <motion.div className="absolute inset-0" style={{ opacity: gradientOpacity }}>
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(250, 204, 21, 0.12) 0%, transparent 60%)' }}
          animate={{ scale: [1, 1.02, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Particles as DIVs for guaranteed visibility */}
      {animatedParticles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: '#facc15',
            opacity: p.opacity,
            boxShadow: '0 0 8px 2px rgba(250, 204, 21, 0.6)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Connection lines as SVG */}
      <svg className="absolute inset-0 w-full h-full" style={{ mixBlendMode: 'screen' }}>
        {animatedParticles.map((p, i) => {
          const next = animatedParticles[i + 1];
          if (!next || Math.abs(p.x - next.x) > 2.5) return null;
          return (
            <line
              key={`line-${p.id}`}
              x1={`${p.x}%`}
              y1={`${p.y}%`}
              x2={`${next.x}%`}
              y2={`${next.y}%`}
              stroke="#facc15"
              strokeWidth="1"
              opacity={Math.min(p.opacity, next.opacity) * 0.4}
            />
          );
        })}
      </svg>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(#facc15 1px, transparent 1px), linear-gradient(90deg, #facc15 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  );
}
