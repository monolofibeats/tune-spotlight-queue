import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Settings, Loader2, Check, AlertCircle, Zap, Send, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllPricingConfigs } from '@/hooks/usePricingConfig';
import { toast } from '@/hooks/use-toast';

interface PricingFormState {
  min: number;
  max: number;
  step: number;
  isActive: boolean;
}

export function AdminPricingPanel() {
  const { configs, isLoading, updateConfig, skipLineConfig, submissionConfig, submissionsOpenConfig } = useAllPricingConfigs();
  
  // Skip Line state
  const [skipLine, setSkipLine] = useState<PricingFormState>({
    min: 0.5, max: 100, step: 0.5, isActive: true
  });
  
  // Submission state
  const [submission, setSubmission] = useState<PricingFormState>({
    min: 1, max: 20, step: 0.5, isActive: false
  });
  
  // Submissions open state (master toggle)
  const [submissionsOpen, setSubmissionsOpen] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('skip_line');

  // Sync local state with config
  useEffect(() => {
    if (skipLineConfig) {
      setSkipLine({
        min: skipLineConfig.min_amount_cents / 100,
        max: skipLineConfig.max_amount_cents / 100,
        step: skipLineConfig.step_cents / 100,
        isActive: skipLineConfig.is_active,
      });
    }
    if (submissionConfig) {
      setSubmission({
        min: submissionConfig.min_amount_cents / 100,
        max: submissionConfig.max_amount_cents / 100,
        step: submissionConfig.step_cents / 100,
        isActive: submissionConfig.is_active,
      });
    }
    if (submissionsOpenConfig) {
      setSubmissionsOpen(submissionsOpenConfig.is_active);
    }
  }, [skipLineConfig, submissionConfig, submissionsOpenConfig]);

  // Track changes
  useEffect(() => {
    if (skipLineConfig && submissionConfig && submissionsOpenConfig) {
      const skipChanged = 
        skipLine.min !== skipLineConfig.min_amount_cents / 100 ||
        skipLine.max !== skipLineConfig.max_amount_cents / 100 ||
        skipLine.step !== skipLineConfig.step_cents / 100 ||
        skipLine.isActive !== skipLineConfig.is_active;
      
      const subChanged = 
        submission.min !== submissionConfig.min_amount_cents / 100 ||
        submission.max !== submissionConfig.max_amount_cents / 100 ||
        submission.step !== submissionConfig.step_cents / 100 ||
        submission.isActive !== submissionConfig.is_active;
      
      const openChanged = submissionsOpen !== submissionsOpenConfig.is_active;
      
      setHasChanges(skipChanged || subChanged || openChanged);
    }
  }, [configs, skipLine, submission, submissionsOpen, skipLineConfig, submissionConfig, submissionsOpenConfig]);

  const handleSave = async () => {
    // Validation
    if (skipLine.min >= skipLine.max) {
      toast({
        title: "Invalid skip line range",
        description: "Minimum must be less than maximum",
        variant: "destructive",
      });
      return;
    }
    
    if (submission.isActive && submission.min >= submission.max) {
      toast({
        title: "Invalid submission range",
        description: "Minimum must be less than maximum",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Update submissions open config
      const { error: openError } = await updateConfig('submissions_open', {
        is_active: submissionsOpen,
      });

      if (openError) throw openError;

      // Update skip line config
      const { error: skipError } = await updateConfig('skip_line', {
        min_amount_cents: Math.round(skipLine.min * 100),
        max_amount_cents: Math.round(skipLine.max * 100),
        step_cents: Math.round(skipLine.step * 100),
        is_active: skipLine.isActive,
      });

      if (skipError) throw skipError;

      // Update submission config
      const { error: subError } = await updateConfig('submission', {
        min_amount_cents: Math.round(submission.min * 100),
        max_amount_cents: Math.round(submission.max * 100),
        step_cents: Math.round(submission.step * 100),
        is_active: submission.isActive,
      });

      if (subError) throw subError;

      toast({
        title: "Pricing updated! 💰",
        description: !submissionsOpen 
          ? "Submissions are currently CLOSED"
          : submission.isActive 
            ? `Submissions: €${submission.min.toFixed(2)}, Bids: €${skipLine.min.toFixed(2)}-€${skipLine.max.toFixed(2)}`
            : `Submissions: Free, Bids: €${skipLine.min.toFixed(2)}-€${skipLine.max.toFixed(2)}`,
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
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
            <h3 className="font-semibold">Zahlungseinstellungen</h3>
            <p className="text-xs text-muted-foreground">
              Einsendungs- und Gebotspreise in Echtzeit anpassen
            </p>
          </div>
        </div>
        {hasChanges && (
          <Badge variant="outline" className="text-primary border-primary/30">
            Unsaved changes
          </Badge>
        )}
      </div>

      {/* Master Toggle - Accept Submissions */}
      <div className={`flex items-center justify-between p-4 rounded-lg border ${
        submissionsOpen 
          ? 'bg-emerald-500/10 border-emerald-500/30' 
          : 'bg-destructive/10 border-destructive/30'
      }`}>
        <div className="flex items-center gap-3">
          {submissionsOpen ? (
            <Send className="w-5 h-5 text-emerald-400" />
          ) : (
            <Ban className="w-5 h-5 text-destructive" />
          )}
          <div>
            <p className="font-medium">
              {submissionsOpen ? 'Einsendungen offen' : 'Einsendungen geschlossen'}
            </p>
            <p className="text-xs text-muted-foreground">
              {submissionsOpen 
                ? 'Nutzer können Tracks schicken' 
                : 'Nutzer können gerade keine Tracks schicken'}
            </p>
          </div>
        </div>
        <Switch 
          checked={submissionsOpen} 
          onCheckedChange={setSubmissionsOpen}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="skip_line" className="gap-2">
            <Zap className="w-4 h-4" />
            Warteliste überspringen
          </TabsTrigger>
          <TabsTrigger value="submission" className="gap-2">
            <Send className="w-4 h-4" />
            Einsendungen
          </TabsTrigger>
        </TabsList>

        {/* Skip the Line Tab */}
        <TabsContent value="skip_line" className="space-y-4 mt-4">
          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Warteschlange überspringen ist aktiviert</span>
            </div>
            <Switch 
              checked={skipLine.isActive} 
              onCheckedChange={(checked) => setSkipLine(s => ({ ...s, isActive: checked }))}
            />
          </div>

          {/* Min Amount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Minimum Preis</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  type="number"
                  min={0.5}
                  max={skipLine.max - 0.5}
                  step={0.5}
                  value={skipLine.min}
                  onChange={(e) => setSkipLine(s => ({ ...s, min: parseFloat(e.target.value) || 0.5 }))}
                  className="w-24 h-9 text-right"
                />
              </div>
            </div>
            <Slider
              value={[skipLine.min]}
              onValueChange={([val]) => setSkipLine(s => ({ ...s, min: val }))}
              min={0.5}
              max={50}
              step={0.5}
            />
          </div>

          {/* Max Amount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Maximum Preis</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  type="number"
                  min={skipLine.min + 0.5}
                  max={100}
                  step={0.5}
                  value={skipLine.max}
                  onChange={(e) => setSkipLine(s => ({ ...s, max: parseFloat(e.target.value) || 100 }))}
                  className="w-24 h-9 text-right"
                />
              </div>
            </div>
            <Slider
              value={[skipLine.max]}
              onValueChange={([val]) => setSkipLine(s => ({ ...s, max: val }))}
              min={5}
              max={100}
              step={0.5}
            />
          </div>

          {/* Step */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Stufenweise Erhöhung</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">€</span>
              <Input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={skipLine.step}
                onChange={(e) => setSkipLine(s => ({ ...s, step: parseFloat(e.target.value) || 0.5 }))}
                className="w-24 h-9 text-right"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm font-medium text-amber-400 mb-2">Warteliste überspringen Vorschau</p>
            <p className="text-xs text-muted-foreground">
              Nutzer können zwischen €{skipLine.min.toFixed(2)} und €{skipLine.max.toFixed(2)} 
              bieten in €{skipLine.step.toFixed(2)} Geboten
            </p>
          </div>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submission" className="space-y-4 mt-4">
          {/* Paid Toggle */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            submission.isActive ? 'bg-primary/20 border border-primary/30' : 'bg-secondary/30'
          }`}>
            <div>
              <p className="text-sm font-medium">
                {submission.isActive ? 'Paid Submissions' : 'Free Submissions'}
              </p>
              <p className="text-xs text-muted-foreground">
                {submission.isActive 
                  ? 'Users must pay to submit songs' 
                  : 'Anyone can submit songs for free'}
              </p>
            </div>
            <Switch 
              checked={submission.isActive} 
              onCheckedChange={(checked) => setSubmission(s => ({ ...s, isActive: checked }))}
            />
          </div>

          {submission.isActive && (
            <>
              {/* Fixed Price */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Submission Price</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">€</span>
                    <Input
                      type="number"
                      min={0.5}
                      max={100}
                      step={0.5}
                      value={submission.min}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1;
                        setSubmission(s => ({ ...s, min: val, max: Math.max(val, s.max) }));
                      }}
                      className="w-24 h-9 text-right"
                    />
                  </div>
                </div>
                <Slider
                  value={[submission.min]}
                  onValueChange={([val]) => setSubmission(s => ({ ...s, min: val, max: Math.max(val, s.max) }))}
                  min={0.5}
                  max={20}
                  step={0.5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>€0.50</span>
                  <span>€20.00</span>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium text-primary mb-2">Submission Fee Active</p>
                <p className="text-2xl font-bold">€{submission.min.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Per song submission
                </p>
              </div>
            </>
          )}

          {!submission.isActive && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-400 mb-2">Free Submissions Active</p>
              <p className="text-xs text-muted-foreground">
                Users can submit songs without payment. Toggle on to start charging.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Validation Warning */}
      {((skipLine.min >= skipLine.max) || (submission.isActive && submission.min >= submission.max)) && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Minimum must be less than maximum</span>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving || !hasChanges || skipLine.min >= skipLine.max}
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
            Save All Pricing Changes
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Changes apply immediately to all users
      </p>
    </motion.div>
  );
}
