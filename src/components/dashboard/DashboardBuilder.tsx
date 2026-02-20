import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Pencil,
  X,
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
  Eye,
  EyeOff,
  GripVertical,
  Minimize2,
  Maximize2,
  Save,
  Trash2,
  PencilLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { WIDGET_REGISTRY, type WidgetDefinition, type WidgetConfigs, getDefaultWidgetConfig } from './WidgetRegistry';
import { DASHBOARD_TEMPLATES, getDefaultLayout, type DashboardTemplate } from './LayoutTemplates';
import type { Layout } from 'react-grid-layout';
import type { StreamerPreset } from '@/hooks/useStreamerPresets';
export interface DashboardViewOptions {
  showHeader: boolean;
  showDashboardTitle: boolean;
}

export interface PopOutOptions {
  showWhenPoppedOut: Set<string>;
}

interface DashboardBuilderProps {
  isEditing: boolean;
  onToggleEditing: (editing: boolean) => void;
  currentLayout: Layout[];
  onLayoutChange: (layout: Layout[]) => void;
  onSave: (layout: Layout[]) => Promise<void>;
  onPopOut?: (widgetId: string) => void;
  poppedOutWidgets?: Set<string>;
  onPoppedOutWidgetsChange?: (widgets: Set<string>) => void;
  viewOptions: DashboardViewOptions;
  onViewOptionsChange: (options: DashboardViewOptions) => void;
  widgetConfigs: WidgetConfigs;
  onWidgetConfigsChange: (configs: WidgetConfigs) => void;
  popOutOptions: PopOutOptions;
  onPopOutOptionsChange: (options: PopOutOptions) => void;
  // User presets
  userPresets?: StreamerPreset[];
  onSaveAsPreset?: (name: string) => Promise<void>;
  onLoadPreset?: (preset: StreamerPreset) => void;
  onDeletePreset?: (presetId: string) => Promise<void>;
  onRenamePreset?: (presetId: string, newName: string) => Promise<void>;
}

type BuilderTab = 'widgets' | 'layout' | 'templates';

export function DashboardBuilder({
  isEditing,
  onToggleEditing,
  currentLayout,
  onLayoutChange,
  onSave,
  onPopOut,
  poppedOutWidgets = new Set(),
  onPoppedOutWidgetsChange,
  viewOptions,
  onViewOptionsChange,
  widgetConfigs,
  onWidgetConfigsChange,
  popOutOptions,
  onPopOutOptionsChange,
  userPresets = [],
  onSaveAsPreset,
  onLoadPreset,
  onDeletePreset,
  onRenamePreset,
}: DashboardBuilderProps) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [layoutBeforeEdit, setLayoutBeforeEdit] = useState<Layout[]>([]);
  const [viewOptionsBeforeEdit, setViewOptionsBeforeEdit] = useState<DashboardViewOptions>({ showHeader: true, showDashboardTitle: true });
  const [configsBeforeEdit, setConfigsBeforeEdit] = useState<WidgetConfigs>({});
  const [popOutOptionsBeforeEdit, setPopOutOptionsBeforeEdit] = useState<PopOutOptions>({ showWhenPoppedOut: new Set() });
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BuilderTab>('widgets');
  const [isMinimized, setIsMinimized] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');

  // Draggable floating panel state
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Center on mount
  useEffect(() => {
    if (isEditing) {
      const x = Math.max(0, (window.innerWidth - 320) / 2);
      const y = Math.max(60, (window.innerHeight - 500) / 2);
      setPanelPos({ x, y });
      setIsMinimized(false);
    }
  }, [isEditing]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const handleMouseMove = (ev: MouseEvent) => {
      setPanelPos({
        x: Math.max(0, Math.min(window.innerWidth - 100, ev.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - dragOffset.current.y)),
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const activeWidgetIds = currentLayout.map(l => l.i);

  const handleStartEditing = () => {
    setLayoutBeforeEdit([...currentLayout]);
    setViewOptionsBeforeEdit({ ...viewOptions });
    setConfigsBeforeEdit({ ...widgetConfigs });
    setPopOutOptionsBeforeEdit({ showWhenPoppedOut: new Set(popOutOptions.showWhenPoppedOut) });
    onToggleEditing(true);
  };

  const handleCancel = () => {
    onLayoutChange(layoutBeforeEdit);
    onViewOptionsChange(viewOptionsBeforeEdit);
    onWidgetConfigsChange(configsBeforeEdit);
    onPopOutOptionsChange(popOutOptionsBeforeEdit);
    onToggleEditing(false);
    setExpandedWidget(null);
  };

  const addWidget = useCallback((def: WidgetDefinition) => {
    if (activeWidgetIds.includes(def.id)) return;
    const maxY = currentLayout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
    const newItem: Layout = {
      i: def.id, x: 0, y: maxY,
      w: def.defaultSize.w, h: def.defaultSize.h,
      minW: def.minSize.w, minH: def.minSize.h,
      ...(def.maxSize ? { maxW: def.maxSize.w, maxH: def.maxSize.h } : {}),
    };
    onLayoutChange([...currentLayout, newItem]);
    if (def.configOptions && !widgetConfigs[def.id]) {
      onWidgetConfigsChange({ ...widgetConfigs, [def.id]: getDefaultWidgetConfig(def.id) });
    }
  }, [currentLayout, activeWidgetIds, onLayoutChange, widgetConfigs, onWidgetConfigsChange]);

  const removeWidget = useCallback((id: string) => {
    onLayoutChange(currentLayout.filter(l => l.i !== id));
    if (expandedWidget === id) setExpandedWidget(null);
  }, [currentLayout, onLayoutChange, expandedWidget]);

  const updateWidgetSize = useCallback((id: string, field: 'w' | 'h', value: number) => {
    const def = WIDGET_REGISTRY.find(w => w.id === id);
    if (!def) return;
    const min = field === 'w' ? def.minSize.w : def.minSize.h;
    const clamped = Math.max(min, value);
    onLayoutChange(currentLayout.map(l => l.i === id ? { ...l, [field]: parseFloat(clamped.toFixed(1)) } : l));
  }, [currentLayout, onLayoutChange]);

  const toggleWidgetConfig = useCallback((widgetId: string, key: string, value: boolean) => {
    const current = widgetConfigs[widgetId] || getDefaultWidgetConfig(widgetId);
    onWidgetConfigsChange({ ...widgetConfigs, [widgetId]: { ...current, [key]: value } });
  }, [widgetConfigs, onWidgetConfigsChange]);

  const updateWidgetConfigValue = useCallback((widgetId: string, key: string, value: number) => {
    const current = widgetConfigs[widgetId] || getDefaultWidgetConfig(widgetId);
    onWidgetConfigsChange({ ...widgetConfigs, [widgetId]: { ...current, [key]: value } });
  }, [widgetConfigs, onWidgetConfigsChange]);

  const toggleShowWhenPoppedOut = useCallback((widgetId: string, value: boolean) => {
    const next = new Set(popOutOptions.showWhenPoppedOut);
    if (value) next.add(widgetId); else next.delete(widgetId);
    onPopOutOptionsChange({ ...popOutOptions, showWhenPoppedOut: next });
  }, [popOutOptions, onPopOutOptionsChange]);

  const applyTemplate = useCallback((template: DashboardTemplate) => {
    onLayoutChange([...template.layout]);
    if (template.poppedOutWidgets && onPoppedOutWidgetsChange) {
      onPoppedOutWidgetsChange(new Set(template.poppedOutWidgets));
    } else if (onPoppedOutWidgetsChange) {
      onPoppedOutWidgetsChange(new Set());
    }
    toast({ title: t('builder.applied').replace('{name}', template.name) });
  }, [onLayoutChange, onPoppedOutWidgetsChange]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(currentLayout);
      toast({ title: t('builder.layoutSaved') });
      onToggleEditing(false);
      setExpandedWidget(null);
    } catch {
      toast({ title: t('builder.layoutSaveFailed'), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <Button variant="ghost" size="icon" onClick={handleStartEditing} className="h-8 w-8" title={t('builder.editLayout')}>
        <Pencil className="w-4 h-4" />
      </Button>
    );
  }

  const tabs: { id: BuilderTab; label: string }[] = [
    { id: 'widgets', label: t('builder.tab.widgets') },
    { id: 'layout', label: t('builder.tab.layout') },
    { id: 'templates', label: t('builder.tab.templates') },
  ];

  return (
    <>
      {/* Top bar buttons */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCancel} className="gap-1.5 text-xs">
          <X className="w-3.5 h-3.5" /> {t('builder.cancel')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onLayoutChange(getDefaultLayout())} className="gap-1.5 text-xs">
          <RotateCcw className="w-3.5 h-3.5" /> {t('builder.reset')}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 text-xs">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {t('builder.save')}
        </Button>
      </div>

      {/* Floating detached panel */}
      <AnimatePresence>
        <motion.div
          ref={panelRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: isDragging ? 0.7 : 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{ left: panelPos.x, top: panelPos.y }}
          className={`fixed z-50 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl flex flex-col pointer-events-auto ${
            isMinimized ? 'w-56' : 'w-80'
          }`}
          data-builder-panel
        >
          {/* Drag handle header */}
          <div
            className="flex items-center gap-2 px-3 py-2 border-b border-border/50 cursor-grab active:cursor-grabbing select-none shrink-0 rounded-t-xl"
            onMouseDown={handleMouseDown}
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <LayoutTemplate className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-semibold flex-1">{t('builder.title')}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(!isMinimized)}>
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}>
              <X className="w-3 h-3" />
            </Button>
          </div>

          {!isMinimized && (
            <>
              {/* Tab bar — NOT a Tabs component, just buttons to avoid tab-jumping */}
              <div className="flex border-b border-border/50 shrink-0">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-1.5 text-[10px] font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <ScrollArea className="max-h-[70vh] overflow-y-auto">
                <div className="p-3">
                  {activeTab === 'widgets' && (
                    <WidgetsTab
                      activeWidgetIds={activeWidgetIds}
                      currentLayout={currentLayout}
                      expandedWidget={expandedWidget}
                      setExpandedWidget={setExpandedWidget}
                      poppedOutWidgets={poppedOutWidgets}
                      widgetConfigs={widgetConfigs}
                      popOutOptions={popOutOptions}
                      addWidget={addWidget}
                      removeWidget={removeWidget}
                      updateWidgetSize={updateWidgetSize}
                      toggleWidgetConfig={toggleWidgetConfig}
                      updateWidgetConfigValue={updateWidgetConfigValue}
                      toggleShowWhenPoppedOut={toggleShowWhenPoppedOut}
                      onPopOut={onPopOut}
                    />
                  )}

                  {activeTab === 'layout' && (
                    <div className="space-y-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{t('builder.visibility')}</p>
                      <div className="flex items-center justify-between p-2 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                          <PanelTopClose className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-medium">{t('builder.siteHeader')}</p>
                            <p className="text-[10px] text-muted-foreground">{t('builder.navBar')}</p>
                          </div>
                        </div>
                        <Switch
                          checked={viewOptions.showHeader}
                          onCheckedChange={(checked) => onViewOptionsChange({ ...viewOptions, showHeader: checked })}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                          <Type className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-medium">{t('builder.dashboardTitle')}</p>
                            <p className="text-[10px] text-muted-foreground">{t('builder.titleBarButtons')}</p>
                          </div>
                        </div>
                        <Switch
                          checked={viewOptions.showDashboardTitle}
                          onCheckedChange={(checked) => {
                            onViewOptionsChange({ ...viewOptions, showDashboardTitle: checked });
                          }}
                          onClick={(e) => e.stopPropagation()}
                         />
                      </div>
                    </div>
                  )}
                  {activeTab === 'templates' && (
                    <div className="space-y-3">
                      {/* Save current as preset */}
                      {onSaveAsPreset && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('builder.saveCurrentLayout')}</p>
                          <div className="flex gap-1.5">
                            <Input
                              placeholder={t('builder.presetName')}
                              value={newPresetName}
                              onChange={(e) => setNewPresetName(e.target.value)}
                              className="h-7 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newPresetName.trim()) {
                                  setIsSavingPreset(true);
                                  onSaveAsPreset(newPresetName.trim()).then(() => {
                                    setNewPresetName('');
                                    toast({ title: t('builder.presetSaved').replace('{name}', newPresetName.trim()) });
                                  }).finally(() => setIsSavingPreset(false));
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              disabled={!newPresetName.trim() || isSavingPreset}
                              onClick={() => {
                                setIsSavingPreset(true);
                                onSaveAsPreset(newPresetName.trim()).then(() => {
                                  setNewPresetName('');
                                  toast({ title: t('builder.presetSaved').replace('{name}', newPresetName.trim()) });
                                }).finally(() => setIsSavingPreset(false));
                              }}
                            >
                              {isSavingPreset ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              Save
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* User presets */}
                      {userPresets.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">My Presets</p>
                          {userPresets.map(preset => (
                            <div
                              key={preset.id}
                              className="group flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
                            >
                              {editingPresetId === preset.id ? (
                                <div className="flex-1 flex gap-1">
                                  <Input
                                    value={editingPresetName}
                                    onChange={(e) => setEditingPresetName(e.target.value)}
                                    className="h-6 text-xs"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && editingPresetName.trim() && onRenamePreset) {
                                        onRenamePreset(preset.id, editingPresetName.trim());
                                        setEditingPresetId(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingPresetId(null);
                                      }
                                    }}
                                  />
                                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => {
                                    if (editingPresetName.trim() && onRenamePreset) {
                                      onRenamePreset(preset.id, editingPresetName.trim());
                                    }
                                    setEditingPresetId(null);
                                  }}>
                                    <Check className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    className="flex-1 text-left"
                                    onClick={() => onLoadPreset?.(preset)}
                                  >
                                    <p className="text-xs font-medium">{preset.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {new Date(preset.updated_at).toLocaleDateString()}
                                    </p>
                                  </button>
                                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                      setEditingPresetId(preset.id);
                                      setEditingPresetName(preset.name);
                                    }}>
                                      <PencilLine className="w-3 h-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDeletePreset?.(preset.id)}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Built-in templates */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Built-in Templates</p>
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
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/* ── Widgets tab extracted ── */

interface WidgetsTabProps {
  activeWidgetIds: string[];
  currentLayout: Layout[];
  expandedWidget: string | null;
  setExpandedWidget: (id: string | null) => void;
  poppedOutWidgets: Set<string>;
  widgetConfigs: WidgetConfigs;
  popOutOptions: PopOutOptions;
  addWidget: (def: WidgetDefinition) => void;
  removeWidget: (id: string) => void;
  updateWidgetSize: (id: string, field: 'w' | 'h', value: number) => void;
  toggleWidgetConfig: (widgetId: string, key: string, value: boolean) => void;
  updateWidgetConfigValue: (widgetId: string, key: string, value: number) => void;
  toggleShowWhenPoppedOut: (widgetId: string, value: boolean) => void;
  onPopOut?: (widgetId: string) => void;
}

function WidgetsTab({
  activeWidgetIds, currentLayout, expandedWidget, setExpandedWidget,
  poppedOutWidgets, widgetConfigs, popOutOptions,
  addWidget, removeWidget, updateWidgetSize, toggleWidgetConfig, updateWidgetConfigValue, toggleShowWhenPoppedOut, onPopOut,
}: WidgetsTabProps) {
  return (
    <>
      {['core', 'analytics', 'tools'].map(category => (
        <div key={category} className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{category}</p>
          {WIDGET_REGISTRY.filter(w => w.category === category).map(widget => {
            const isActive = activeWidgetIds.includes(widget.id);
            const isExpanded = expandedWidget === widget.id && isActive;
            const layoutItem = currentLayout.find(l => l.i === widget.id);
            const isPoppedOut = poppedOutWidgets.has(widget.id);
            const widgetConfig = widgetConfigs[widget.id] || getDefaultWidgetConfig(widget.id);

            return (
              <div key={widget.id} className="mb-1">
                <button
                  onClick={() => {
                    if (!isActive) { addWidget(widget); setExpandedWidget(widget.id); }
                    else { setExpandedWidget(isExpanded ? null : widget.id); }
                  }}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left ${
                    isActive ? 'bg-primary/10 border border-primary/30' : 'border border-transparent hover:bg-muted/30'
                  }`}
                >
                  <widget.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{widget.label}</p>
                      {isPoppedOut && <span className="text-[9px] px-1 py-0.5 rounded bg-accent text-accent-foreground">popped</span>}
                    </div>
                    {!isActive && <p className="text-[10px] text-muted-foreground truncate">{widget.description}</p>}
                  </div>
                  {isActive ? (
                    isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                  ) : (
                    <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                </button>

                {isExpanded && layoutItem && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-3 ml-6 mr-1 mt-1 mb-1 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                      {/* Width */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-muted-foreground font-medium">Width</label>
                          <div className="flex items-center gap-1">
                            <Input type="number" value={layoutItem.w} min={widget.minSize.w} step="0.1"
                              onChange={(e) => updateWidgetSize(widget.id, 'w', parseFloat(e.target.value) || widget.minSize.w)}
                              className="h-5 w-14 text-[10px] text-center p-0 font-mono" />
                            <span className="text-[10px] text-muted-foreground">cols</span>
                          </div>
                        </div>
                      </div>
                      {/* Height */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-muted-foreground font-medium">Height</label>
                          <div className="flex items-center gap-1">
                            <Input type="number" value={layoutItem.h} min={widget.minSize.h} step="0.1"
                              onChange={(e) => updateWidgetSize(widget.id, 'h', parseFloat(e.target.value) || widget.minSize.h)}
                              className="h-5 w-14 text-[10px] text-center p-0 font-mono" />
                            <span className="text-[10px] text-muted-foreground">rows</span>
                          </div>
                        </div>
                      </div>

                      {/* Text Size */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-muted-foreground font-medium">Text Size</label>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono text-muted-foreground">{(widgetConfig.textScale as number) ?? 100}%</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={70}
                          max={150}
                          step={5}
                          value={(widgetConfig.textScale as number) ?? 100}
                          onChange={(e) => updateWidgetConfigValue(widget.id, 'textScale', parseInt(e.target.value))}
                          className="w-full h-1.5 accent-primary cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                          <span>70%</span>
                          <button
                            className="text-primary hover:underline"
                            onClick={() => updateWidgetConfigValue(widget.id, 'textScale', 100)}
                          >
                            Reset
                          </button>
                          <span>150%</span>
                        </div>
                      </div>
                      {isPoppedOut && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-accent/10 border border-accent/20">
                          <div className="flex items-center gap-1.5">
                            {popOutOptions.showWhenPoppedOut.has(widget.id) ? <Eye className="w-3 h-3 text-accent-foreground" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                            <span className="text-[10px] font-medium">Show on dashboard too</span>
                          </div>
                          <Switch checked={popOutOptions.showWhenPoppedOut.has(widget.id)} onCheckedChange={(v) => toggleShowWhenPoppedOut(widget.id, v)} />
                        </div>
                      )}

                      {/* Config toggles */}
                      {widget.configOptions && widget.configOptions.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Display Elements</p>
                          <div className="space-y-1.5">
                            {widget.configOptions.map(opt => (
                              <div key={opt.key} className="flex items-center gap-2">
                                <Checkbox id={`${widget.id}-${opt.key}`}
                                  checked={!!(widgetConfig[opt.key] ?? opt.defaultValue)}
                                  onCheckedChange={(checked) => toggleWidgetConfig(widget.id, opt.key, !!checked)} />
                                <Label htmlFor={`${widget.id}-${opt.key}`} className="text-[10px] font-normal cursor-pointer">{opt.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1.5">
                        {onPopOut && (
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={() => onPopOut(widget.id)}>
                            <ExternalLink className="w-3 h-3" /> Pop Out
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive" onClick={() => removeWidget(widget.id)}>
                          <X className="w-3 h-3" /> Remove
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
    </>
  );
}
