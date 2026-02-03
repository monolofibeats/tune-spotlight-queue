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

type ConfigType = 'skip_line' | 'submission';

export function usePricingConfig(configType: ConfigType = 'skip_line') {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('config_type', configType)
      .single();

    if (!error && data) {
      setConfig(data);
    }
    setIsLoading(false);
  }, [configType]);

  useEffect(() => {
    fetchConfig();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`pricing_config_${configType}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pricing_config' 
      }, fetchConfig)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConfig, configType]);

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
    // Convenience getters in euros
    minAmount: config ? config.min_amount_cents / 100 : 0.5,
    maxAmount: config ? config.max_amount_cents / 100 : 100,
    step: config ? config.step_cents / 100 : 0.5,
    isActive: config?.is_active ?? false,
  };
}

// Hook for fetching all pricing configs at once
export function useAllPricingConfigs() {
  const [configs, setConfigs] = useState<Record<string, PricingConfig>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*');

    if (!error && data) {
      const configMap: Record<string, PricingConfig> = {};
      data.forEach(c => {
        configMap[c.config_type] = c;
      });
      setConfigs(configMap);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();

    const channel = supabase
      .channel('all_pricing_configs')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pricing_config' 
      }, fetchConfigs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConfigs]);

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
  };
}
