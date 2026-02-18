import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PricingConfig {
  id: string;
  config_type: string;
  min_amount_cents: number;
  max_amount_cents: number;
  step_cents: number;
  is_active: boolean;
}

type ConfigType = 'skip_line' | 'submission' | 'submissions_open' | 'bid_increment';

// Fetches the streamer-specific config, falling back to global default (streamer_id IS NULL)
export function usePricingConfig(configType: ConfigType = 'skip_line', streamerId?: string) {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    // Fetch all rows for this config_type (global + streamer-specific)
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('config_type', configType);

    if (!error && data && data.length > 0) {
      // Prefer streamer-specific row if streamerId provided
      const streamerRow = streamerId ? data.find(r => r.streamer_id === streamerId) : null;
      const globalRow = data.find(r => r.streamer_id === null);
      setConfig(streamerRow ?? globalRow ?? data[0]);
    }
    setIsLoading(false);
  }, [configType, streamerId]);

  useEffect(() => {
    fetchConfig();

    const channel = supabase
      .channel(`pricing_config_${configType}_${streamerId ?? 'global'}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pricing_config' 
      }, fetchConfig)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConfig, configType, streamerId]);

  const updateConfig = async (updates: Partial<PricingConfig>) => {
    if (!config) return { error: new Error('No config loaded') };
    
    const { error } = await supabase
      .from('pricing_config')
      .update(updates)
      .eq('id', config.id);

    if (!error) {
      await fetchConfig();
    }
    
    return { error };
  };

  return {
    config,
    isLoading,
    refetch: fetchConfig,
    updateConfig,
    minAmount: config ? config.min_amount_cents / 100 : 0.5,
    maxAmount: config ? config.max_amount_cents / 100 : 100,
    step: config ? config.step_cents / 100 : 0.5,
    isActive: config?.is_active ?? false,
  };
}

// Hook for fetching all pricing configs at once, prioritizing streamer-specific rows
export function useAllPricingConfigs(streamerId?: string) {
  const [configs, setConfigs] = useState<Record<string, PricingConfig>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*');

    if (!error && data) {
      const configMap: Record<string, PricingConfig> = {};
      // First pass: global defaults
      data.filter(r => r.streamer_id === null).forEach(c => {
        configMap[c.config_type] = c;
      });
      // Second pass: streamer-specific overrides
      if (streamerId) {
        data.filter(r => r.streamer_id === streamerId).forEach(c => {
          configMap[c.config_type] = c;
        });
      }
      setConfigs(configMap);
    }
    setIsLoading(false);
  }, [streamerId]);

  useEffect(() => {
    fetchConfigs();

    const channel = supabase
      .channel(`all_pricing_configs_${streamerId ?? 'global'}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pricing_config' 
      }, fetchConfigs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConfigs, streamerId]);

  const updateConfig = async (configType: string, updates: Partial<PricingConfig>) => {
    const config = configs[configType];
    if (!config) return { error: new Error('Config not found') };
    
    const { error } = await supabase
      .from('pricing_config')
      .update(updates)
      .eq('id', config.id);

    if (!error) {
      await fetchConfigs();
    }
    
    return { error };
  };

  return {
    configs,
    isLoading,
    refetch: fetchConfigs,
    updateConfig,
    skipLineConfig: configs['skip_line'],
    submissionConfig: configs['submission'],
    submissionsOpenConfig: configs['submissions_open'],
  };
}
