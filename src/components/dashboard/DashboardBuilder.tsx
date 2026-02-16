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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { WIDGET_REGISTRY, type WidgetDefinition } from './WidgetRegistry';
import { DASHBOARD_TEMPLATES, getDefaultLayout, type DashboardTemplate } from './LayoutTemplates';
import type { Layout } from 'react-grid-layout';

interface DashboardBuilderProps {
  currentLayout: Layout[];
  onLayoutChange: (layout: Layout[]) => void;
  onSave: (layout: Layout[]) => Promise<void>;
}

export function DashboardBuilder({ currentLayout, onLayoutChange, onSave }: DashboardBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editLayout, setEditLayout] = useState<Layout[]>(currentLayout);

  const activeWidgetIds = editLayout.map(l => l.i);

  const handleOpen = () => {
    setEditLayout([...currentLayout]);
    setIsOpen(true);
  };

  const addWidget = useCallback((def: WidgetDefinition) => {
    if (activeWidgetIds.includes(def.id)) return;
    const maxY = editLayout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
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
    setEditLayout(prev => [...prev, newItem]);
  }, [editLayout, activeWidgetIds]);

  const removeWidget = useCallback((id: string) => {
    setEditLayout(prev => prev.filter(l => l.i !== id));
  }, []);

  const applyTemplate = useCallback((template: DashboardTemplate) => {
    setEditLayout([...template.layout]);
    toast({ title: `Template "${template.name}" applied` });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editLayout);
      onLayoutChange(editLayout);
      toast({ title: 'Dashboard layout saved!' });
      setIsOpen(false);
    } catch {
      toast({ title: 'Failed to save layout', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className="h-8 w-8"
        title="Edit dashboard layout"
      >
        <Pencil className="w-4 h-4" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-20 right-4 z-50 w-96"
          >
            <Card className="bg-card border-border shadow-2xl">
              <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm">Dashboard Builder</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditLayout(getDefaultLayout())}
                      title="Reset to default"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="widgets" className="w-full">
                  <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto">
                    <TabsTrigger value="widgets" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2.5 text-xs">
                      Widgets
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-2.5 text-xs">
                      Templates
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="h-[400px]">
                    <TabsContent value="widgets" className="p-3 space-y-2 mt-0">
                      <p className="text-xs text-muted-foreground mb-3">
                        Add or remove widgets. Drag and resize them directly on the dashboard.
                      </p>
                      {['core', 'analytics', 'tools'].map(category => (
                        <div key={category}>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 mt-3 first:mt-0">
                            {category}
                          </p>
                          {WIDGET_REGISTRY.filter(w => w.category === category).map(widget => {
                            const isActive = activeWidgetIds.includes(widget.id);
                            return (
                              <div
                                key={widget.id}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all mb-1.5 ${
                                  isActive
                                    ? 'bg-primary/10 border-primary/30'
                                    : 'bg-muted/20 border-border/50 opacity-70'
                                }`}
                              >
                                <widget.icon className="w-4 h-4 text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{widget.label}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{widget.description}</p>
                                </div>
                                {isActive ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                                    onClick={() => removeWidget(widget.id)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 text-primary"
                                    onClick={() => addWidget(widget)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="templates" className="p-3 space-y-2 mt-0">
                      <p className="text-xs text-muted-foreground mb-3">
                        Start with a template, then customize to your liking.
                      </p>
                      {DASHBOARD_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all mb-2"
                        >
                          <p className="text-sm font-medium">{template.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{template.description}</p>
                          <div className="flex gap-1 mt-2 flex-wrap">
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

                {/* Save button */}
                <div className="p-3 border-t border-border">
                  <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2" size="sm">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Layout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
