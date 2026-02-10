import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Loader2, Music, Eye, CheckCircle, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Streamer } from '@/types/streamer';

interface SubmissionStats {
  total: number;
  pending: number;
  reviewed: number;
  skipped: number;
  totalEarned: number;
}

const StreamerStatistics = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<SubmissionStats>({ total: 0, pending: 0, reviewed: 0, skipped: 0, totalEarned: 0 });
  const [monthlyData, setMonthlyData] = useState<{ month: string; submissions: number; earnings: number }[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }

    const init = async () => {
      const { data: s } = await supabase.from('streamers').select('*').eq('user_id', user.id).single();
      if (!s) { navigate('/'); return; }
      setStreamer(s as Streamer);

      const { data: subs } = await supabase
        .from('submissions')
        .select('status, amount_paid, created_at')
        .eq('streamer_id', s.id);

      if (subs) {
        setStats({
          total: subs.length,
          pending: subs.filter(sub => sub.status === 'pending').length,
          reviewed: subs.filter(sub => sub.status === 'reviewed').length,
          skipped: subs.filter(sub => sub.status === 'skipped').length,
          totalEarned: subs.reduce((sum, sub) => sum + (sub.amount_paid || 0), 0),
        });

        const monthly: Record<string, { submissions: number; earnings: number }> = {};
        subs.forEach(sub => {
          const date = new Date(sub.created_at);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthly[key]) monthly[key] = { submissions: 0, earnings: 0 };
          monthly[key].submissions++;
          monthly[key].earnings += (sub.amount_paid || 0);
        });

        const sorted = Object.entries(monthly)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([month, data]) => ({
            month: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
            ...data,
            earnings: data.earnings / 100,
          }));
        setMonthlyData(sorted);
      }
      setIsLoading(false);
    };
    init();
  }, [user, authLoading, navigate]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Submissions', value: stats.total, icon: Music, color: 'text-primary' },
    { label: 'Pending', value: stats.pending, icon: Eye, color: 'text-yellow-500' },
    { label: 'Reviewed', value: stats.reviewed, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Skipped', value: stats.skipped, icon: TrendingUp, color: 'text-muted-foreground' },
    { label: 'Total Earned', value: `€${(stats.totalEarned / 100).toFixed(2)}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Avg per Submission', value: stats.total > 0 ? `€${(stats.totalEarned / stats.total / 100).toFixed(2)}` : '€0', icon: Users, color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen bg-background bg-mesh noise">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-display font-bold">Statistics</h1>
                <p className="text-muted-foreground">Performance overview for {streamer?.display_name}</p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {statCards.map((card) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-display font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-lg mb-4">Monthly Submissions</h2>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="submissions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">No data yet</p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4">Monthly Earnings (€)</h2>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">No data yet</p>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StreamerStatistics;
