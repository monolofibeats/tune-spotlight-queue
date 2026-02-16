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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { WIDGET_REGISTRY, type WidgetDefinition } from './WidgetRegistry';
import { DASHBOARD_TEMPLATES, getDefaultLayout, type DashboardTemplate } from './LayoutTemplates';
import type { Layout } from 'react-grid-layout';

interface DashboardBuilderProps {
  isEditing: boolean;
  onToggleEditing: (editing: boolean) => void;
  currentLayout: Layout[];
  onLayoutChange: (layout: Layout[]) => void;
  onSave: (layout: Layout[]) => Promise<void>;
}

export function DashboardBuilder({
  isEditing,
  onToggleEditing,
  currentLayout,
  onLayoutChange,
  onSave,
}: DashboardBuilderProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [layoutBeforeEdit, setLayoutBeforeEdit] = useState<Layout[]>([]);

  const activeWidgetIds = currentLayout.map(l => l.i);

  const handleStartEditing = () => {
    setLayoutBeforeEdit([...currentLayout]);
    onToggleEditing(true);
  };

  const handleCancel = () => {
    onLayoutChange(layoutBeforeEdit);
    onToggleEditing(false);
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

  // Editing mode: render the sidebar panel
  return (
    <>
      {/* Top bar actions (rendered inline in the header) */}
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

      {/* Sidebar panel */}
      <AnimatePresence>
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 right-0 bottom-0 w-72 z-40 bg-card border-l border-border shadow-2xl flex flex-col"
        >
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Widgets</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Tabs defaultValue="add" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto shrink-0">
              <TabsTrigger value="add" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2 text-xs">
                Add
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
                      return (
                        <button
                          key={widget.id}
                          onClick={() => isActive ? removeWidget(widget.id) : addWidget(widget)}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all mb-1 text-left ${
                            isActive
                              ? 'bg-primary/10 border border-primary/30'
                              : 'border border-transparent hover:bg-muted/30'
                          }`}
                        >
                          <widget.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{widget.label}</p>
                          </div>
                          {isActive ? (
                            <X className="w-3 h-3 text-muted-foreground shrink-0" />
                          ) : (
                            <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
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
