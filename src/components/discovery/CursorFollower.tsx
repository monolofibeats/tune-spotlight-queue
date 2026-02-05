import { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';
import upstarStar from '@/assets/upstar-star.png';

export function CursorFollower() {
  const [isVisible, setIsVisible] = useState(false);

  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
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
      {/* Main cursor star - upright like the icon */}
      <motion.div
        className="fixed pointer-events-none z-[9999]"
        style={{ x, y }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: isVisible ? 1 : 0, 
          scale: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <motion.img
          src={upstarStar}
          alt=""
          className="w-7 h-7 -ml-3.5 -mt-3.5"
          animate={{ 
            scale: [1, 1.08, 1],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </motion.div>

      {/* Subtle trailing glow - reduced */}
      <motion.div
        className="fixed pointer-events-none z-[9998] w-16 h-16 rounded-full"
        style={{
          x,
          y,
          marginLeft: -32,
          marginTop: -32,
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.06) 0%, transparent 70%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </>
  );
}
