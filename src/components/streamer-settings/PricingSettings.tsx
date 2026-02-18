import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Settings, 
  Loader2, 
  Check, 
  AlertCircle, 
  Zap, 
  Send, 
  Ban,
  TrendingUp,
  Percent,
  ToggleLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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

interface PricingFormState {
  min: number;
  max: number;
  step: number;
  isActive: boolean;
}

interface PricingSettingsProps {
  streamerId: string;
}

export function PricingSettings({ streamerId }: PricingSettingsProps) {
  const [configs, setConfigs] = useState<Record<string, PricingConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('skip_line');

  // Local form state
  const [skipLine, setSkipLine] = useState<PricingFormState>({
    min: 0.5, max: 100, step: 0.5, isActive: true
  });
  const [submission, setSubmission] = useState<PricingFormState>({
    min: 1, max: 20, step: 0.5, isActive: false
  });
  const [submissionsOpen, setSubmissionsOpen] = useState(true);

  // Bid increment state
  const [bidIncrementPercent, setBidIncrementPercent] = useState(10);
  const [bidIncrementActive, setBidIncrementActive] = useState(true);

  useEffect(() => {
    fetchConfigs();
  }, [streamerId]);

  const fetchConfigs = async () => {
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('streamer_id', streamerId);

    if (error) {
      console.error('Error fetching pricing configs:', error);
      setIsLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const configMap: Record<string, PricingConfig> = {};
      data.forEach(c => { configMap[c.config_type] = c; });
      setConfigs(configMap);
      syncFormState(configMap);
    }
    // If no streamer-specific configs exist, leave defaults in local state — save will upsert them

    setIsLoading(false);
  };

  const syncFormState = (configMap: Record<string, PricingConfig>) => {
    const sl = configMap['skip_line'];
    if (sl) {
      setSkipLine({
        min: sl.min_amount_cents / 100,
        max: sl.max_amount_cents / 100,
        step: sl.step_cents / 100,
        isActive: sl.is_active,
      });
    }
    const sub = configMap['submission'];
    if (sub) {
      setSubmission({
        min: sub.min_amount_cents / 100,
        max: sub.max_amount_cents / 100,
        step: sub.step_cents / 100,
        isActive: sub.is_active,
      });
    }
    const so = configMap['submissions_open'];
    if (so) {
      setSubmissionsOpen(so.is_active);
    }
    const bi = configMap['bid_increment'];
    if (bi) {
      setBidIncrementPercent(bi.min_amount_cents);
      setBidIncrementActive(bi.is_active);
    }
  };

  // Track changes
  useEffect(() => {
    const sl = configs['skip_line'];
    const sub = configs['submission'];
    const so = configs['submissions_open'];
    const bi = configs['bid_increment'];

    if (!sl || !sub) return;

    const skipChanged =
      skipLine.min !== sl.min_amount_cents / 100 ||
      skipLine.max !== sl.max_amount_cents / 100 ||
      skipLine.step !== sl.step_cents / 100 ||
      skipLine.isActive !== sl.is_active;

    const subChanged =
      submission.min !== sub.min_amount_cents / 100 ||
      submission.max !== sub.max_amount_cents / 100 ||
      submission.step !== sub.step_cents / 100 ||
      submission.isActive !== sub.is_active;

    const openChanged = so ? submissionsOpen !== so.is_active : false;

    const bidChanged = bi
      ? bidIncrementPercent !== bi.min_amount_cents || bidIncrementActive !== bi.is_active
      : false;

    setHasChanges(skipChanged || subChanged || openChanged || bidChanged);
  }, [configs, skipLine, submission, submissionsOpen, bidIncrementPercent, bidIncrementActive]);

  const handleSave = async () => {
    if (skipLine.min >= skipLine.max) {
      toast({ title: 'Invalid range', description: 'Minimum must be less than maximum for skip-the-line', variant: 'destructive' });
      return;
    }
    if (submission.isActive && submission.min >= submission.max) {
      toast({ title: 'Invalid range', description: 'Minimum must be less than maximum for submissions', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      // Helper: update existing row or insert new streamer-specific row
      const saveConfig = async (
        configType: string,
        values: { is_active: boolean; min_amount_cents: number; max_amount_cents: number; step_cents: number }
      ) => {
        const existing = configs[configType];
        if (existing) {
          const { error } = await supabase
            .from('pricing_config')
            .update(values)
            .eq('id', existing.id);
          if (error) throw new Error(`${configType}: ${error.message}`);
        } else {
          const { error } = await supabase
            .from('pricing_config')
            .insert({ config_type: configType, streamer_id: streamerId, ...values });
          if (error) throw new Error(`${configType}: ${error.message}`);
        }
      };

      await saveConfig('submissions_open', { is_active: submissionsOpen, min_amount_cents: 0, max_amount_cents: 0, step_cents: 0 });
      await saveConfig('skip_line', { is_active: skipLine.isActive, min_amount_cents: Math.round(skipLine.min * 100), max_amount_cents: Math.round(skipLine.max * 100), step_cents: Math.round(skipLine.step * 100) });
      await saveConfig('submission', { is_active: submission.isActive, min_amount_cents: Math.round(submission.min * 100), max_amount_cents: Math.round(submission.max * 100), step_cents: Math.round(submission.step * 100) });
      await saveConfig('bid_increment', { is_active: bidIncrementActive, min_amount_cents: bidIncrementPercent, max_amount_cents: 100, step_cents: 5 });

      toast({
        title: 'Pricing updated! 💰',
        description: !submissionsOpen
          ? 'Submissions are currently CLOSED'
          : submission.isActive
            ? `Submissions: €${submission.min.toFixed(2)}, Bids: €${skipLine.min.toFixed(2)}-€${skipLine.max.toFixed(2)}`
            : `Submissions: Free, Bids: €${skipLine.min.toFixed(2)}-€${skipLine.max.toFixed(2)}`,
      });

      await fetchConfigs();
      setHasChanges(false);
    } catch (error) {
      console.error('Pricing save error:', error);
      toast({ title: 'Failed to save', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Payment Settings</h3>
            <p className="text-xs text-muted-foreground">
              Configure submission & bid pricing in real-time
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
              {submissionsOpen ? 'Submissions Open' : 'Submissions Closed'}
            </p>
            <p className="text-xs text-muted-foreground">
              {submissionsOpen
                ? 'Users can submit tracks to your queue'
                : 'Users cannot submit tracks right now'}
            </p>
          </div>
        </div>
        <Switch
          checked={submissionsOpen}
          onCheckedChange={setSubmissionsOpen}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="skip_line" className="gap-2">
            <Zap className="w-4 h-4" />
            Skip the Line
          </TabsTrigger>
          <TabsTrigger value="submission" className="gap-2">
            <Send className="w-4 h-4" />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="bidding" className="gap-2">
            <Percent className="w-4 h-4" />
            Bid Increment
          </TabsTrigger>
        </TabsList>

        {/* Skip the Line Tab */}
        <TabsContent value="skip_line" className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Skip the Line enabled</span>
            </div>
            <Switch
              checked={skipLine.isActive}
              onCheckedChange={(checked) => setSkipLine(s => ({ ...s, isActive: checked }))}
            />
          </div>

          {skipLine.isActive && (
            <>
              {/* Min Amount */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Minimum Price</Label>
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
                  <Label className="text-sm">Maximum Price</Label>
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
                <Label className="text-sm">Bid Step</Label>
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
                <p className="text-sm font-medium text-amber-400 mb-2">Skip the Line Preview</p>
                <p className="text-xs text-muted-foreground">
                  Users can bid between €{skipLine.min.toFixed(2)} and €{skipLine.max.toFixed(2)} in €{skipLine.step.toFixed(2)} steps
                </p>
              </div>
            </>
          )}
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submission" className="space-y-4 mt-4">
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            submission.isActive ? 'bg-primary/20 border border-primary/30' : 'bg-secondary/30'
          }`}>
            <div>
              <p className="text-sm font-medium">
                {submission.isActive ? 'Paid Submissions' : 'Free Submissions'}
              </p>
              <p className="text-xs text-muted-foreground">
                {submission.isActive
                  ? 'Users pay a fee to submit tracks'
                  : 'Anyone can submit tracks for free'}
              </p>
            </div>
            <Switch
              checked={submission.isActive}
              onCheckedChange={(checked) => setSubmission(s => ({ ...s, isActive: checked }))}
            />
          </div>

          {submission.isActive && (
            <>
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

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium text-primary mb-2">Current Submission Price</p>
                <p className="text-2xl font-bold">€{submission.min.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Per submission</p>
              </div>
            </>
          )}

          {!submission.isActive && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-400 mb-2">Free Submissions Active</p>
              <p className="text-xs text-muted-foreground">
                Users can submit tracks without paying. Enable paid submissions to charge a fee.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Bid Increment Tab */}
        <TabsContent value="bidding" className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div>
              <p className="text-sm font-medium">Enable Bidding System</p>
              <p className="text-xs text-muted-foreground">
                Allow users to bid for higher queue positions
              </p>
            </div>
            <Switch
              checked={bidIncrementActive}
              onCheckedChange={setBidIncrementActive}
            />
          </div>

          {bidIncrementActive && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Bid Increment</Label>
                  <span className="text-sm font-bold text-primary">{bidIncrementPercent}%</span>
                </div>
                <Slider
                  value={[bidIncrementPercent]}
                  onValueChange={(value) => setBidIncrementPercent(value[0])}
                  min={5}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  When someone is outbid, they'll be offered to pay {bidIncrementPercent}% more than the current leader
                </p>
              </div>

              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground mb-2">Example:</p>
                <p className="text-sm">
                  If Spot #1 has €30 total → New suggested bid: <span className="font-bold text-primary">€{(30 * (1 + bidIncrementPercent / 100)).toFixed(2)}</span>
                </p>
              </div>
            </>
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
        disabled={isSaving || skipLine.min >= skipLine.max}
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
            Save All Pricing Settings
          </>
        )}
      </Button>

      {/* Pro Tip */}
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

      <p className="text-xs text-center text-muted-foreground">
        Changes take effect immediately after saving
      </p>
    </div>
  );
}
