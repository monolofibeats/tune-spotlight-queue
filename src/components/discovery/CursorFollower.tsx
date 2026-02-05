import { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export function CursorFollower() {
  const [isVisible, setIsVisible] = useState(false);

  const springConfig = { damping: 20, stiffness: 150, mass: 0.8 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', handleMouseLeave);
    document.body.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [x, y]);

  return (
    <>
      {/* Yellow blurry dot cursor */}
      <motion.div
        className="fixed pointer-events-none z-[9999] rounded-full"
        style={{
          x,
          y,
          width: 24,
          height: 24,
          marginLeft: -12,
          marginTop: -12,
          background: 'hsl(50 100% 50%)',
          filter: 'blur(8px)',
          boxShadow: '0 0 20px hsl(50 100% 50% / 0.8), 0 0 40px hsl(50 100% 50% / 0.4)',
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: isVisible ? 0.9 : 0, 
          scale: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      />

      {/* Outer glow */}
      <motion.div
        className="fixed pointer-events-none z-[9998] rounded-full"
        style={{
          x,
          y,
          width: 60,
          height: 60,
          marginLeft: -30,
          marginTop: -30,
          background: 'radial-gradient(circle, hsl(50 100% 50% / 0.15) 0%, transparent 70%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </>
  );
}