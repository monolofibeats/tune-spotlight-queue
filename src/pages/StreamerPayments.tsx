import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wallet, TrendingUp, ArrowLeft, Loader2, Receipt,
  CreditCard, Plus, Trash2, DollarSign, Euro, PiggyBank
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  amount_cents: number;
  streamer_share_cents: number;
  platform_fee_cents: number;
  currency: string;
  created_at: string;
  description: string;
  customer_email: string | null;
  type: string;
}

interface EarningsData {
  total_earnings_cents: number;
  total_platform_fee_cents: number;
  total_payouts_cents: number;
  current_balance_cents: number;
  transactions: Transaction[];
  chart_data: Array<{ month: string; earnings: number }>;
  currency: string;
}

interface PayoutPref {
  id: string;
  streamer_id: string;
  payout_method: string;
  currency: string;
  bank_iban: string | null;
  bank_bic: string | null;
  bank_account_holder: string | null;
  paypal_email: string | null;
  is_primary: boolean;
}

const formatCurrency = (cents: number, currency = 'eur') => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
};

export default function StreamerPayments() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wallets, setWallets] = useState<PayoutPref[]>([]);
  const [streamerId, setStreamerId] = useState<string | null>(null);

  // Wallet form
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [walletMethod, setWalletMethod] = useState('bank_transfer');
  const [walletCurrency, setWalletCurrency] = useState('EUR');
  const [walletIban, setWalletIban] = useState('');
  const [walletBic, setWalletBic] = useState('');
  const [walletHolder, setWalletHolder] = useState('');
  const [walletPaypal, setWalletPaypal] = useState('');
  const [isSavingWallet, setIsSavingWallet] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      // Get streamer id
      const { data: streamer } = await supabase
        .from('streamers')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!streamer) {
        navigate('/');
        return;
      }
      setStreamerId(streamer.id);

      // Fetch earnings from edge function
      const { data: earningsData, error: earningsError } = await supabase.functions.invoke('streamer-earnings');
      if (earningsError) throw earningsError;
      setEarnings(earningsData);

      // Fetch wallets
      const { data: walletData } = await supabase
        .from('payout_preferences')
        .select('*')
        .eq('streamer_id', streamer.id)
        .order('is_primary', { ascending: false });

      setWallets((walletData as PayoutPref[]) || []);
    } catch (error: any) {
      console.error('Error loading payment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWallet = async () => {
    if (!streamerId) return;
    setIsSavingWallet(true);

    try {
      const payload: any = {
        streamer_id: streamerId,
        payout_method: walletMethod,
        currency: walletCurrency,
        is_primary: wallets.length === 0,
      };

      if (walletMethod === 'bank_transfer') {
        if (!walletIban || !walletHolder) {
          toast({ title: 'Missing fields', description: 'Please fill in IBAN and account holder.', variant: 'destructive' });
          setIsSavingWallet(false);
          return;
        }
        payload.bank_iban = walletIban;
        payload.bank_bic = walletBic || null;
        payload.bank_account_holder = walletHolder;
      } else if (walletMethod === 'paypal') {
        if (!walletPaypal) {
          toast({ title: 'Missing fields', description: 'Please enter your PayPal email.', variant: 'destructive' });
          setIsSavingWallet(false);
          return;
        }
        payload.paypal_email = walletPaypal;
      }

      const { error } = await supabase.from('payout_preferences').insert(payload);
      if (error) throw error;

      toast({ title: 'Wallet added! ✨' });
      setShowWalletForm(false);
      resetWalletForm();
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSavingWallet(false);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    try {
      await supabase.from('payout_preferences').delete().eq('id', id);
      toast({ title: 'Wallet removed' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSetPrimary = async (id: string) => {
    if (!streamerId) return;
    try {
      // Unset all
      await supabase.from('payout_preferences').update({ is_primary: false }).eq('streamer_id', streamerId);
      // Set this one
      await supabase.from('payout_preferences').update({ is_primary: true }).eq('id', id);
      toast({ title: 'Primary wallet updated' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetWalletForm = () => {
    setWalletMethod('bank_transfer');
    setWalletCurrency('EUR');
    setWalletIban('');
    setWalletBic('');
    setWalletHolder('');
    setWalletPaypal('');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxEarning = earnings?.chart_data?.length
    ? Math.max(...earnings.chart_data.map(d => d.earnings), 1)
    : 1;

  return (
    <div className="min-h-screen bg-background bg-mesh noise">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-3 mb-8">
            <PiggyBank className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-display font-bold">Payments</h1>
              <p className="text-muted-foreground">Track your earnings and manage payouts</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="glass p-1 rounded-xl mb-6">
              <TabsTrigger value="overview" className="rounded-lg gap-2">
                <TrendingUp className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="transactions" className="rounded-lg gap-2">
                <Receipt className="w-4 h-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="wallets" className="rounded-lg gap-2">
                <Wallet className="w-4 h-4" />
                Wallets
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-strong rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                  <p className="text-3xl font-display font-bold text-primary">
                    {formatCurrency(earnings?.current_balance_cents || 0)}
                  </p>
                </div>
                <div className="glass-strong rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                  <p className="text-3xl font-display font-bold text-emerald-400">
                    {formatCurrency(earnings?.total_earnings_cents || 0)}
                  </p>
                </div>
                <div className="glass-strong rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Platform Fees (20%)</p>
                  <p className="text-3xl font-display font-bold text-muted-foreground">
                    {formatCurrency(earnings?.total_platform_fee_cents || 0)}
                  </p>
                </div>
              </div>

              {/* Simple bar chart */}
              <div className="glass-strong rounded-xl p-6">
                <h3 className="font-semibold mb-4">Monthly Earnings</h3>
                {earnings?.chart_data?.length ? (
                  <div className="flex items-end gap-2 h-48">
                    {earnings.chart_data.map((d) => (
                      <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">{formatCurrency(d.earnings * 100)}</span>
                        <div
                          className="w-full bg-primary/80 rounded-t-md min-h-[4px] transition-all"
                          style={{ height: `${(d.earnings / maxEarning) * 160}px` }}
                        />
                        <span className="text-xs text-muted-foreground">{d.month}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-12">
                    No earnings data yet. Once you receive payments, your chart will appear here.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* TRANSACTIONS */}
            <TabsContent value="transactions" className="space-y-4">
              {earnings?.transactions?.length ? (
                <div className="space-y-3">
                  {earnings.transactions.map((tx) => (
                    <div key={tx.id} className="glass-strong rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <CreditCard className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{tx.type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString('de-DE', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                            {tx.customer_email && ` · ${tx.customer_email}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-400">
                          +{formatCurrency(tx.streamer_share_cents, tx.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fee: {formatCurrency(tx.platform_fee_cents, tx.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-strong rounded-xl p-12 text-center">
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No transactions yet</p>
                </div>
              )}
            </TabsContent>

            {/* WALLETS */}
            <TabsContent value="wallets" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Add your preferred payout method and currency
                </p>
                <Button size="sm" onClick={() => setShowWalletForm(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Add Wallet
                </Button>
              </div>

              {showWalletForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold">New Payout Method</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payout Method</Label>
                      <Select value={walletMethod} onValueChange={setWalletMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer (SEPA)</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={walletCurrency} onValueChange={setWalletCurrency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="CHF">CHF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {walletMethod === 'bank_transfer' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input value={walletHolder} onChange={(e) => setWalletHolder(e.target.value)} placeholder="Max Mustermann" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>IBAN</Label>
                          <Input value={walletIban} onChange={(e) => setWalletIban(e.target.value)} placeholder="DE89 3704 0044 0532 0130 00" />
                        </div>
                        <div className="space-y-2">
                          <Label>BIC (optional)</Label>
                          <Input value={walletBic} onChange={(e) => setWalletBic(e.target.value)} placeholder="COBADEFFXXX" />
                        </div>
                      </div>
                    </div>
                  )}

                  {walletMethod === 'paypal' && (
                    <div className="space-y-2">
                      <Label>PayPal Email</Label>
                      <Input type="email" value={walletPaypal} onChange={(e) => setWalletPaypal(e.target.value)} placeholder="your@paypal.com" />
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => { setShowWalletForm(false); resetWalletForm(); }}>Cancel</Button>
                    <Button onClick={handleSaveWallet} disabled={isSavingWallet}>
                      {isSavingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Wallet'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {wallets.length > 0 ? (
                <div className="space-y-3">
                  {wallets.map((w) => (
                    <div key={w.id} className="glass-strong rounded-xl p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {w.payout_method === 'paypal' ? <DollarSign className="w-4 h-4 text-primary" /> : <Euro className="w-4 h-4 text-primary" />}
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {w.payout_method.replace(/_/g, ' ')}
                            {w.is_primary && (
                              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Primary</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {w.payout_method === 'paypal' ? w.paypal_email : `${w.bank_iban?.slice(0, 8)}••••  ·  ${w.currency}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!w.is_primary && (
                          <Button variant="ghost" size="sm" onClick={() => handleSetPrimary(w.id)}>Set Primary</Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteWallet(w.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !showWalletForm ? (
                <div className="glass-strong rounded-xl p-12 text-center">
                  <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No wallets configured yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add a payout method to receive your earnings</p>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
