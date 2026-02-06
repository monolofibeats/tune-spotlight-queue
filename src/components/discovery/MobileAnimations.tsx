import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef, ReactNode } from "react";

/**
 * Scroll-triggered fade-in animation for mobile
 * Only animates once when element enters viewport
 */
export function ScrollFadeIn({ 
  children, 
  delay = 0,
  direction = "up" 
}: { 
  children: ReactNode; 
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  const directionMap = {
    up: { y: 30, x: 0 },
    down: { y: -30, x: 0 },
    left: { x: 30, y: 0 },
    right: { x: -30, y: 0 },
  };
  
  const initial = directionMap[direction];
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...initial }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...initial }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scroll-triggered scale animation
 * Element scales up when entering viewport
 */
export function ScrollScaleIn({ 
  children, 
  delay = 0 
}: { 
  children: ReactNode; 
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.34, 1.56, 0.64, 1] // Slight bounce
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Parallax scroll effect - element moves at different rate than scroll
 */
export function ParallaxElement({ 
  children, 
  speed = 0.5 
}: { 
  children: ReactNode; 
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [0, -50 * speed]);
  
  return (
    <motion.div ref={ref} style={{ y }}>
      {children}
    </motion.div>
  );
}

/**
 * Stagger children animations - each child animates in sequence
 */
export function StaggerContainer({ 
  children, 
  staggerDelay = 0.1 
}: { 
  children: ReactNode; 
  staggerDelay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.4, ease: "easeOut" }
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Tap/press animation - gives satisfying feedback on touch
 */
export function TapScale({ 
  children, 
  scale = 0.95 
}: { 
  children: ReactNode; 
  scale?: number;
}) {
  return (
    <motion.div
      whileTap={{ scale }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Pulse animation that triggers once when in view
 */
export function PulseOnView({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 1 }}
      animate={isInView ? { 
        scale: [1, 1.05, 1],
      } : { scale: 1 }}
      transition={{ 
        duration: 0.5, 
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Number count-up animation that triggers on scroll
 */
export function CountUpOnView({ 
  value, 
  duration = 1.5,
  prefix = "",
  suffix = ""
}: { 
  value: number | string;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  
  const numericValue = typeof value === 'string' 
    ? parseInt(value.replace(/\D/g, '')) || 0 
    : value;
  
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
    >
      {isInView ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {prefix}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {typeof value === 'string' ? value : numericValue.toLocaleString()}
          </motion.span>
          {suffix}
        </motion.span>
      ) : (
        <span>{prefix}0{suffix}</span>
      )}
    </motion.span>
  );
}

/**
 * Glow effect that pulses when section becomes visible
 */
export function GlowPulseOnView({ 
  children,
  color = "hsl(50 100% 50% / 0.3)"
}: { 
  children: ReactNode;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ filter: "drop-shadow(0 0 0 transparent)" }}
      animate={isInView ? {
        filter: [
          "drop-shadow(0 0 0 transparent)",
          `drop-shadow(0 0 20px ${color})`,
          "drop-shadow(0 0 5px transparent)",
        ],
      } : {}}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
