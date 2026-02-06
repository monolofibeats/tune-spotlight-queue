import { motion } from "framer-motion";

/**
 * Lightweight mobile background - simple blurry yellow glow
 * No canvas, no particles, just CSS gradients for optimal performance
 */
export function MobileBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Main subtle yellow glow in center */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[60vh] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(50 100% 50% / 0.08) 0%, hsl(50 100% 50% / 0.03) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Subtle top-left accent */}
      <motion.div 
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(50 100% 50% / 0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Subtle bottom-right accent */}
      <motion.div 
        className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(50 100% 50% / 0.04) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      
      {/* Very subtle noise texture overlay for depth */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
