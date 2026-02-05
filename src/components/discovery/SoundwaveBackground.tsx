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
  const [isClient, setIsClient] = useState(false);
  
  // Ensure we're on client side before using scroll hooks
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { scrollYProgress } = useScroll();
  
  // Smooth scroll progress
  const smoothProgress = useSpring(scrollYProgress, { damping: 50, stiffness: 100 });
  
  // Get scroll velocity for reactivity
  const scrollVelocity = useVelocity(scrollYProgress);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 300 });
  
  // Transform scroll to wave formation (0 = chaotic, 1 = formed wave)
  const waveFormation = useTransform(smoothProgress, [0, 0.5, 1], [0, 0.6, 1]);
  const waveAmplitude = useTransform(smoothProgress, [0, 0.5, 1], [80, 50, 30]);
  const waveFrequency = useTransform(smoothProgress, [0, 1], [0.5, 2]);
  
  // Generate particles
  const particles = useMemo(() => {
    const count = 120;
    const particleList: WaveParticle[] = [];

    for (let i = 0; i < count; i++) {
      particleList.push({
        id: i,
        baseX: (i / count) * 100,
        baseY: 50 + (Math.random() - 0.5) * 60,
        x: (i / count) * 100,
        y: 50,
        size: Math.random() * 6 + 4,
        opacity: Math.random() * 0.3 + 0.7,
        waveOffset: Math.random() * Math.PI * 2,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 0.4,
      });
    }

    return particleList;
  }, []);

  const [animatedParticles, setAnimatedParticles] = useState(particles);

  useEffect(() => {
    if (!isClient) return;
    
    let animationId: number;
    
    const animate = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;
      
      let formation = 0;
      let amplitude = 60;
      let frequency = 1;
      let velocity = 0;

      try {
        const formationRaw = waveFormation.get();
        const amplitudeRaw = waveAmplitude.get();
        const frequencyRaw = waveFrequency.get();
        const velocityRaw = smoothVelocity.get();

        formation = Number.isFinite(formationRaw) ? formationRaw : 0;
        amplitude = Number.isFinite(amplitudeRaw) ? amplitudeRaw : 60;
        frequency = Number.isFinite(frequencyRaw) ? frequencyRaw : 1;
        velocity = Number.isFinite(velocityRaw) ? Math.abs(velocityRaw) * 50 : 0;
      } catch (e) {
        // Fallback values already set
      }
      
      setAnimatedParticles(prev => prev.map((particle, i) => {
        const waveX = particle.baseX;
        const waveY = 50 + Math.sin((particle.baseX * 0.1 * frequency) + time * 2 + particle.waveOffset) * amplitude * 0.5;
        
        const velocityDistortion = velocity * Math.sin(time * 5 + i) * 2;
        
        const floatX = Math.sin(time * particle.floatSpeed + particle.floatOffset) * 12;
        const floatY = Math.cos(time * particle.floatSpeed * 0.7 + particle.floatOffset) * 25;
        const chaoticX = particle.baseX + floatX;
        const chaoticY = particle.baseY + floatY;
        
        const xRaw = chaoticX + (waveX - chaoticX) * formation;
        const yRaw = chaoticY + (waveY - chaoticY) * formation + velocityDistortion;

        const pulseOpacityRaw = particle.opacity * (0.85 + Math.sin(time * 2 + i * 0.1) * 0.15);
        const formationOpacityRaw = pulseOpacityRaw * (0.7 + formation * 0.3);

        const x = Number.isFinite(xRaw) ? Math.max(0, Math.min(100, xRaw)) : particle.x;
        const y = Number.isFinite(yRaw) ? Math.max(0, Math.min(100, yRaw)) : particle.y;
        const opacity = Number.isFinite(formationOpacityRaw) ? formationOpacityRaw : particle.opacity;

        return { ...particle, x, y, opacity };
      }));
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isClient, waveFormation, waveAmplitude, waveFrequency, smoothVelocity]);

  const gradientOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.4, 0.6, 0.8]);

  // Always render the container - use visibility instead of conditional render
  return (
    <div 
      ref={containerRef} 
      id="soundwave-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {/* Animated gradient background */}
      <motion.div
        style={{ 
          position: 'absolute',
          inset: 0,
          opacity: gradientOpacity 
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(250, 204, 21, 0.15) 0%, transparent 60%)',
          }}
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.9, 1, 0.9],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Particle SVG */}
      <svg 
        style={{ 
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          mixBlendMode: 'screen',
        }}
      >
        <defs>
          <filter id="particleGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Connection lines */}
        {animatedParticles.map((particle, i) => {
          const nextParticle = animatedParticles[i + 1];
          if (!nextParticle) return null;
          
          const distance = Math.abs(particle.x - nextParticle.x);
          if (distance > 2.5) return null;
          
          return (
            <line
              key={`line-${particle.id}`}
              x1={`${particle.x}%`}
              y1={`${particle.y}%`}
              x2={`${nextParticle.x}%`}
              y2={`${nextParticle.y}%`}
              stroke="#facc15"
              strokeWidth="1"
              opacity={Math.min(particle.opacity, nextParticle.opacity) * 0.5}
            />
          );
        })}
        
        {/* Particles */}
        {animatedParticles.map(particle => (
          <circle
            key={particle.id}
            cx={`${particle.x}%`}
            cy={`${particle.y}%`}
            r={particle.size}
            fill="#facc15"
            opacity={particle.opacity}
            filter="url(#particleGlowFilter)"
          />
        ))}
      </svg>

      {/* Subtle grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          mixBlendMode: 'screen',
          opacity: 0.03,
          backgroundImage: `
            linear-gradient(#facc15 1px, transparent 1px),
            linear-gradient(90deg, #facc15 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Scan line */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          height: '300%',
          background: 'linear-gradient(to bottom, transparent, rgba(250, 204, 21, 0.02), transparent)',
        }}
        animate={{ y: ['-200%', '0%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
