import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EarningsWidgetProps {
  streamerId: string;
  config?: {
    showBalance?: boolean;
    showRecentEarnings?: boolean;
    showPayoutStatus?: boolean;
  };
}

export function EarningsWidget({ streamerId, config }: EarningsWidgetProps) {
  const cfg = { showBalance: true, showRecentEarnings: true, showPayoutStatus: true, ...config };
  const [earnings, setEarnings] = useState({ total: 0, thisMonth: 0, pending: 0 });

  useEffect(() => {
    const fetchEarnings = async () => {
      const { data } = await supabase
        .from('streamer_earnings')
        .select('streamer_share_cents, created_at')
        .eq('streamer_id', streamerId);

      if (data) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const total = data.reduce((sum, e) => sum + e.streamer_share_cents, 0);
        const thisMonth = data
          .filter(e => e.created_at >= monthStart)
          .reduce((sum, e) => sum + e.streamer_share_cents, 0);

        setEarnings({ total, thisMonth, pending: 0 });
      }
    };

    // Fetch pending payouts
    const fetchPending = async () => {
      const { data } = await supabase
        .from('payout_requests')
        .select('amount_cents')
        .eq('streamer_id', streamerId)
        .eq('status', 'pending');

      if (data) {
        setEarnings(prev => ({
          ...prev,
          pending: data.reduce((sum, p) => sum + p.amount_cents, 0),
        }));
      }
    };

    fetchEarnings();
    fetchPending();
  }, [streamerId]);

  const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  return (
    <div className="widget-earnings space-y-3">
      {cfg.showBalance && (
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-bold font-display scalable-text">{fmt(earnings.total)}</p>
            <p className="text-[10px] text-muted-foreground scalable-text">Total Earnings</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {cfg.showRecentEarnings && (
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5 scalable-text">
              <TrendingUp className="w-3 h-3" /> This Month
            </div>
            <p className="text-sm font-semibold scalable-text">{fmt(earnings.thisMonth)}</p>
          </div>
        )}
        {cfg.showPayoutStatus && (
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5 scalable-text">
              <ArrowUpRight className="w-3 h-3" /> Pending
            </div>
            <p className="text-sm font-semibold scalable-text">{fmt(earnings.pending)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
