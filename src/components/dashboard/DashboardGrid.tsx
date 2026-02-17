import { useMemo, type ReactNode } from 'react';
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout';
import { WidgetWrapper } from './WidgetWrapper';
import type { WidgetConfigs } from './WidgetRegistry';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  layout: Layout[];
  isEditing: boolean;
  onLayoutChange?: (layout: Layout[]) => void;
  onRemoveWidget?: (id: string) => void;
  widgetRenderers: Record<string, ReactNode>;
  /** Widget IDs currently in pop-out windows */
  poppedOutWidgets?: Set<string>;
  /** Widget IDs that should still show on dashboard even when popped out */
  showWhenPoppedOut?: Set<string>;
  /** Handler to pop out a widget */
  onPopOut?: (widgetId: string) => void;
  /** Per-widget config (includes textScale) */
  widgetConfigs?: WidgetConfigs;
}

export function DashboardGrid({
  layout,
  isEditing,
  onLayoutChange,
  onRemoveWidget,
  widgetRenderers,
  poppedOutWidgets = new Set(),
  showWhenPoppedOut = new Set(),
  onPopOut,
  widgetConfigs = {},
}: DashboardGridProps) {
  // Filter out popped-out widgets unless they're configured to stay visible
  const visibleLayout = useMemo(() => {
    return layout.filter(item => {
      if (!poppedOutWidgets.has(item.i)) return true;
      return showWhenPoppedOut.has(item.i);
    });
  }, [layout, poppedOutWidgets, showWhenPoppedOut]);

  const layouts: Layouts = useMemo(() => ({
    lg: visibleLayout,
    md: visibleLayout.map(l => ({ ...l, w: Math.min(l.w, 10) })),
    sm: visibleLayout.map(l => ({ ...l, x: 0, w: 6 })),
    xs: visibleLayout.map(l => ({ ...l, x: 0, w: 4 })),
  }), [visibleLayout]);

  return (
    <ResponsiveGridLayout
      className={`dashboard-grid ${isEditing ? 'is-editing' : ''}`}
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
      rowHeight={40}
      isDraggable={isEditing}
      isResizable={isEditing}
      draggableHandle=".drag-handle"
      onDragStop={(_layout, _oldItem, newItem, _placeholder, e) => {
        if (isEditing && onPopOut && e) {
          const threshold = 40;
          const x = e.clientX;
          const y = e.clientY;
          const w = window.innerWidth;
          const h = window.innerHeight;
          if (x <= threshold || x >= w - threshold || y <= threshold || y >= h - threshold) {
            onPopOut(newItem.i);
            return;
          }
        }
      }}
      onLayoutChange={(currentLayout) => {
        if (isEditing && onLayoutChange) {
          onLayoutChange(currentLayout);
        }
      }}
      compactType="vertical"
      margin={isEditing ? [8, 8] : [4, 4]}
      containerPadding={[0, 0]}
      useCSSTransforms={true}
    >
      {visibleLayout.map(item => {
        const content = widgetRenderers[item.i];
        if (!content) return null;
        const isPoppedOut = poppedOutWidgets.has(item.i);
        const textScale = (widgetConfigs[item.i]?.textScale as number) ?? 100;
        return (
          <div key={item.i} style={textScale !== 100 ? { fontSize: `${textScale / 100}rem` } : undefined}>
            <WidgetWrapper
              widgetId={item.i}
              isEditing={isEditing}
              onRemove={onRemoveWidget ? () => onRemoveWidget(item.i) : undefined}
              isPoppedOut={isPoppedOut}
            >
              {content}
            </WidgetWrapper>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
