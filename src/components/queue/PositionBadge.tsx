import { Medal, Award } from "lucide-react";

import { cn } from "@/lib/utils";
import upstarStar from "@/assets/upstar-star.png";

type PositionBadgeProps = {
  position?: number | null;
  /** Size + layout classes for the badge itself (e.g. w-10 h-10 text-sm) */
  badgeClassName?: string;
  /** Optional override for the overlay icon size (e.g. w-5 h-5) */
  overlayClassName?: string;
};

const getPodiumClasses = (position?: number | null) => {
  if (position === 1) return "bg-podium-gold text-podium-gold-foreground";
  if (position === 2) return "bg-podium-silver text-podium-silver-foreground";
  if (position === 3) return "bg-podium-bronze text-podium-bronze-foreground";
  return "bg-secondary text-muted-foreground";
};

export function PositionBadge({
  position,
  badgeClassName,
  overlayClassName,
}: PositionBadgeProps) {
  const overlaySize = overlayClassName ?? "w-5 h-5";

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "rounded-md flex items-center justify-center font-bold",
          getPodiumClasses(position),
          badgeClassName
        )}
        aria-label={position ? `Position ${position}` : "No position"}
      >
        {position ?? "—"}
      </div>

      {position === 1 && (
        <img
          src={upstarStar}
          alt="Top Spot"
          className={cn(
            "absolute -top-2 -right-2 object-contain drop-shadow-lg",
            overlaySize
          )}
        />
      )}

      {position === 2 && (
        <Medal
          className={cn(
            "absolute -top-2 -right-2 object-contain drop-shadow",
            overlaySize
          )}
          aria-label="Second place"
        />
      )}

      {position === 3 && (
        <Award
          className={cn(
            "absolute -top-2 -right-2 object-contain drop-shadow",
            overlaySize
          )}
          aria-label="Third place"
        />
      )}
    </div>
  );
}
