import { useMemo, type ReactNode } from 'react';
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { WidgetWrapper } from './WidgetWrapper';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  layout: Layout[];
  isEditing: boolean;
  onLayoutChange?: (layout: Layout[]) => void;
  onRemoveWidget?: (id: string) => void;
  widgetRenderers: Record<string, ReactNode>;
}

export function DashboardGrid({
  layout,
  isEditing,
  onLayoutChange,
  onRemoveWidget,
  widgetRenderers,
}: DashboardGridProps) {
  const layouts: Layouts = useMemo(() => ({
    lg: layout,
    md: layout.map(l => ({ ...l, w: Math.min(l.w, 10) })),
    sm: layout.map(l => ({ ...l, x: 0, w: 6 })),
    xs: layout.map(l => ({ ...l, x: 0, w: 4 })),
  }), [layout]);

  return (
    <ResponsiveGridLayout
      className="dashboard-grid"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
      rowHeight={40}
      isDraggable={isEditing}
      isResizable={isEditing}
      draggableHandle=".drag-handle"
      onLayoutChange={(currentLayout) => {
        if (isEditing && onLayoutChange) {
          onLayoutChange(currentLayout);
        }
      }}
      compactType="vertical"
      margin={[12, 12]}
    >
      {layout.map(item => {
        const content = widgetRenderers[item.i];
        if (!content) return null;
        return (
          <div key={item.i}>
            <WidgetWrapper
              widgetId={item.i}
              isEditing={isEditing}
              onRemove={onRemoveWidget ? () => onRemoveWidget(item.i) : undefined}
            >
              {content}
            </WidgetWrapper>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
