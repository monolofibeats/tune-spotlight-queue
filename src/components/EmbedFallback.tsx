import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmbedFallbackProps {
  url?: string;
  onRetry?: () => void;
  className?: string;
}

export function EmbedFallback({ url, onRetry, className = '' }: EmbedFallbackProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-lg bg-card/30 border border-border/30 ${className}`}>
      <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground mb-1">This didn't load</p>
        <p className="text-xs text-muted-foreground max-w-[220px]">
          Try refreshing the page or open the link directly.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 gap-1.5"
          onClick={onRetry || (() => window.location.reload())}
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
        {url && (
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3" />
              Open Link
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
