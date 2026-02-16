import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil,
  X,
  Save,
  Loader2,
  Plus,
  LayoutTemplate,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  PanelTopClose,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { WIDGET_REGISTRY, type WidgetDefinition } from './WidgetRegistry';
import { DASHBOARD_TEMPLATES, getDefaultLayout, type DashboardTemplate } from './LayoutTemplates';
import type { Layout } from 'react-grid-layout';

export interface DashboardViewOptions {
  showHeader: boolean;
  showDashboardTitle: boolean;
}

interface DashboardBuilderProps {
  isEditing: boolean;
  onToggleEditing: (editing: boolean) => void;
  currentLayout: Layout[];
  onLayoutChange: (layout: Layout[]) => void;
  onSave: (layout: Layout[]) => Promise<void>;
  onPopOut?: (widgetId: string) => void;
  viewOptions: DashboardViewOptions;
  onViewOptionsChange: (options: DashboardViewOptions) => void;
}

export function DashboardBuilder({
  isEditing,
  onToggleEditing,
  currentLayout,
  onLayoutChange,
  onSave,
  onPopOut,
  viewOptions,
  onViewOptionsChange,
}: DashboardBuilderProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [layoutBeforeEdit, setLayoutBeforeEdit] = useState<Layout[]>([]);
  const [viewOptionsBeforeEdit, setViewOptionsBeforeEdit] = useState<DashboardViewOptions>({ showHeader: true, showDashboardTitle: true });
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);

  const activeWidgetIds = currentLayout.map(l => l.i);

  const handleStartEditing = () => {
    setLayoutBeforeEdit([...currentLayout]);
    setViewOptionsBeforeEdit({ ...viewOptions });
    onToggleEditing(true);
  };

  const handleCancel = () => {
    onLayoutChange(layoutBeforeEdit);
    onViewOptionsChange(viewOptionsBeforeEdit);
    onToggleEditing(false);
    setExpandedWidget(null);
  };

  const addWidget = useCallback((def: WidgetDefinition) => {
    if (activeWidgetIds.includes(def.id)) return;
    const maxY = currentLayout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
    const newItem: Layout = {
      i: def.id,
      x: 0,
      y: maxY,
      w: def.defaultSize.w,
      h: def.defaultSize.h,
      minW: def.minSize.w,
      minH: def.minSize.h,
      ...(def.maxSize ? { maxW: def.maxSize.w, maxH: def.maxSize.h } : {}),
    };
    onLayoutChange([...currentLayout, newItem]);
  }, [currentLayout, activeWidgetIds, onLayoutChange]);

  const removeWidget = useCallback((id: string) => {
    onLayoutChange(currentLayout.filter(l => l.i !== id));
    if (expandedWidget === id) setExpandedWidget(null);
  }, [currentLayout, onLayoutChange, expandedWidget]);

  const updateWidgetSize = useCallback((id: string, field: 'w' | 'h', value: number) => {
    const def = WIDGET_REGISTRY.find(w => w.id === id);
    if (!def) return;
    const min = field === 'w' ? def.minSize.w : def.minSize.h;
    const max = field === 'w' ? (def.maxSize?.w || 12) : (def.maxSize?.h || 20);
    const clamped = Math.max(min, Math.min(max, value));
    onLayoutChange(currentLayout.map(l => l.i === id ? { ...l, [field]: clamped } : l));
  }, [currentLayout, onLayoutChange]);

  const applyTemplate = useCallback((template: DashboardTemplate) => {
    onLayoutChange([...template.layout]);
    toast({ title: `"${template.name}" applied — drag to customize` });
  }, [onLayoutChange]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(currentLayout);
      toast({ title: 'Layout saved!' });
      onToggleEditing(false);
      setExpandedWidget(null);
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleStartEditing}
        className="h-8 w-8"
        title="Edit dashboard layout"
      >
        <Pencil className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCancel} className="gap-1.5 text-xs">
          <X className="w-3.5 h-3.5" /> Cancel
        </Button>
        <Button variant="outline" size="sm" onClick={() => onLayoutChange(getDefaultLayout())} className="gap-1.5 text-xs">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 text-xs">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save
        </Button>
      </div>

      <AnimatePresence>
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 right-0 bottom-0 w-80 z-40 bg-card border-l border-border shadow-2xl flex flex-col"
        >
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Dashboard Builder</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Tabs defaultValue="add" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto shrink-0">
              <TabsTrigger value="add" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2 text-xs">
                Widgets
              </TabsTrigger>
              <TabsTrigger value="layout" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2 text-xs">
                Layout
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2 text-xs">
                Templates
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="add" className="p-3 mt-0">
                {['core', 'analytics', 'tools'].map(category => (
                  <div key={category} className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      {category}
                    </p>
                    {WIDGET_REGISTRY.filter(w => w.category === category).map(widget => {
                      const isActive = activeWidgetIds.includes(widget.id);
                      const isExpanded = expandedWidget === widget.id && isActive;
                      const layoutItem = currentLayout.find(l => l.i === widget.id);

                      return (
                        <div key={widget.id} className="mb-1">
                          <button
                            onClick={() => {
                              if (!isActive) {
                                addWidget(widget);
                                setExpandedWidget(widget.id);
                              } else {
                                setExpandedWidget(isExpanded ? null : widget.id);
                              }
                            }}
                            className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left ${
                              isActive
                                ? 'bg-primary/10 border border-primary/30'
                                : 'border border-transparent hover:bg-muted/30'
                            }`}
                          >
                            <widget.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{widget.label}</p>
                              {!isActive && (
                                <p className="text-[10px] text-muted-foreground truncate">{widget.description}</p>
                              )}
                            </div>
                            {isActive ? (
                              isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                            ) : (
                              <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                          </button>

                          {isExpanded && layoutItem && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 ml-6 mr-1 mt-1 mb-1 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                                {/* Width control */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] text-muted-foreground font-medium">Width</label>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={layoutItem.w}
                                        min={widget.minSize.w}
                                        max={widget.maxSize?.w || 12}
                                        onChange={(e) => updateWidgetSize(widget.id, 'w', parseInt(e.target.value) || widget.minSize.w)}
                                        className="h-5 w-12 text-[10px] text-center p-0 font-mono"
                                      />
                                      <span className="text-[10px] text-muted-foreground">cols</span>
                                    </div>
                                  </div>
                                  <Slider
                                    value={[layoutItem.w]}
                                    min={widget.minSize.w}
                                    max={widget.maxSize?.w || 12}
                                    step={1}
                                    onValueChange={([v]) => updateWidgetSize(widget.id, 'w', v)}
                                    className="h-4"
                                  />
                                </div>

                                {/* Height control */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] text-muted-foreground font-medium">Height</label>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={layoutItem.h}
                                        min={widget.minSize.h}
                                        max={widget.maxSize?.h || 20}
                                        onChange={(e) => updateWidgetSize(widget.id, 'h', parseInt(e.target.value) || widget.minSize.h)}
                                        className="h-5 w-12 text-[10px] text-center p-0 font-mono"
                                      />
                                      <span className="text-[10px] text-muted-foreground">rows</span>
                                    </div>
                                  </div>
                                  <Slider
                                    value={[layoutItem.h]}
                                    min={widget.minSize.h}
                                    max={widget.maxSize?.h || 20}
                                    step={1}
                                    onValueChange={([v]) => updateWidgetSize(widget.id, 'h', v)}
                                    className="h-4"
                                  />
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-1.5">
                                  {onPopOut && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 h-7 text-[10px] gap-1"
                                      onClick={() => onPopOut(widget.id)}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Pop Out
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
                                    onClick={() => removeWidget(widget.id)}
                                  >
                                    <X className="w-3 h-3" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="layout" className="p-3 mt-0 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                    Visibility
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2">
                        <PanelTopClose className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium">Site Header</p>
                          <p className="text-[10px] text-muted-foreground">Navigation bar at the top</p>
                        </div>
                      </div>
                      <Switch
                        checked={viewOptions.showHeader}
                        onCheckedChange={(checked) => onViewOptionsChange({ ...viewOptions, showHeader: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium">Dashboard Title</p>
                          <p className="text-[10px] text-muted-foreground">Title bar and action buttons</p>
                        </div>
                      </div>
                      <Switch
                        checked={viewOptions.showDashboardTitle}
                        onCheckedChange={(checked) => onViewOptionsChange({ ...viewOptions, showDashboardTitle: checked })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="templates" className="p-3 mt-0 space-y-2">
                {DASHBOARD_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <p className="text-xs font-medium">{template.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{template.description}</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {template.layout.map(l => {
                        const def = WIDGET_REGISTRY.find(w => w.id === l.i);
                        return def ? (
                          <span key={l.i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {def.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </button>
                ))}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
