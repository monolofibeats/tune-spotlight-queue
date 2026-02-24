import { useState, useEffect } from 'react';
import { Copy, Check, Gift, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ReferralCode {
  id: string;
  code: string;
  discount_percent: number;
  is_used: boolean;
  used_by_email: string | null;
  used_at: string | null;
  created_at: string;
}

interface ReferralCodesPanelProps {
  streamerId: string;
}

const MONTHLY_LIMIT = 5;

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'UP-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function ReferralCodesPanel({ streamerId }: ReferralCodesPanelProps) {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  useEffect(() => {
    fetchCodes();
  }, [streamerId]);

  const fetchCodes = async () => {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('streamer_id', streamerId)
      .eq('source', 'streamer')
      .gte('created_at', monthStart)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCodes(data as ReferralCode[]);
    }
    setIsLoading(false);
  };

  const generateCodes = async () => {
    if (codes.length >= MONTHLY_LIMIT) {
      toast({ title: 'Monthly limit reached', description: `You can create ${MONTHLY_LIMIT} codes per month.`, variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const { error } = await supabase.rpc('generate_streamer_referral_codes', {
        _streamer_id: streamerId,
      });

      if (error) throw error;

      toast({ title: 'Discount codes generated!' });
      await fetchCodes();
    } catch (e: any) {
      toast({ title: 'Failed to generate codes', description: e?.message, variant: 'destructive' });
    }
    setIsGenerating(false);
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast({ title: 'Code copied!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const usedCount = codes.filter(c => c.is_used).length;
  const availableCount = codes.filter(c => !c.is_used).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card/50 border border-border/50 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Gift className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Discount Codes</h4>
            <p className="text-xs text-muted-foreground">
              {codes.length}/{MONTHLY_LIMIT} codes this month · {availableCount} available · {usedCount} used
            </p>
          </div>
        </div>
        {codes.length < MONTHLY_LIMIT && (
          <Button size="sm" variant="outline" onClick={generateCodes} disabled={isGenerating} className="gap-1.5">
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Generate
          </Button>
        )}
      </div>

      {codes.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">No discount codes generated yet this month.</p>
          <Button size="sm" onClick={generateCodes} disabled={isGenerating} className="gap-1.5">
            <Gift className="w-3.5 h-3.5" />
            Generate {MONTHLY_LIMIT} Codes
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => {
            const isRevealed = revealedIds.has(c.id);
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  c.is_used
                    ? 'bg-muted/30 border-border/30 opacity-60'
                    : 'bg-secondary/30 border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <code className={`font-mono text-sm font-bold tracking-wider select-none ${c.is_used ? 'line-through text-muted-foreground' : 'text-primary'} ${!c.is_used && !isRevealed ? 'blur-sm' : ''}`}>
                    {c.code}
                  </code>
                  <Badge variant={c.is_used ? 'secondary' : 'default'} className="text-[10px]">
                    {c.is_used ? 'Used' : '10% OFF'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {c.is_used && c.used_by_email && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {c.used_by_email}
                    </span>
                  )}
                  {!c.is_used && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setRevealedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          });
                        }}
                        title={isRevealed ? 'Hide code' : 'Reveal code'}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => copyCode(c.id, c.code)}
                      >
                        {copiedId === c.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Each code gives 10% off on a paid submission. Codes expire at the end of the month. Not stackable.
      </p>
    </div>
  );
}
