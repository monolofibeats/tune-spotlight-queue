import { useState, useEffect } from 'react';
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
import { useLanguage } from '@/hooks/useLanguage';

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
  const { t } = useLanguage();
  const [configs, setConfigs] = useState<Record<string, PricingConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('skip_line');

  const [skipLine, setSkipLine] = useState<PricingFormState>({
    min: 0.5, max: 100, step: 0.5, isActive: true
  });
  const [submission, setSubmission] = useState<PricingFormState>({
    min: 1, max: 20, step: 0.5, isActive: false
  });
  const [submissionsOpen, setSubmissionsOpen] = useState(true);
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

    setIsLoading(false);
  };

  const syncFormState = (configMap: Record<string, PricingConfig>) => {
    const sl = configMap['skip_line'];
    if (sl) setSkipLine({ min: sl.min_amount_cents / 100, max: sl.max_amount_cents / 100, step: sl.step_cents / 100, isActive: sl.is_active });
    const sub = configMap['submission'];
    if (sub) setSubmission({ min: sub.min_amount_cents / 100, max: sub.max_amount_cents / 100, step: sub.step_cents / 100, isActive: sub.is_active });
    const so = configMap['submissions_open'];
    if (so) setSubmissionsOpen(so.is_active);
    const bi = configMap['bid_increment'];
    if (bi) { setBidIncrementPercent(bi.min_amount_cents); setBidIncrementActive(bi.is_active); }
  };

  useEffect(() => {
    const sl = configs['skip_line'];
    const sub = configs['submission'];
    const so = configs['submissions_open'];
    const bi = configs['bid_increment'];
    if (!sl || !sub) return;

    const skipChanged = skipLine.min !== sl.min_amount_cents / 100 || skipLine.max !== sl.max_amount_cents / 100 || skipLine.step !== sl.step_cents / 100 || skipLine.isActive !== sl.is_active;
    const subChanged = submission.min !== sub.min_amount_cents / 100 || submission.max !== sub.max_amount_cents / 100 || submission.step !== sub.step_cents / 100 || submission.isActive !== sub.is_active;
    const openChanged = so ? submissionsOpen !== so.is_active : false;
    const bidChanged = bi ? bidIncrementPercent !== bi.min_amount_cents || bidIncrementActive !== bi.is_active : false;

    setHasChanges(skipChanged || subChanged || openChanged || bidChanged);
  }, [configs, skipLine, submission, submissionsOpen, bidIncrementPercent, bidIncrementActive]);

  const handleSave = async () => {
    if (skipLine.min <= 0) {
      toast({ title: t('pricing.invalidRange'), description: t('pricing.invalidRangeDesc'), variant: 'destructive' });
      return;
    }
    if (submission.isActive && submission.min >= submission.max) {
      toast({ title: t('pricing.invalidRange'), description: t('pricing.invalidRangeSubmission'), variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      const rows = [
        { config_type: 'submissions_open', streamer_id: streamerId, is_active: submissionsOpen, min_amount_cents: 0, max_amount_cents: 0, step_cents: 0 },
        { config_type: 'skip_line', streamer_id: streamerId, is_active: skipLine.isActive, min_amount_cents: Math.round(skipLine.min * 100), max_amount_cents: Math.round(skipLine.max * 100), step_cents: Math.round(skipLine.step * 100) },
        { config_type: 'submission', streamer_id: streamerId, is_active: submission.isActive, min_amount_cents: Math.round(submission.min * 100), max_amount_cents: Math.round(submission.max * 100), step_cents: Math.round(submission.step * 100) },
        { config_type: 'bid_increment', streamer_id: streamerId, is_active: bidIncrementActive, min_amount_cents: bidIncrementPercent, max_amount_cents: 100, step_cents: 5 },
      ];

      const { error } = await supabase
        .from('pricing_config')
        .upsert(rows, { onConflict: 'streamer_id,config_type', ignoreDuplicates: false });

      if (error) throw new Error(error.message);

      toast({
        title: t('pricing.updated'),
        description: !submissionsOpen
          ? t('pricing.closedDesc')
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{t('pricing.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('pricing.desc')}</p>
          </div>
        </div>
        {hasChanges && (
          <Badge variant="outline" className="text-primary border-primary/30">
            {t('pricing.unsavedChanges')}
          </Badge>
        )}
      </div>

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
              {submissionsOpen ? t('pricing.submissionsOpen') : t('pricing.submissionsClosed')}
            </p>
            <p className="text-xs text-muted-foreground">
              {submissionsOpen ? t('pricing.submissionsOpenDesc') : t('pricing.submissionsClosedDesc')}
            </p>
          </div>
        </div>
        <Switch checked={submissionsOpen} onCheckedChange={setSubmissionsOpen} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="skip_line" className="gap-2">
            <Zap className="w-4 h-4" />
            {t('pricing.tab.skipLine')}
          </TabsTrigger>
          <TabsTrigger value="submission" className="gap-2">
            <Send className="w-4 h-4" />
            {t('pricing.tab.submissions')}
          </TabsTrigger>
          <TabsTrigger value="bidding" className="gap-2">
            <Percent className="w-4 h-4" />
            {t('pricing.tab.bidding')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skip_line" className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('pricing.skipLine.enabled')}</span>
            </div>
            <Switch
              checked={skipLine.isActive}
              onCheckedChange={(checked) => setSkipLine(s => ({ ...s, isActive: checked }))}
            />
          </div>

          {skipLine.isActive && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('pricing.skipLine.minPrice')}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">€</span>
                    <Input type="number" min={0.5} max={500} step={0.5} value={skipLine.min}
                      onChange={(e) => setSkipLine(s => ({ ...s, min: parseFloat(e.target.value) || 0.5 }))}
                      className="w-24 h-9 text-right" />
                  </div>
                </div>
                <Slider value={[skipLine.min]} onValueChange={([val]) => setSkipLine(s => ({ ...s, min: val }))} min={0.5} max={50} step={0.5} />
              </div>

              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-medium text-amber-400 mb-2">{t('pricing.skipLine.preview')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('pricing.skipLine.minPrice')}: €{skipLine.min.toFixed(2)}
                </p>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="submission" className="space-y-4 mt-4">
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            submission.isActive ? 'bg-primary/20 border border-primary/30' : 'bg-secondary/30'
          }`}>
            <div>
              <p className="text-sm font-medium">
                {submission.isActive ? t('pricing.submission.paid') : t('pricing.submission.free')}
              </p>
              <p className="text-xs text-muted-foreground">
                {submission.isActive ? t('pricing.submission.paidDesc') : t('pricing.submission.freeDesc')}
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
                  <Label className="text-sm">{t('pricing.submission.price')}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">€</span>
                    <Input type="number" min={0.5} max={100} step={0.5} value={submission.min}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1;
                        setSubmission(s => ({ ...s, min: val, max: Math.max(val, s.max) }));
                      }}
                      className="w-24 h-9 text-right" />
                  </div>
                </div>
                <Slider value={[submission.min]} onValueChange={([val]) => setSubmission(s => ({ ...s, min: val, max: Math.max(val, s.max) }))} min={0.5} max={20} step={0.5} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>€0.50</span>
                  <span>€20.00</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium text-primary mb-2">{t('pricing.submission.currentPrice')}</p>
                <p className="text-2xl font-bold">€{submission.min.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('pricing.submission.perSubmission')}</p>
              </div>
            </>
          )}

          {!submission.isActive && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-400 mb-2">{t('pricing.submission.freeActive')}</p>
              <p className="text-xs text-muted-foreground">{t('pricing.submission.freeActiveDesc')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bidding" className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div>
              <p className="text-sm font-medium">{t('pricing.bidding.enable')}</p>
              <p className="text-xs text-muted-foreground">{t('pricing.bidding.enableDesc')}</p>
            </div>
            <Switch checked={bidIncrementActive} onCheckedChange={setBidIncrementActive} />
          </div>

          {bidIncrementActive && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('pricing.bidding.increment')}</Label>
                  <span className="text-sm font-bold text-primary">{bidIncrementPercent}%</span>
                </div>
                <Slider value={[bidIncrementPercent]} onValueChange={(value) => setBidIncrementPercent(value[0])} min={5} max={100} step={5} />
                <p className="text-xs text-muted-foreground">
                  {t('pricing.bidding.outbidDesc').replace('{percent}', String(bidIncrementPercent))}
                </p>
              </div>

              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground mb-2">{t('pricing.bidding.example')}</p>
                <p className="text-sm">
                  {t('pricing.bidding.exampleDesc').replace('{amount}', (30 * (1 + bidIncrementPercent / 100)).toFixed(2))}
                </p>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {((skipLine.min >= skipLine.max) || (submission.isActive && submission.min >= submission.max)) && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{t('pricing.minLessThanMax')}</span>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={isSaving || skipLine.min >= skipLine.max}
        className="w-full"
        size="lg"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('pricing.saving')}
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            {t('pricing.saveAll')}
          </>
        )}
      </Button>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t('pricing.proTip')}</p>
              <p className="text-sm text-muted-foreground">{t('pricing.proTipDesc')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        {t('pricing.effectImmediately')}
      </p>
    </div>
  );
}
