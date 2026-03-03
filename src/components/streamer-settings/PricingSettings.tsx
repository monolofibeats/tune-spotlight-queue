import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from 'react';
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
  Crown,
  Medal,
  Award,
  Ticket,
  Tag,
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
import { ReferralCodesPanel } from './ReferralCodesPanel';

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

export interface PricingSettingsHandle {
  save: () => Promise<void>;
  discard: () => void;
  hasChanges: boolean;
}

interface PricingSettingsProps {
  streamerId: string;
  onChangeStatus?: (hasChanges: boolean) => void;
}

export const PricingSettings = forwardRef<PricingSettingsHandle, PricingSettingsProps>(function PricingSettings({ streamerId, onChangeStatus }, ref) {
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

  // Pre-stream spot prices (in euros)
  const DEFAULT_SPOT_PRICES = { 1: 100, 2: 75, 3: 50 };
  const [spotPrices, setSpotPrices] = useState<Record<number, number>>(DEFAULT_SPOT_PRICES);
  const [savedSpotPrices, setSavedSpotPrices] = useState<Record<number, number>>(DEFAULT_SPOT_PRICES);
  const [spotIds, setSpotIds] = useState<Record<number, string>>({});

  const handleDiscard = () => {
    syncFormState(configs);
    setSpotPrices({ ...savedSpotPrices });
    setHasChanges(false);
    onChangeStatus?.(false);
  };

  useImperativeHandle(ref, () => ({
    save: handleSave,
    discard: handleDiscard,
    hasChanges,
  }), [hasChanges, configs, skipLine, submission, submissionsOpen, bidIncrementPercent, bidIncrementActive, spotPrices, streamerId]);

  // Auto-save with debounce
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (!hasChanges) return;

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave();
    }, 1200);

    return () => clearTimeout(autoSaveTimer.current);
  }, [skipLine, submission, submissionsOpen, bidIncrementPercent, bidIncrementActive, spotPrices, hasChanges]);

  // Mark initial load complete after configs are fetched
  useEffect(() => {
    if (!isLoading && !initialLoadDone.current) {
      initialLoadDone.current = true;
    }
  }, [isLoading]);

  useEffect(() => {
    fetchConfigs();
    fetchSpotPrices();
  }, [streamerId]);

  const fetchSpotPrices = async () => {
    const { data } = await (supabase
      .from('pre_stream_spots' as any)
      .select('*')
      .eq('streamer_id', streamerId)
      .is('session_id', null)
      .order('spot_number', { ascending: true })) as any;

    if (data && data.length > 0) {
      const prices: Record<number, number> = {};
      const ids: Record<number, string> = {};
      data.forEach((s: any) => {
        prices[s.spot_number] = s.price_cents / 100;
        ids[s.spot_number] = s.id;
      });
      setSpotPrices(prices);
      setSavedSpotPrices(prices);
      setSpotIds(ids);
    }
  };

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

  // Default values used when no config rows exist yet
  const defaultSkipLine: PricingFormState = { min: 0.5, max: 100, step: 0.5, isActive: true };
  const defaultSubmission: PricingFormState = { min: 1, max: 20, step: 0.5, isActive: false };
  const defaultSubmissionsOpen = true;
  const defaultBidIncrementPercent = 10;
  const defaultBidIncrementActive = true;

  useEffect(() => {
    const sl = configs['skip_line'];
    const sub = configs['submission'];
    const so = configs['submissions_open'];
    const bi = configs['bid_increment'];

    // Compare against saved config if it exists, otherwise compare against defaults
    const savedSkip = sl
      ? { min: sl.min_amount_cents / 100, max: sl.max_amount_cents / 100, step: sl.step_cents / 100, isActive: sl.is_active }
      : defaultSkipLine;
    const savedSub = sub
      ? { min: sub.min_amount_cents / 100, max: sub.max_amount_cents / 100, step: sub.step_cents / 100, isActive: sub.is_active }
      : defaultSubmission;
    const savedOpen = so ? so.is_active : defaultSubmissionsOpen;
    const savedBidPercent = bi ? bi.min_amount_cents : defaultBidIncrementPercent;
    const savedBidActive = bi ? bi.is_active : defaultBidIncrementActive;

    const skipChanged = skipLine.min !== savedSkip.min || skipLine.max !== savedSkip.max || skipLine.step !== savedSkip.step || skipLine.isActive !== savedSkip.isActive;
    const subChanged = submission.min !== savedSub.min || submission.max !== savedSub.max || submission.step !== savedSub.step || submission.isActive !== savedSub.isActive;
    const openChanged = submissionsOpen !== savedOpen;
    const bidChanged = bidIncrementPercent !== savedBidPercent || bidIncrementActive !== savedBidActive;
    const spotsChanged = [1, 2, 3].some(n => spotPrices[n] !== savedSpotPrices[n]);

    const changed = skipChanged || subChanged || openChanged || bidChanged || spotsChanged;
    setHasChanges(changed);
    onChangeStatus?.(changed);
  }, [configs, skipLine, submission, submissionsOpen, bidIncrementPercent, bidIncrementActive, spotPrices, savedSpotPrices]);

  const handleSave = async () => {
    if (skipLine.min < 2.5) {
      toast({ title: t('pricing.invalidRange'), description: 'Skip the Line minimum must be at least €2.50', variant: 'destructive' });
      return;
    }
    if (skipLine.min > 1000) {
      toast({ title: t('pricing.invalidRange'), description: 'Skip the Line minimum cannot exceed €1,000', variant: 'destructive' });
      return;
    }
    if (submission.min > 0 && submission.min < 2.5) {
      toast({ title: t('pricing.invalidRange'), description: 'Submission price must be at least €2.50 (or free at €0)', variant: 'destructive' });
      return;
    }
    if (submission.min > 1000) {
      toast({ title: t('pricing.invalidRange'), description: 'Submission price cannot exceed €1,000', variant: 'destructive' });
      return;
    }
    // Validate spot prices
    for (const n of [1, 2, 3]) {
      const p = spotPrices[n] ?? 0;
      if (p > 0 && (p < 2.5 || p > 1000)) {
        toast({ title: t('pricing.invalidRange'), description: `Spot #${n} must cost at least €2.50 (max €1,000)`, variant: 'destructive' });
        return;
      }
    }
    setIsSaving(true);

    try {
      const isPaid = submission.min > 0;
      const rows = [
        { config_type: 'submissions_open', streamer_id: streamerId, is_active: submissionsOpen, min_amount_cents: 0, max_amount_cents: 0, step_cents: 0 },
        { config_type: 'skip_line', streamer_id: streamerId, is_active: skipLine.isActive, min_amount_cents: Math.round(skipLine.min * 100), max_amount_cents: Math.round(skipLine.max * 100), step_cents: Math.round(skipLine.step * 100) },
        { config_type: 'submission', streamer_id: streamerId, is_active: isPaid, min_amount_cents: Math.round(submission.min * 100), max_amount_cents: Math.round(submission.max * 100), step_cents: Math.round(submission.step * 100) },
        { config_type: 'bid_increment', streamer_id: streamerId, is_active: bidIncrementActive, min_amount_cents: bidIncrementPercent, max_amount_cents: 100, step_cents: 5 },
      ];

      const { error } = await supabase
        .from('pricing_config')
        .upsert(rows, { onConflict: 'streamer_id,config_type', ignoreDuplicates: false });

      if (error) throw new Error(error.message);

      // Save spot prices
      const spotsChanged = [1, 2, 3].some(n => spotPrices[n] !== savedSpotPrices[n]);
      if (spotsChanged) {
        for (const spotNum of [1, 2, 3]) {
          const priceCents = Math.round(spotPrices[spotNum] * 100);
          if (spotIds[spotNum]) {
            // Update existing spot
            await (supabase
              .from('pre_stream_spots' as any)
              .update({ price_cents: priceCents })
              .eq('id', spotIds[spotNum])) as any;
          } else {
            // Create new spot
            await (supabase
              .from('pre_stream_spots' as any)
              .insert({
                spot_number: spotNum,
                price_cents: priceCents,
                is_available: true,
                streamer_id: streamerId,
                session_id: null,
              })) as any;
          }
        }
        await fetchSpotPrices();
      }

      toast({
        title: t('pricing.updated'),
        description: !submissionsOpen
          ? t('pricing.closedDesc')
          : isPaid
            ? `Submissions: €${submission.min.toFixed(2)}, Bids: €${skipLine.min.toFixed(2)}`
            : `Submissions: Free, Bids: €${skipLine.min.toFixed(2)}`,
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
            Saving…
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="skip_line" className="gap-1 text-[10px] sm:text-xs px-1.5">
            <Ticket className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t('pricing.tab.skipLine')}</span>
            <span className="sm:hidden">Skip</span>
          </TabsTrigger>
          <TabsTrigger value="submission" className="gap-1 text-[10px] sm:text-xs px-1.5">
            <Send className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t('pricing.tab.submissions')}</span>
            <span className="sm:hidden">Submit</span>
          </TabsTrigger>
          <TabsTrigger value="spots" className="gap-1 text-[10px] sm:text-xs px-1.5">
            <Crown className="w-3.5 h-3.5 shrink-0" />
            Spots
          </TabsTrigger>
          <TabsTrigger value="bidding" className="gap-1 text-[10px] sm:text-xs px-1.5">
            <Percent className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t('pricing.tab.bidding')}</span>
            <span className="sm:hidden">Bids</span>
          </TabsTrigger>
          <TabsTrigger value="codes" className="gap-1 text-[10px] sm:text-xs px-1.5">
            <Tag className="w-3.5 h-3.5 shrink-0" />
            Codes
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
                    <Input type="number" min={2.5} max={1000} step={0.5} value={skipLine.min}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') { setSkipLine(s => ({ ...s, min: 0 })); return; }
                        const val = parseFloat(raw);
                        if (!isNaN(val)) setSkipLine(s => ({ ...s, min: val }));
                      }}
                      className={`w-24 h-9 text-right ${skipLine.min < 2.5 || skipLine.min > 1000 ? 'border-destructive' : ''}`} />
                  </div>
                </div>
                {(skipLine.min < 2.5 || skipLine.min > 1000) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {skipLine.min < 2.5 ? 'Minimum €2.50 required' : 'Maximum €1,000 allowed'}
                  </p>
                )}
                <Slider value={[Math.min(100, Math.max(2.5, skipLine.min))]} onValueChange={([val]) => setSkipLine(s => ({ ...s, min: val }))} min={2.5} max={100} step={0.5} />
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('pricing.submission.price')}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  step={0.5}
                  value={submission.min}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setSubmission(s => ({ ...s, min: 0, isActive: false })); return; }
                    const val = parseFloat(raw);
                    if (!isNaN(val)) setSubmission(s => ({ ...s, min: Math.max(0, val), isActive: val > 0 }));
                  }}
                  className={`w-24 h-9 text-right ${submission.min > 0 && (submission.min < 2.5 || submission.min > 1000) ? 'border-destructive' : ''}`}
                />
              </div>
            </div>
            {submission.min > 0 && (submission.min < 2.5 || submission.min > 1000) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {submission.min < 2.5 ? 'Minimum €2.50 required (or set to €0 for free)' : 'Maximum €1,000 allowed'}
              </p>
            )}
            <Slider
              value={[Math.min(100, Math.max(0, submission.min))]}
              onValueChange={([val]) => {
                const snapped = val > 0 && val < 2.5 ? 2.5 : val;
                setSubmission(s => ({ ...s, min: snapped, isActive: snapped > 0 }));
              }}
              min={0}
              max={100}
              step={0.5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Free (€0.00)</span>
              <span>€100.00 (type up to €1,000)</span>
            </div>
          </div>

          <div className={`p-4 rounded-lg border transition-colors ${
            submission.min > 0
              ? 'bg-primary/10 border-primary/20'
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            {submission.min > 0 ? (
              <>
                <p className="text-sm font-medium text-primary mb-1">{t('pricing.submission.currentPrice')}</p>
                <p className="text-2xl font-bold">€{submission.min.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('pricing.submission.perSubmission')}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-emerald-400 mb-1">{t('pricing.submission.freeActive')}</p>
                <p className="text-xs text-muted-foreground">{t('pricing.submission.freeActiveDesc')}</p>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="spots" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Set the price for each priority spot in the waiting list. Submitters can pay to skip directly to one of these positions.
          </p>

          {[
            { num: 1, label: 'Spot #1', Icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
            { num: 2, label: 'Spot #2', Icon: Medal, color: 'text-slate-300', bg: 'bg-slate-400/10 border-slate-400/20' },
            { num: 3, label: 'Spot #3', Icon: Award, color: 'text-amber-600', bg: 'bg-amber-600/10 border-amber-600/20' },
          ].map(({ num, label, Icon, color, bg }) => (
            <div key={num} className={`flex items-center justify-between p-4 rounded-lg border ${bg}`}>
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  type="number"
                  min={2.5}
                  max={1000}
                  step={0.5}
                  value={spotPrices[num] ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setSpotPrices(p => ({ ...p, [num]: 0 })); return; }
                    const val = parseFloat(raw);
                    if (!isNaN(val)) setSpotPrices(p => ({ ...p, [num]: val }));
                  }}
                  className={`w-24 h-9 text-right ${(spotPrices[num] ?? 0) > 0 && (spotPrices[num] < 2.5 || spotPrices[num] > 1000) ? 'border-destructive' : ''}`}
                />
              </div>
            </div>
          ))}

          {[1, 2, 3].some(n => spotPrices[n] > 0 && (spotPrices[n] < 2.5 || spotPrices[n] > 1000)) && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Each spot must cost at least €2.50 (max €1,000)
            </p>
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

        <TabsContent value="codes" className="space-y-4 mt-4">
          <ReferralCodesPanel streamerId={streamerId} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-center text-muted-foreground">
        {t('pricing.effectImmediately')}
      </p>
    </div>
  );
});
