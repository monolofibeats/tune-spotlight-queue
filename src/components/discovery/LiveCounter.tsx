import { useEffect, useRef, useState } from 'react';
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
  suffix = '',
}: LiveCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const [displayValue, setDisplayValue] = useState(0);
  const [hasFinishedIntro, setHasFinishedIntro] = useState(false);

  useEffect(() => {
    if (!isInView || hasFinishedIntro) return;

    let startTime: number | undefined;
    const duration = 800; // faster so the live counting starts quickly

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setDisplayValue(Math.floor(easeOutQuart * startValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(startValue);
        setHasFinishedIntro(true);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, hasFinishedIntro, startValue]);

  useEffect(() => {
    if (!hasFinishedIntro) return;

    const id = window.setInterval(() => {
      setDisplayValue((v) => v + 1);
    }, incrementInterval);

    return () => window.clearInterval(id);
  }, [hasFinishedIntro, incrementInterval]);

  return (
    <motion.span
      ref={ref}
      className={`tabular-nums ${className}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      {displayValue.toLocaleString('en-US')}
      {suffix}
    </motion.span>
  );
}
