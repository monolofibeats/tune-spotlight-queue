import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Check,
  Loader2,
  Tv,
  Youtube,
  Gamepad2,
  Star,
  Instagram,
  Radio,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStreamerPresets, PLATFORM_TEMPLATES, type StreamerPreset } from '@/hooks/useStreamerPresets';
import { useLanguage } from '@/hooks/useLanguage';

interface PresetManagerProps {
  streamerId: string;
}

export function PresetManager({ streamerId }: PresetManagerProps) {
  const { t } = useLanguage();
  const { presets, activePreset, isLoading, createPreset, activatePreset, updatePreset, deletePreset } = useStreamerPresets(streamerId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (preset: StreamerPreset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
  };

  const handleSaveEdit = async (presetId: string) => {
    await updatePreset(presetId, { name: editName });
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('presets.yourPresets')}</h3>
        <Button size="sm" variant="outline" onClick={() => createPreset()} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('presets.customPreset')}
        </Button>
      </div>

      {presets.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>{t('presets.noPresets')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {presets.map((preset) => (
            <motion.div
              key={preset.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={`bg-card/50 border-border/50 transition-all ${preset.is_active ? 'ring-2 ring-primary border-primary/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {preset.is_active && (
                        <Badge variant="default" className="shrink-0 text-xs">{t('presets.active')}</Badge>
                      )}
                      
                      {editingId === preset.id ? (
                        <div className="flex gap-2 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(preset.id)}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => handleSaveEdit(preset.id)}>
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <p className="font-medium truncate">{preset.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {preset.platform_type !== 'custom' ? preset.platform_type : preset.occasion_type !== 'custom' ? preset.occasion_type.replace('_', ' ') : 'Custom'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => handleStartEdit(preset)} className="h-8 w-8">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {!preset.is_active && (
                        <Button size="sm" variant="outline" onClick={() => activatePreset(preset.id)} className="text-xs">
                          {t('presets.activate')}
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => deletePreset(preset.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
