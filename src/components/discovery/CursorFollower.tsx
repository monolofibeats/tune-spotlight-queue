import { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';
import upstarCursor from '@/assets/upstar-cursor.png';

export function CursorFollower() {
  const [isVisible, setIsVisible] = useState(false);

  const springConfig = { damping: 30, stiffness: 180, mass: 0.5 };
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
      {/* Main cursor star */}
      <motion.div
        className="fixed pointer-events-none z-[9999]"
        style={{ x, y }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: isVisible ? 1 : 0, 
          scale: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <motion.img
          src={upstarCursor}
          alt=""
          className="w-8 h-8 -ml-4 -mt-4"
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </motion.div>

      {/* Subtle trailing glow - reduced */}
      <motion.div
        className="fixed pointer-events-none z-[9998] w-24 h-24 rounded-full"
        style={{
          x,
          y,
          marginLeft: -48,
          marginTop: -48,
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </>
  );
}
