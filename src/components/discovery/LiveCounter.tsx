import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface LiveCounterProps {
  startValue?: number;
  incrementInterval?: number; // ms between increments
  className?: string;
  suffix?: string;
}

// Persistent counter that never resets - uses localStorage to track accumulated counts
const getStoredCount = (startValue: number): number => {
  const stored = localStorage.getItem('liveCounter_songs');
  if (stored) {
    const { base, timestamp } = JSON.parse(stored);
    // Calculate how many seconds have passed and add to base
    const secondsPassed = Math.floor((Date.now() - timestamp) / 1000);
    return base + secondsPassed;
  }
  // First time: store the initial value
  localStorage.setItem('liveCounter_songs', JSON.stringify({ base: startValue, timestamp: Date.now() }));
  return startValue;
};

export function LiveCounter({
  startValue = 10000,
  incrementInterval = 1000,
  className = '',
  suffix = '',
}: LiveCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const persistedValue = getStoredCount(startValue);
  const [displayValue, setDisplayValue] = useState(0);
  const [hasFinishedIntro, setHasFinishedIntro] = useState(false);
  const [targetValue, setTargetValue] = useState(persistedValue);

  useEffect(() => {
    if (!isInView || hasFinishedIntro) return;

    let startTime: number | undefined;
    const duration = 800; // faster so the live counting starts quickly

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setDisplayValue(Math.floor(easeOutQuart * targetValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
        setHasFinishedIntro(true);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, hasFinishedIntro, targetValue]);

  useEffect(() => {
    if (!hasFinishedIntro) return;

    const id = window.setInterval(() => {
      setDisplayValue((v) => {
        const newVal = v + 1;
        // Update stored value periodically
        localStorage.setItem('liveCounter_songs', JSON.stringify({ base: newVal, timestamp: Date.now() }));
        return newVal;
      });
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
