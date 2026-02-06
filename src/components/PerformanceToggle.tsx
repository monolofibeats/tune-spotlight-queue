import { Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePerformanceMode } from '@/hooks/usePerformanceMode';

export function PerformanceToggle() {
  const { mode, toggleMode } = usePerformanceMode();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleMode}
          aria-label={mode === 'heavy' ? 'Switch to light animations' : 'Switch to full animations'}
        >
          {mode === 'heavy' ? (
            <Sparkles className="h-4 w-4 text-primary" />
          ) : (
            <Zap className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {mode === 'heavy' ? 'Full animations (click for better performance)' : 'Light mode (click for full experience)'}
      </TooltipContent>
    </Tooltip>
  );
}
