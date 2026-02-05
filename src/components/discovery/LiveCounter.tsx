import { useEffect, useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

interface LiveCounterProps {
  startValue?: number;
  incrementInterval?: number;
  className?: string;
  suffix?: string;
}

export function LiveCounter({ 
  startValue = 10000, 
  incrementInterval = 1000, 
  className = '',
  suffix = ''
}: LiveCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimatedIn = useRef(false);
  const [isIncrementing, setIsIncrementing] = useState(false);

  // Initial count-up animation
  useEffect(() => {
    if (!isInView || hasAnimatedIn.current) return;
    hasAnimatedIn.current = true;

    let startTime: number;
    const duration = 2000;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * startValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(startValue);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, startValue]);

  // Continuous increment after initial animation
  useEffect(() => {
    if (!hasAnimatedIn.current || displayValue < startValue) return;

    const interval = setInterval(() => {
      setIsIncrementing(true);
      setDisplayValue(prev => prev + 1);
      
      // Reset the increment animation flag after a short delay
      setTimeout(() => setIsIncrementing(false), 200);
    }, incrementInterval);

    return () => clearInterval(interval);
  }, [displayValue, startValue, incrementInterval]);

  // Format number with commas - full number display
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  return (
    <motion.span
      ref={ref}
      className={`tabular-nums inline-flex items-center gap-1 ${className}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, type: "spring" }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={displayValue}
          initial={{ y: isIncrementing ? 10 : 0, opacity: isIncrementing ? 0 : 1 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {formatNumber(displayValue)}
        </motion.span>
      </AnimatePresence>
      {suffix}
    </motion.span>
  );
}