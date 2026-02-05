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
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
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
  
  // Generate particles
  const particles = useMemo(() => {
    const count = 120;
    const particleList: WaveParticle[] = [];
    
    for (let i = 0; i < count; i++) {
      particleList.push({
        id: i,
        baseX: (i / count) * 100,
        baseY: 50 + (Math.random() - 0.5) * 60, // Scattered initially
        x: (i / count) * 100,
        y: 50,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        waveOffset: Math.random() * Math.PI * 2,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.5 + Math.random() * 0.5,
      });
    }
    
    return particleList;
  }, []);

  const [animatedParticles, setAnimatedParticles] = useState(particles);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      timeRef.current += 0.016; // ~60fps
      const time = timeRef.current;
      
      const formation = waveFormation.get();
      const amplitude = waveAmplitude.get();
      const frequency = waveFrequency.get();
      const velocity = Math.abs(smoothVelocity.get()) * 50;
      
      setAnimatedParticles(prev => prev.map((particle, i) => {
        // Calculate wave position (clean soundwave)
        const waveX = particle.baseX;
        const waveY = 50 + Math.sin((particle.baseX * 0.1 * frequency) + time * 2 + particle.waveOffset) * amplitude * 0.5;
        
        // Add velocity-based distortion
        const velocityDistortion = velocity * Math.sin(time * 5 + i) * 2;
        
        // Calculate chaotic position (scattered)
        const chaoticX = particle.baseX + Math.sin(time * particle.floatSpeed + particle.floatOffset) * 8;
        const chaoticY = particle.baseY + Math.cos(time * particle.floatSpeed * 0.7 + particle.floatOffset) * 15;
        
        // Interpolate between chaotic and wave based on scroll
        const x = chaoticX + (waveX - chaoticX) * formation;
        const y = chaoticY + (waveY - chaoticY) * formation + velocityDistortion;
        
        // Pulsing opacity based on formation and position
        const pulseOpacity = particle.opacity * (0.8 + Math.sin(time * 2 + i * 0.1) * 0.2);
        const formationOpacity = pulseOpacity * (0.5 + formation * 0.5);
        
        return {
          ...particle,
          x,
          y,
          opacity: formationOpacity,
        };
      }));
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [waveFormation, waveAmplitude, waveFrequency, smoothVelocity]);

  // Background gradient that shifts with scroll
  const gradientOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.3, 0.5, 0.7]);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{ opacity: gradientOpacity }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 50%, hsl(var(--primary) / 0.08) 0%, transparent 60%)
            `,
          }}
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Soundwave particles */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
          if (distance > 3) return null;
          
          return (
            <motion.line
              key={`line-${particle.id}`}
              x1={`${particle.x}%`}
              y1={`${particle.y}%`}
              x2={`${nextParticle.x}%`}
              y2={`${nextParticle.y}%`}
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              opacity={Math.min(particle.opacity, nextParticle.opacity) * 0.3}
            />
          );
        })}
        
        {/* Particles */}
        {animatedParticles.map(particle => (
          <motion.circle
            key={particle.id}
            cx={`${particle.x}%`}
            cy={`${particle.y}%`}
            r={particle.size}
            fill="hsl(var(--primary))"
            opacity={particle.opacity}
            filter="url(#glow)"
          />
        ))}
      </svg>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
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
        className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.015] to-transparent"
        style={{ height: '300%' }}
        animate={{ y: ['-200%', '0%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
