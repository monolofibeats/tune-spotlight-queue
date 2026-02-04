import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Percent, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BidConfig {
  id: string;
  min_amount_cents: number;
  max_amount_cents: number;
  is_active: boolean;
}

export function AdminBidSettings() {
  const [config, setConfig] = useState<BidConfig | null>(null);
  const [incrementPercent, setIncrementPercent] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('config_type', 'bid_increment')
      .single();

    if (!error && data) {
      setConfig(data);
      setIncrementPercent(data.min_amount_cents); // Using min_amount_cents to store %
      setIsActive(data.is_active);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from('pricing_config')
      .update({
        min_amount_cents: incrementPercent, // Storing % in min_amount_cents
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save bid settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Saved!",
        description: "Bid increment settings updated",
      });
    }
    
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/50 p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Percent className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Bid Increment Settings</h3>
      </div>

      <div className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable Bidding System</p>
            <p className="text-xs text-muted-foreground">
              Allow users to bid for higher queue positions
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {/* Increment Percentage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Bid Increment</label>
            <span className="text-sm font-bold text-primary">{incrementPercent}%</span>
          </div>
          <Slider
            value={[incrementPercent]}
            onValueChange={(value) => setIncrementPercent(value[0])}
            min={5}
            max={100}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            When someone is outbid, they'll be offered to pay {incrementPercent}% more than the current leader
          </p>
        </div>

        {/* Example */}
        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground mb-2">Example:</p>
          <p className="text-sm">
            If Spot #1 has €30 total → New suggested bid: <span className="font-bold text-primary">€{(30 * (1 + incrementPercent / 100)).toFixed(2)}</span>
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
