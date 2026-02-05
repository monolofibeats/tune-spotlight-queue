import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  size: number;
  opacity: number;
  orbitAngle: number;
  orbitSpeed: number;
  orbitRadius: number;
}

export function InteractiveBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const mouseRef = useRef({ x: 50, y: 50, isMoving: false });
  const lastMousePos = useRef({ x: 50, y: 50 });
  const { scrollYProgress } = useScroll();
  
  // Smooth spring for gradient position
  const gradientX = useSpring(50, { damping: 40, stiffness: 30 });
  const gradientY = useSpring(50, { damping: 40, stiffness: 30 });
  const gradientOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.6, 0.35, 0.25, 0.15]);

  useEffect(() => {
    // Generate initial particles with smooth floating motion
    const initialParticles: Particle[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: 0,
      vy: 0,
      baseVx: (Math.random() - 0.5) * 0.15,
      baseVy: (Math.random() - 0.5) * 0.15,
      size: Math.random() * 3 + 1.5,
      opacity: Math.random() * 0.4 + 0.15,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitSpeed: (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
      orbitRadius: Math.random() * 3 + 2,
    }));
    setParticles(initialParticles);
  }, []);

  useEffect(() => {
    let moveTimeout: NodeJS.Timeout;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const newX = ((e.clientX - rect.left) / rect.width) * 100;
        const newY = ((e.clientY - rect.top) / rect.height) * 100;
        
        mouseRef.current = { x: newX, y: newY, isMoving: true };
        gradientX.set(newX);
        gradientY.set(newY);
        
        // Clear existing timeout and set new one
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
          mouseRef.current.isMoving = false;
        }, 150);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(moveTimeout);
    };
  }, [gradientX, gradientY]);

  // Physics simulation with smooth easing
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      setParticles(prev => prev.map(particle => {
        const mouse = mouseRef.current;
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Attraction radius
        const attractionRadius = 25;
        const orbitDistance = 8;
        
        let targetVx = particle.baseVx;
        let targetVy = particle.baseVy;
        
        if (distance < attractionRadius) {
          if (distance > orbitDistance) {
            // Smoothly attract toward cursor
            const attractionStrength = 0.03 * (1 - distance / attractionRadius);
            targetVx += dx * attractionStrength;
            targetVy += dy * attractionStrength;
          } else {
            // Orbit around cursor like an active crowd
            particle.orbitAngle += particle.orbitSpeed;
            const orbitX = Math.cos(particle.orbitAngle) * particle.orbitRadius;
            const orbitY = Math.sin(particle.orbitAngle) * particle.orbitRadius;
            
            const targetX = mouse.x + orbitX;
            const targetY = mouse.y + orbitY;
            
            targetVx = (targetX - particle.x) * 0.08;
            targetVy = (targetY - particle.y) * 0.08;
          }
        }
        
        // Smooth velocity interpolation (easing)
        const easing = 0.08;
        const newVx = particle.vx + (targetVx - particle.vx) * easing;
        const newVy = particle.vy + (targetVy - particle.vy) * easing;
        
        let newX = particle.x + newVx;
        let newY = particle.y + newVy;

        // Soft wrap around edges
        if (newX < -5) newX = 105;
        if (newX > 105) newX = -5;
        if (newY < -5) newY = 105;
        if (newY > 105) newY = -5;

        return { 
          ...particle, 
          x: newX, 
          y: newY, 
          vx: newVx, 
          vy: newVy,
        };
      }));
      
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated gradient mesh - smoother transitions */}
      <motion.div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: gradientOpacity,
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 40% at 50% 50%, hsl(var(--primary) / 0.12) 0%, transparent 60%)
            `,
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            x: useTransform(gradientX, [0, 100], [-100, 100]),
            y: useTransform(gradientY, [0, 100], [-50, 50]),
            background: `
              radial-gradient(ellipse 50% 35% at 50% 50%, hsl(var(--primary) / 0.1) 0%, transparent 55%)
            `,
          }}
        />
      </motion.div>

      {/* Floating particles */}
      <svg className="absolute inset-0 w-full h-full">
        {particles.map(particle => (
          <motion.circle
            key={particle.id}
            cx={`${particle.x}%`}
            cy={`${particle.y}%`}
            r={particle.size}
            fill="hsl(var(--primary))"
            opacity={particle.opacity}
            animate={{
              opacity: [particle.opacity * 0.8, particle.opacity, particle.opacity * 0.8],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </svg>

      {/* Subtle grid overlay */}
      <motion.div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Very subtle scan line - slower and smoother */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent"
        style={{ height: '200%' }}
        animate={{ y: ['-100%', '0%'] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
