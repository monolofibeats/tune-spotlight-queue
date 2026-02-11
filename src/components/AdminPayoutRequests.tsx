import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, X, Wallet, Euro, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PayoutRequest {
  id: string;
  streamer_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payout_method: string;
  payout_details: Record<string, string>;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  streamer?: {
    display_name: string;
    slug: string;
    email: string;
  };
}

const formatCurrency = (cents: number, currency = 'eur') =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

export function AdminPayoutRequests() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch streamer info for each request
      const streamerIds = [...new Set((data || []).map(r => r.streamer_id))];
      const { data: streamers } = await supabase
        .from('streamers')
        .select('id, display_name, slug, email')
        .in('id', streamerIds);

      const streamerMap = (streamers || []).reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {} as Record<string, any>);

      setRequests((data || []).map(r => ({
        ...r,
        payout_details: (r.payout_details as Record<string, string>) || {},
        streamer: streamerMap[r.streamer_id],
      })));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('payout_requests')
        .update({
          status,
          admin_notes: adminNotes[id] || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: `Payout ${status}` });
      fetchRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="glass-strong rounded-xl p-12 text-center">
        <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No payout requests yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => {
        const sc = statusConfig[req.status] || statusConfig.pending;
        const StatusIcon = sc.icon;

        return (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{req.streamer?.display_name || 'Unknown'}</h4>
                  <Badge className={sc.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {sc.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{req.streamer?.email}</p>
                <p className="text-xs text-muted-foreground">
                  Requested {new Date(req.created_at).toLocaleDateString('de-DE', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(req.amount_cents, req.currency)}
                </p>
              </div>
            </div>

            {/* Payout details */}
            <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {req.payout_method === 'paypal' ? 'PayPal' : 'Bank Transfer (SEPA)'}
              </p>
              {req.payout_method === 'paypal' ? (
                <p className="text-sm">{req.payout_details.paypal_email}</p>
              ) : (
                <>
                  <p className="text-sm">Holder: {req.payout_details.account_holder}</p>
                  <p className="text-sm">IBAN: {req.payout_details.iban}</p>
                  {req.payout_details.bic && <p className="text-sm">BIC: {req.payout_details.bic}</p>}
                </>
              )}
              <p className="text-xs text-muted-foreground">Currency: {req.currency.toUpperCase()}</p>
            </div>

            {/* Admin actions for pending requests */}
            {req.status === 'pending' && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Admin notes (optional)"
                  value={adminNotes[req.id] || ''}
                  onChange={(e) => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                  className="text-sm"
                  rows={2}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleUpdateStatus(req.id, 'rejected')}
                    disabled={processingId === req.id}
                  >
                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                    onClick={() => handleUpdateStatus(req.id, 'approved')}
                    disabled={processingId === req.id}
                  >
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(req.id, 'completed')}
                    disabled={processingId === req.id}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Mark Paid
                  </Button>
                </div>
              </div>
            )}

            {/* For approved - show mark as completed */}
            {req.status === 'approved' && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(req.id, 'completed')}
                  disabled={processingId === req.id}
                >
                  {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                  Mark as Paid
                </Button>
              </div>
            )}

            {req.admin_notes && req.status !== 'pending' && (
              <p className="text-xs text-muted-foreground italic">Admin: {req.admin_notes}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
