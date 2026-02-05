import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface LiveCounterProps {
  startValue?: number;
  incrementInterval?: number; // ms between increments
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
  const [currentValue, setCurrentValue] = useState(startValue);
  const hasAnimatedIn = useRef(false);

  // Initial count-up animation
  useEffect(() => {
    if (!isInView || hasAnimatedIn.current) return;
    hasAnimatedIn.current = true;

    let startTime: number;
    const duration = 2000; // 2 seconds for initial animation
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * startValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(startValue);
        setCurrentValue(startValue);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, startValue]);

  // Continuous increment after initial animation
  useEffect(() => {
    if (!hasAnimatedIn.current || displayValue < startValue) return;

    const interval = setInterval(() => {
      setCurrentValue(prev => {
        const newValue = prev + 1;
        setDisplayValue(newValue);
        return newValue;
      });
    }, incrementInterval);

    return () => clearInterval(interval);
  }, [displayValue, startValue, incrementInterval]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, type: "spring" }}
    >
      {formatNumber(displayValue)}
      {suffix}
    </motion.span>
  );
}
