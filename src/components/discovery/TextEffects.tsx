import { motion } from 'framer-motion';
import { ReactNode, useState } from 'react';

interface TextRevealProps {
  children: ReactNode;
  revealText?: string;
  className?: string;
}

export function TextReveal({ children, revealText, className = '' }: TextRevealProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.span
      className={`relative inline-block cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.span
        className="inline-block"
        animate={{ opacity: isHovered && revealText ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>
      {revealText && (
        <motion.span
          className="absolute inset-0 text-primary font-semibold"
          initial={{ opacity: 0, y: 5 }}
          animate={{ 
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 5,
          }}
          transition={{ duration: 0.2 }}
        >
          {revealText}
        </motion.span>
      )}
    </motion.span>
  );
}

interface BlurRevealProps {
  children: ReactNode;
  className?: string;
}

// BlurReveal: Text is blurred by default, reveals clearly ONLY while hovering
export function BlurReveal({ children, className = '' }: BlurRevealProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.span
      className={`relative inline-block cursor-pointer transition-all ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        filter: isHovered ? 'blur(0px)' : 'blur(4px)',
        opacity: isHovered ? 1 : 0.5,
        transition: 'filter 0.2s ease-out, opacity 0.2s ease-out',
      }}
    >
      {children}
    </motion.span>
  );
}

interface TypewriterTextProps {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
}

export function TypewriterText({ text, className = '', delay = 0, speed = 0.03 }: TypewriterTextProps) {
  return (
    <span className={className}>
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: delay + index * speed, duration: 0.1 }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

interface GlitchTextProps {
  children: ReactNode;
  className?: string;
}

export function GlitchText({ children, className = '' }: GlitchTextProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.span
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="relative z-10">{children}</span>
      {isHovered && (
        <>
          <motion.span
            className="absolute inset-0 text-primary/80"
            animate={{ x: [-2, 2, -2], opacity: [0.8, 0.4, 0.8] }}
            transition={{ duration: 0.15, repeat: 3 }}
          >
            {children}
          </motion.span>
          <motion.span
            className="absolute inset-0 text-destructive/60"
            animate={{ x: [2, -2, 2], opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 0.15, repeat: 3 }}
          >
            {children}
          </motion.span>
        </>
      )}
    </motion.span>
  );
}