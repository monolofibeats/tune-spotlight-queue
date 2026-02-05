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
  
  // Generate particles - more particles with higher visibility
  const particles = useMemo(() => {
    const count = 180;
    const particleList: WaveParticle[] = [];
    
    for (let i = 0; i < count; i++) {
      particleList.push({
        id: i,
        baseX: (i / count) * 100,
        baseY: 50 + (Math.random() - 0.5) * 60,
        x: (i / count) * 100,
        y: 50,
        size: Math.random() * 5 + 3, // Larger particles
        opacity: Math.random() * 0.5 + 0.5, // Higher base opacity
        waveOffset: Math.random() * Math.PI * 2,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 0.4,
      });
    }
    
    return particleList;
  }, []);

  const [animatedParticles, setAnimatedParticles] = useState(particles);

  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;
      
      const formationRaw = waveFormation.get();
      const amplitudeRaw = waveAmplitude.get();
      const frequencyRaw = waveFrequency.get();
      const velocityRaw = smoothVelocity.get();

      const formation = Number.isFinite(formationRaw) ? formationRaw : 0;
      const amplitude = Number.isFinite(amplitudeRaw) ? amplitudeRaw : 60;
      const frequency = Number.isFinite(frequencyRaw) ? frequencyRaw : 1;
      const velocity = Number.isFinite(velocityRaw) ? Math.abs(velocityRaw) * 50 : 0;
      
      setAnimatedParticles(prev => prev.map((particle, i) => {
        // Calculate wave position (clean soundwave)
        const waveX = particle.baseX;
        const waveY = 50 + Math.sin((particle.baseX * 0.1 * frequency) + time * 2 + particle.waveOffset) * amplitude * 0.5;
        
        // Add velocity-based distortion
        const velocityDistortion = velocity * Math.sin(time * 5 + i) * 2;
        
        // Calculate chaotic position with smooth floating
        const floatX = Math.sin(time * particle.floatSpeed + particle.floatOffset) * 12;
        const floatY = Math.cos(time * particle.floatSpeed * 0.7 + particle.floatOffset) * 25;
        const chaoticX = particle.baseX + floatX;
        const chaoticY = particle.baseY + floatY;
        
        // Interpolate between chaotic and wave based on scroll
        const xRaw = chaoticX + (waveX - chaoticX) * formation;
        const yRaw = chaoticY + (waveY - chaoticY) * formation + velocityDistortion;

        // Pulsing opacity based on formation and position - keep high visibility
        const pulseOpacityRaw = particle.opacity * (0.85 + Math.sin(time * 2 + i * 0.1) * 0.15);
        const formationOpacityRaw = pulseOpacityRaw * (0.7 + formation * 0.3);

        const x = Number.isFinite(xRaw) ? xRaw : particle.x;
        const y = Number.isFinite(yRaw) ? yRaw : particle.y;
        const opacity = Number.isFinite(formationOpacityRaw) ? formationOpacityRaw : particle.opacity;

        return {
          ...particle,
          x,
          y,
          opacity,
        };
      }));
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [waveFormation, waveAmplitude, waveFrequency, smoothVelocity]);

  // Background gradient that shifts with scroll - smoother transitions
  const gradientOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.4, 0.6, 0.8]);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated gradient background - smoother */}
      <motion.div
        className="absolute inset-0"
        style={{ opacity: gradientOpacity }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 60%)
            `,
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

      {/* Soundwave particles - using regular div positioning for better visibility */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 1 }}>
        <defs>
          <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Connection lines between nearby particles */}
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
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              opacity={Math.min(particle.opacity, nextParticle.opacity) * 0.5}
            />
          );
        })}
        
        {/* Particles - larger and more visible */}
        {animatedParticles.map(particle => (
          <circle
            key={particle.id}
            cx={`${particle.x}%`}
            cy={`${particle.y}%`}
            r={particle.size}
            fill="hsl(var(--primary))"
            opacity={particle.opacity}
            filter="url(#particleGlow)"
          />
        ))}
      </svg>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Smooth scan line */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent"
        style={{ height: '300%' }}
        animate={{ y: ['-200%', '0%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
