import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWidgetDef } from './WidgetRegistry';

interface WidgetWrapperProps {
  widgetId: string;
  isEditing: boolean;
  children: ReactNode;
  onRemove?: () => void;
}

export function WidgetWrapper({ widgetId, isEditing, children, onRemove }: WidgetWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);
  const def = getWidgetDef(widgetId);

  return (
    <div className="h-full flex flex-col glass rounded-xl overflow-hidden border border-border/50">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 shrink-0 bg-card/50">
        {isEditing && (
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab drag-handle" />
        )}
        {def && <def.icon className="w-4 h-4 text-primary shrink-0" />}
        <span className="text-xs font-medium flex-1 truncate">{def?.label || widgetId}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={() => setCollapsed(prev => !prev)}
        >
          {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </Button>
        {isEditing && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-auto p-3">
          {children}
        </div>
      )}
    </div>
  );
}
