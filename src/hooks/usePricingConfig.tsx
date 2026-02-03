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

export function usePricingConfig() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('config_type', 'skip_line')
      .single();

    if (!error && data) {
      setConfig(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('pricing_config_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pricing_config' 
      }, fetchConfig)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConfig]);

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
  };
}
