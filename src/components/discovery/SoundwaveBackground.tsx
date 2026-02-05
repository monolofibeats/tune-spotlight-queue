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
    const count = 80;
    const list: WaveParticle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        baseX: (i / count) * 100,
        baseY: 50 + (Math.random() - 0.5) * 50,
        x: (i / count) * 100,
        y: 50,
        size: Math.random() * 10 + 8,
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
        const floatX = Math.sin(time * p.floatSpeed + p.floatOffset) * 10;
        const floatY = Math.cos(time * p.floatSpeed * 0.7 + p.floatOffset) * 20;
        const chaoticX = p.baseX + floatX;
        const chaoticY = p.baseY + floatY;
        
        const xRaw = chaoticX + (p.baseX - chaoticX) * formation;
        const yRaw = chaoticY + (waveY - chaoticY) * formation + velocity * Math.sin(time * 5 + i) * 2;
        const opRaw = p.opacity * (0.85 + Math.sin(time * 2 + i * 0.1) * 0.15) * (0.7 + formation * 0.3);

        return {
          ...p,
          x: Number.isFinite(xRaw) ? Math.max(2, Math.min(98, xRaw)) : p.x,
          y: Number.isFinite(yRaw) ? Math.max(10, Math.min(90, yRaw)) : p.y,
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'visible',
      }}
    >
      {/* Gradient glow */}
      <motion.div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: gradientOpacity 
        }}
      >
        <motion.div
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(250, 204, 21, 0.12) 0%, transparent 60%)' 
          }}
          animate={{ scale: [1, 1.02, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Particles */}
      {mounted && animatedParticles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: '#facc15',
            opacity: p.opacity,
            boxShadow: '0 0 12px 4px rgba(250, 204, 21, 0.5)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Connection lines */}
      <svg 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          mixBlendMode: 'screen',
        }}
      >
        {mounted && animatedParticles.map((p, i) => {
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
              strokeWidth="1.5"
              opacity={Math.min(p.opacity, next.opacity) * 0.5}
            />
          );
        })}
      </svg>

      {/* Grid overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.025,
          backgroundImage: 'linear-gradient(#facc15 1px, transparent 1px), linear-gradient(90deg, #facc15 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  );
}
