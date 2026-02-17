import { type ReactNode } from 'react';
import { GripVertical, X, ExternalLink } from 'lucide-react';
import { getWidgetDef } from './WidgetRegistry';

interface WidgetWrapperProps {
  widgetId: string;
  isEditing: boolean;
  children: ReactNode;
  onRemove?: () => void;
  isPoppedOut?: boolean;
  textScale?: number;
}

export function WidgetWrapper({ widgetId, isEditing, children, onRemove, isPoppedOut, textScale = 100 }: WidgetWrapperProps) {
  const def = getWidgetDef(widgetId);
  const zoomStyle = textScale !== 100 ? { zoom: textScale / 100 } as React.CSSProperties : undefined;

  return (
    <div className={`h-full flex flex-col overflow-hidden rounded-xl transition-all ${
      isEditing 
        ? 'ring-1 ring-primary/30 ring-dashed bg-card/30' 
        : ''
    } ${isPoppedOut && !isEditing ? 'opacity-50' : ''}`}>
      {/* Only show a label bar in edit mode */}
      {isEditing && (
        <div className="flex items-center gap-1.5 px-2 py-1 shrink-0 bg-primary/10 border-b border-primary/20">
          <GripVertical className="w-3.5 h-3.5 text-primary/60 cursor-grab drag-handle" />
          <span className="text-[10px] font-medium text-primary/80 flex-1 truncate">{def?.label || widgetId}</span>
          {isPoppedOut && (
            <ExternalLink className="w-3 h-3 text-accent-foreground" />
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
      {/* Content — container queries let widgets adapt to their size */}
      <div className="flex-1 overflow-auto widget-container" style={{ containerType: 'size', ...zoomStyle }}>
        {children}
      </div>
    </div>
  );
}
