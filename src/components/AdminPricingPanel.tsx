import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Settings, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { toast } from '@/hooks/use-toast';

export function AdminPricingPanel() {
  const { config, isLoading, updateConfig, minAmount, maxAmount, step } = usePricingConfig();
  
  const [localMin, setLocalMin] = useState(0.5);
  const [localMax, setLocalMax] = useState(100);
  const [localStep, setLocalStep] = useState(0.5);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with config
  useEffect(() => {
    if (config) {
      setLocalMin(config.min_amount_cents / 100);
      setLocalMax(config.max_amount_cents / 100);
      setLocalStep(config.step_cents / 100);
      setIsActive(config.is_active);
    }
  }, [config]);

  // Track changes
  useEffect(() => {
    if (config) {
      const changed = 
        localMin !== config.min_amount_cents / 100 ||
        localMax !== config.max_amount_cents / 100 ||
        localStep !== config.step_cents / 100 ||
        isActive !== config.is_active;
      setHasChanges(changed);
    }
  }, [config, localMin, localMax, localStep, isActive]);

  const handleSave = async () => {
    // Validation
    if (localMin < 0.5) {
      toast({
        title: "Invalid minimum",
        description: "Minimum must be at least €0.50",
        variant: "destructive",
      });
      return;
    }
    
    if (localMax > 100) {
      toast({
        title: "Invalid maximum",
        description: "Maximum cannot exceed €100",
        variant: "destructive",
      });
      return;
    }
    
    if (localMin >= localMax) {
      toast({
        title: "Invalid range",
        description: "Minimum must be less than maximum",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const { error } = await updateConfig({
      min_amount_cents: Math.round(localMin * 100),
      max_amount_cents: Math.round(localMax * 100),
      step_cents: Math.round(localStep * 100),
      is_active: isActive,
    });

    if (error) {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Pricing updated! 💰",
        description: `Bid range: €${localMin.toFixed(2)} - €${localMax.toFixed(2)}`,
      });
      setHasChanges(false);
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Skip the Line Pricing</h3>
            <p className="text-xs text-muted-foreground">
              Adjust bid amounts in real-time
            </p>
          </div>
        </div>
        {hasChanges && (
          <Badge variant="outline" className="text-primary border-primary/30">
            Unsaved changes
          </Badge>
        )}
      </div>

      {/* Active Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Priority Bidding Active</span>
        </div>
        <Switch 
          checked={isActive} 
          onCheckedChange={setIsActive}
        />
      </div>

      {/* Min Amount */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Minimum Bid</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">€</span>
            <Input
              type="number"
              min={0.5}
              max={localMax - 0.5}
              step={0.5}
              value={localMin}
              onChange={(e) => setLocalMin(parseFloat(e.target.value) || 0.5)}
              className="w-24 h-9 text-right"
            />
          </div>
        </div>
        <Slider
          value={[localMin]}
          onValueChange={([val]) => setLocalMin(val)}
          min={0.5}
          max={50}
          step={0.5}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>€0.50</span>
          <span>€50.00</span>
        </div>
      </div>

      {/* Max Amount */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Maximum Bid</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">€</span>
            <Input
              type="number"
              min={localMin + 0.5}
              max={100}
              step={0.5}
              value={localMax}
              onChange={(e) => setLocalMax(parseFloat(e.target.value) || 100)}
              className="w-24 h-9 text-right"
            />
          </div>
        </div>
        <Slider
          value={[localMax]}
          onValueChange={([val]) => setLocalMax(val)}
          min={5}
          max={100}
          step={0.5}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>€5.00</span>
          <span>€100.00</span>
        </div>
      </div>

      {/* Step Amount */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Step Increment</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">€</span>
            <Input
              type="number"
              min={0.5}
              max={10}
              step={0.5}
              value={localStep}
              onChange={(e) => setLocalStep(parseFloat(e.target.value) || 0.5)}
              className="w-24 h-9 text-right"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Slider will move in €{localStep.toFixed(2)} increments
        </p>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
        <p className="text-sm font-medium text-primary">Current Settings Preview</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Min</p>
            <p className="text-lg font-bold">€{localMin.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Max</p>
            <p className="text-lg font-bold">€{localMax.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Step</p>
            <p className="text-lg font-bold">€{localStep.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Validation Warning */}
      {localMin >= localMax && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Minimum must be less than maximum</span>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving || !hasChanges || localMin >= localMax}
        className="w-full"
        size="lg"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Save Pricing Changes
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Changes apply immediately to all users
      </p>
    </motion.div>
  );
}
