import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DashboardWidget {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  order: number;
}

export interface StreamerPreset {
  id: string;
  streamer_id: string;
  name: string;
  platform_type: string;
  occasion_type: string;
  is_active: boolean;
  theme_config: Record<string, unknown>;
  dashboard_layout: { widgets: string[] };
  form_template: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_WIDGETS = ['stats', 'queue', 'now_playing'];

const PLATFORM_TEMPLATES: Record<string, Partial<StreamerPreset>> = {
  twitch_music: {
    name: 'Twitch Music Review',
    platform_type: 'twitch',
    occasion_type: 'music_review',
    theme_config: { primaryColor: '270 70% 50%', cardStyle: 'glass', animationStyle: 'dynamic' },
    dashboard_layout: { widgets: ['stats', 'queue', 'now_playing'] },
    form_template: 'music',
  },
  youtube_music: {
    name: 'YouTube Music Review',
    platform_type: 'youtube',
    occasion_type: 'music_review',
    theme_config: { primaryColor: '0 80% 50%', cardStyle: 'solid', animationStyle: 'subtle' },
    dashboard_layout: { widgets: ['stats', 'queue', 'now_playing'] },
    form_template: 'music',
  },
  tiktok_live: {
    name: 'TikTok Live',
    platform_type: 'tiktok',
    occasion_type: 'music_review',
    theme_config: { primaryColor: '340 80% 55%', cardStyle: 'glass', animationStyle: 'dynamic' },
    dashboard_layout: { widgets: ['stats', 'queue'] },
    form_template: 'music',
  },
  game_review: {
    name: 'Game Review',
    platform_type: 'custom',
    occasion_type: 'game_review',
    theme_config: { primaryColor: '142 76% 36%', cardStyle: 'solid', animationStyle: 'subtle' },
    dashboard_layout: { widgets: ['stats', 'queue', 'now_playing'] },
    form_template: 'games',
  },
  profile_review: {
    name: 'Instagram Profile Review',
    platform_type: 'custom',
    occasion_type: 'profile_review',
    theme_config: { primaryColor: '330 80% 55%', cardStyle: 'glass', animationStyle: 'dynamic' },
    dashboard_layout: { widgets: ['stats', 'queue'] },
    form_template: 'ratings',
  },
  general: {
    name: 'General Rating',
    platform_type: 'custom',
    occasion_type: 'general_rating',
    theme_config: { primaryColor: '45 90% 50%', cardStyle: 'glass', animationStyle: 'subtle' },
    dashboard_layout: { widgets: ['stats', 'queue', 'now_playing'] },
    form_template: 'ratings',
  },
};

export { PLATFORM_TEMPLATES, DEFAULT_WIDGETS };

export function useStreamerPresets(streamerId?: string) {
  const [presets, setPresets] = useState<StreamerPreset[]>([]);
  const [activePreset, setActivePreset] = useState<StreamerPreset | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPresets = useCallback(async () => {
    if (!streamerId) return;
    
    const { data, error } = await supabase
      .from('streamer_presets')
      .select('*')
      .eq('streamer_id', streamerId)
      .order('created_at');

    if (!error && data) {
      const typed = data.map(p => ({
        ...p,
        theme_config: (p.theme_config || {}) as Record<string, unknown>,
        dashboard_layout: (p.dashboard_layout || { widgets: DEFAULT_WIDGETS }) as { widgets: string[] },
      }));
      setPresets(typed);
      const active = typed.find(p => p.is_active);
      setActivePreset(active || null);
    }
    setIsLoading(false);
  }, [streamerId]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const createPreset = async (templateKey?: string) => {
    if (!streamerId) return;
    
    const template = templateKey ? PLATFORM_TEMPLATES[templateKey] : {};
    
    const insertData = {
      streamer_id: streamerId,
      name: template?.name || 'New Preset',
      platform_type: template?.platform_type || 'custom',
      occasion_type: template?.occasion_type || 'custom',
      theme_config: (template?.theme_config || {}) as unknown as Record<string, never>,
      dashboard_layout: (template?.dashboard_layout || { widgets: DEFAULT_WIDGETS }) as unknown as Record<string, never>,
      form_template: template?.form_template || null,
    };

    const { data, error } = await supabase
      .from('streamer_presets')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast({ title: 'Failed to create preset', variant: 'destructive' });
    } else if (data) {
      toast({ title: `Preset "${data.name}" created!` });
      fetchPresets();
    }
    return data;
  };

  const activatePreset = async (presetId: string) => {
    if (!streamerId) return;
    
    // Deactivate all
    await supabase
      .from('streamer_presets')
      .update({ is_active: false })
      .eq('streamer_id', streamerId);

    // Activate selected
    const { error } = await supabase
      .from('streamer_presets')
      .update({ is_active: true })
      .eq('id', presetId);

    if (!error) {
      toast({ title: 'Preset activated!' });
      fetchPresets();
    }
  };

  const updatePreset = async (presetId: string, updates: Partial<StreamerPreset>) => {
    const { error } = await supabase
      .from('streamer_presets')
      .update(updates)
      .eq('id', presetId);

    if (!error) {
      fetchPresets();
    }
    return !error;
  };

  const deletePreset = async (presetId: string) => {
    const { error } = await supabase
      .from('streamer_presets')
      .delete()
      .eq('id', presetId);

    if (!error) {
      toast({ title: 'Preset deleted' });
      fetchPresets();
    }
  };

  return {
    presets,
    activePreset,
    isLoading,
    createPreset,
    activatePreset,
    updatePreset,
    deletePreset,
    refetch: fetchPresets,
  };
}
