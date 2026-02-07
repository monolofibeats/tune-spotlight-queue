import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Loader2,
  Zap,
  Send,
  ToggleLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PricingConfig {
  id: string;
  config_type: string;
  min_amount_cents: number;
  max_amount_cents: number;
  step_cents: number;
  is_active: boolean;
}

interface PricingSettingsProps {
  streamerId: string;
}

export function PricingSettings({ streamerId }: PricingSettingsProps) {
  const [configs, setConfigs] = useState<Record<string, PricingConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, [streamerId]);

  const fetchConfigs = async () => {
    // Try to fetch streamer-specific configs first
    let { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('streamer_id', streamerId);

    if (error) {
      console.error('Error fetching pricing configs:', error);
      setIsLoading(false);
      return;
    }

    // If no streamer-specific configs exist, create defaults from global
    if (!data || data.length === 0) {
      // Get global configs to use as templates
      const { data: globalConfigs } = await supabase
        .from('pricing_config')
        .select('*')
        .is('streamer_id', null);

      if (globalConfigs && globalConfigs.length > 0) {
        // Create streamer-specific copies
        const newConfigs = globalConfigs.map(gc => ({
          config_type: gc.config_type,
          min_amount_cents: gc.min_amount_cents,
          max_amount_cents: gc.max_amount_cents,
          step_cents: gc.step_cents,
          is_active: gc.is_active,
          streamer_id: streamerId,
        }));

        const { data: insertedConfigs, error: insertError } = await supabase
          .from('pricing_config')
          .insert(newConfigs)
          .select();

        if (!insertError && insertedConfigs) {
          data = insertedConfigs;
        }
      }
    }

    if (data) {
      const configMap: Record<string, PricingConfig> = {};
      data.forEach(c => {
        configMap[c.config_type] = c;
      });
      setConfigs(configMap);
    }

    setIsLoading(false);
  };

  const updateConfig = async (configType: string, updates: Partial<PricingConfig>) => {
    const config = configs[configType];
    if (!config) return;

    setIsSaving(true);

    const { error } = await supabase
      .from('pricing_config')
      .update(updates)
      .eq('id', config.id);

    if (error) {
      toast({ title: 'Failed to update pricing', variant: 'destructive' });
    } else {
      setConfigs({
        ...configs,
        [configType]: { ...config, ...updates }
      });
      toast({ title: 'Pricing updated!' });
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const skipLineConfig = configs['skip_line'];
  const submissionConfig = configs['submission'];
  const submissionsOpenConfig = configs['submissions_open'];

  return (
    <div className="space-y-6">
      {/* Submissions Toggle */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ToggleLeft className="w-5 h-5" />
                Accept Submissions
              </CardTitle>
              <CardDescription>
                Toggle whether users can submit to your queue
              </CardDescription>
            </div>
            <Switch
              checked={submissionsOpenConfig?.is_active ?? true}
              onCheckedChange={(checked) => 
                submissionsOpenConfig && updateConfig('submissions_open', { is_active: checked })
              }
            />
          </div>
        </CardHeader>
      </Card>

      {/* Submission Fee */}
      {submissionConfig && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Submission Fee
                </CardTitle>
                <CardDescription>
                  Charge a fee for each submission
                </CardDescription>
              </div>
              <Switch
                checked={submissionConfig.is_active}
                onCheckedChange={(checked) => updateConfig('submission', { is_active: checked })}
              />
            </div>
          </CardHeader>
          {submissionConfig.is_active && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum (€)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={submissionConfig.min_amount_cents / 100}
                    onChange={(e) => updateConfig('submission', { 
                      min_amount_cents: Math.round(parseFloat(e.target.value) * 100) 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum (€)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={submissionConfig.max_amount_cents / 100}
                    onChange={(e) => updateConfig('submission', { 
                      max_amount_cents: Math.round(parseFloat(e.target.value) * 100) 
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Step Amount (€)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={submissionConfig.step_cents / 100}
                  onChange={(e) => updateConfig('submission', { 
                    step_cents: Math.round(parseFloat(e.target.value) * 100) 
                  })}
                />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Skip the Line / Boost Pricing */}
      {skipLineConfig && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Skip the Line / Boost
                </CardTitle>
                <CardDescription>
                  Allow users to pay to move up in the queue
                </CardDescription>
              </div>
              <Switch
                checked={skipLineConfig.is_active}
                onCheckedChange={(checked) => updateConfig('skip_line', { is_active: checked })}
              />
            </div>
          </CardHeader>
          {skipLineConfig.is_active && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Bid (€)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={skipLineConfig.min_amount_cents / 100}
                    onChange={(e) => updateConfig('skip_line', { 
                      min_amount_cents: Math.round(parseFloat(e.target.value) * 100) 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Bid (€)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    value={skipLineConfig.max_amount_cents / 100}
                    onChange={(e) => updateConfig('skip_line', { 
                      max_amount_cents: Math.round(parseFloat(e.target.value) * 100) 
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bid Step (€)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={skipLineConfig.step_cents / 100}
                  onChange={(e) => updateConfig('skip_line', { 
                    step_cents: Math.round(parseFloat(e.target.value) * 100) 
                  })}
                />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Tip for Pro streamers */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Pro Tip</p>
              <p className="text-sm text-muted-foreground">
                Setting lower minimum bids can increase engagement, while higher maximums let 
                enthusiastic supporters stand out. Experiment to find what works for your community!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
