import { Medal, Award } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import upstarStar from "@/assets/upstar-star.png";

type PositionBadgeProps = {
  position?: number | null;
  /** Size classes for the badge (e.g. w-10 h-10 text-sm) */
  badgeClassName?: string;
  /** Whether to show the animated glow effect */
  showGlow?: boolean;
};

const getPodiumStyles = (position?: number | null) => {
  if (position === 1) {
    return {
      bg: "bg-gradient-to-br from-yellow-500 via-amber-500 to-amber-600",
      text: "text-amber-950",
      shadow: "shadow-lg shadow-yellow-500/40",
      ring: "ring-2 ring-yellow-400/50",
    };
  }
  if (position === 2) {
    return {
      bg: "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500",
      text: "text-slate-900",
      shadow: "shadow-md shadow-slate-400/30",
      ring: "ring-1 ring-slate-300/50",
    };
  }
  if (position === 3) {
    return {
      bg: "bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700",
      text: "text-amber-950",
      shadow: "shadow-md shadow-orange-500/30",
      ring: "ring-1 ring-amber-500/50",
    };
  }
  return {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    shadow: "",
    ring: "",
  };
};

export function PositionBadge({
  position,
  badgeClassName,
  showGlow = false,
}: PositionBadgeProps) {
  const styles = getPodiumStyles(position);
  const isPodium = position !== null && position !== undefined && position <= 3;

  return (
    <motion.div 
      className="relative shrink-0"
      initial={false}
      animate={showGlow && position === 1 ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Glow effect for #1 */}
      {position === 1 && (
        <div className="absolute inset-0 rounded-lg bg-yellow-400/30 blur-md animate-pulse" />
      )}
      
      {/* Pop-out star for #1 - positioned to overflow */}
      {position === 1 && (
        <motion.img
          src={upstarStar}
          alt=""
          className="absolute -top-4 -right-3 w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] z-10"
          initial={{ scale: 0.8, rotate: -15 }}
          animate={{ 
            scale: [1, 1.15, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      )}
      
      <div
        className={cn(
          "relative rounded-lg flex items-center justify-center gap-1",
          styles.bg,
          styles.text,
          styles.shadow,
          styles.ring,
          isPodium && "font-extrabold",
          !isPodium && "font-bold",
          badgeClassName
        )}
        aria-label={position ? `Position ${position}` : "No position"}
      >
        {/* Integrated icons for 2nd and 3rd */}
        {position === 2 && (
          <Medal className="w-4 h-4 drop-shadow-sm" aria-hidden />
        )}
        {position === 3 && (
          <Award className="w-4 h-4 drop-shadow-sm" aria-hidden />
        )}
        
        {/* Position number */}
        <span className={position === 1 ? "text-lg" : ""}>
          {position ?? "—"}
        </span>
      </div>
    </motion.div>
  );
}
