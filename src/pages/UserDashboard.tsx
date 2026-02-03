import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Music, 
  TrendingUp, 
  Clock, 
  Loader2,
  Zap,
  DollarSign
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedButton } from '@/components/AnimatedButton';
import { MusicEmbed } from '@/components/MusicEmbed';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface UserSubmission {
  id: string;
  song_url: string;
  platform: string;
  artist_name: string;
  song_title: string;
  amount_paid: number;
  boost_amount: number;
  is_priority: boolean;
  status: string;
  created_at: string;
}

const UserDashboard = () => {
  const { user } = useAuth();
  const { play } = useSoundEffects();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boostingId, setBoostingId] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSubmissions(data as UserSubmission[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();

    const channel = supabase
      .channel('user_submissions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'submissions', filter: `user_id=eq.${user?.id}` }, 
        fetchSubmissions
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleBoost = async (id: string, currentBoost: number) => {
    setBoostingId(id);
    
    // For now, we'll just increment boost. In a real app, this would trigger a payment
    const newBoost = currentBoost + 5;
    
    const { error } = await supabase
      .from('submissions')
      .update({ boost_amount: newBoost })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to boost submission",
        variant: "destructive",
      });
    } else {
      play('boost');
      toast({
        title: "Boosted! ⚡",
        description: "Your song has been pushed up in the queue",
      });
    }
    
    setBoostingId(null);
  };

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    reviewed: submissions.filter(s => s.status === 'reviewed').length,
    totalSpent: submissions.reduce((acc, s) => acc + (s.amount_paid || 0) + (s.boost_amount || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <LayoutDashboard className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-display font-bold">My Dashboard</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Track your submissions and boost your songs
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
          >
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-display font-bold mt-1">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-display font-bold mt-1">{stats.pending}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">Reviewed</span>
              </div>
              <p className="text-2xl font-display font-bold mt-1">{stats.reviewed}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Invested</span>
              </div>
              <p className="text-2xl font-display font-bold mt-1">€{stats.totalSpent}</p>
            </div>
          </motion.div>

          {/* Submissions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold mb-4">Your Submissions</h2>
            
            {submissions.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-border/50 bg-card/50">
                <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No submissions yet</p>
                <AnimatedButton onClick={() => navigate('/')} sound="click">
                  Submit Your First Song
                </AnimatedButton>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission, index) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl border border-border/50 bg-card/50 p-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{submission.song_title}</h3>
                          {(submission.amount_paid > 0 || submission.boost_amount > 0) && (
                            <Badge variant="secondary" className="text-xs">
                              €{submission.amount_paid + submission.boost_amount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{submission.artist_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={
                            submission.status === 'reviewed' ? 'default' :
                            submission.status === 'pending' ? 'queue' : 'secondary'
                          }>
                            {submission.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {submission.status === 'pending' && (
                        <AnimatedButton
                          variant="outline"
                          size="sm"
                          sound="boost"
                          onClick={() => handleBoost(submission.id, submission.boost_amount)}
                          disabled={boostingId === submission.id}
                          className="shrink-0"
                        >
                          {boostingId === submission.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Zap className="w-4 h-4 mr-2" />
                          )}
                          Boost +€5
                        </AnimatedButton>
                      )}
                    </div>

                    {/* Embed for Spotify/SoundCloud */}
                    {(submission.platform === 'spotify' || submission.platform === 'soundcloud') && (
                      <div className="mt-4">
                        <MusicEmbed 
                          url={submission.song_url} 
                          platform={submission.platform as 'spotify' | 'soundcloud'} 
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
