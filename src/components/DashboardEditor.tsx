import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Pencil,
  X,
  GripVertical,
  BarChart3,
  ListMusic,
  Play,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStreamerPresets, DEFAULT_WIDGETS } from '@/hooks/useStreamerPresets';
import { useLanguage } from '@/hooks/useLanguage';

interface DashboardEditorProps {
  streamerId: string;
}

interface WidgetConfig {
  id: string;
  icon: typeof BarChart3;
  enabled: boolean;
}

const WIDGET_DEFS = [
  { id: 'stats', icon: BarChart3 },
  { id: 'queue', icon: ListMusic },
  { id: 'now_playing', icon: Play },
];

export function DashboardEditor({ streamerId }: DashboardEditorProps) {
  const { activePreset, updatePreset } = useStreamerPresets(streamerId);
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const activeWidgets = activePreset?.dashboard_layout?.widgets || DEFAULT_WIDGETS;

    const widgetConfigs: WidgetConfig[] = [];

    for (const wId of activeWidgets) {
      const def = WIDGET_DEFS.find(w => w.id === wId);
      if (def) widgetConfigs.push({ ...def, enabled: true });
    }

    for (const def of WIDGET_DEFS) {
      if (!activeWidgets.includes(def.id)) {
        widgetConfigs.push({ ...def, enabled: false });
      }
    }

    setWidgets(widgetConfigs);
  }, [activePreset]);

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const handleSave = async () => {
    setIsSaving(true);

    const enabledWidgets = widgets.filter(w => w.enabled).map(w => w.id);

    if (activePreset) {
      await updatePreset(activePreset.id, {
        dashboard_layout: { widgets: enabledWidgets },
      });
    } else {
      await supabase
        .from('streamer_presets')
        .insert({
          streamer_id: streamerId,
          name: 'Default',
          is_active: true,
          dashboard_layout: { widgets: enabledWidgets } as unknown as Record<string, never>,
        })
        .select()
        .single();
    }

    toast({ title: t('dashboardEditor.savedTitle') });
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsEditing(!isEditing)}
        className="h-8 w-8"
        title={t('dashboardEditor.title')}
      >
        <Pencil className="w-4 h-4" />
      </Button>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 right-4 z-50 w-80"
          >
            <Card className="bg-card border-border shadow-xl">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{t('dashboardEditor.title')}</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t('dashboardEditor.desc')}
                  {!activePreset && t('dashboardEditor.descNoPreset')}
                </p>

                <Reorder.Group axis="y" values={widgets} onReorder={setWidgets} className="space-y-2">
                  {widgets.map((widget) => (
                    <Reorder.Item key={widget.id} value={widget}>
                      <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${widget.enabled ? 'bg-card border-border' : 'bg-muted/30 border-border/50 opacity-60'}`}>
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
                        <widget.icon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm flex-1">{t(`dashboardEditor.widget.${widget.id}`)}</span>
                        <Switch
                          checked={widget.enabled}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>

                <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2" size="sm">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('dashboardEditor.saveLayout')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function useDashboardLayout(streamerId?: string) {
  const { activePreset, isLoading } = useStreamerPresets(streamerId);
  const visibleWidgets = activePreset?.dashboard_layout?.widgets || DEFAULT_WIDGETS;
  return { visibleWidgets, isLoading };
}
