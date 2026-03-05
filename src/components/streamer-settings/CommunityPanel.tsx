import { useState, useEffect } from 'react';
import { Users, Mail, Loader2, Download, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Subscriber {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface CommunityPanelProps {
  streamerId: string;
}

export function CommunityPanel({ streamerId }: CommunityPanelProps) {
  const { user, isAdmin: isPlatformAdmin } = useAuth();
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user is owner or team admin
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return;

      if (isPlatformAdmin) {
        setIsAuthorized(true);
        return;
      }

      // Check if owner
      const { data: streamerData } = await supabase
        .from('streamers')
        .select('user_id')
        .eq('id', streamerId)
        .maybeSingle();

      if (streamerData?.user_id === user.id) {
        setIsAuthorized(true);
        return;
      }

      // Check if team admin
      const { data: isTeamAdmin } = await supabase.rpc('is_team_admin', {
        _streamer_id: streamerId,
        _user_id: user.id,
      });

      setIsAuthorized(!!isTeamAdmin);
    };
    checkAccess();
  }, [user, streamerId, isPlatformAdmin]);

  useEffect(() => {
    const fetchData = async () => {
      // Count
      const { count, error } = await supabase
        .from('streamer_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('streamer_id', streamerId)
        .eq('is_active', true);

      if (!error) setSubscriberCount(count ?? 0);

      // Full list if authorized
      if (isAuthorized) {
        const { data } = await supabase
          .from('streamer_subscribers')
          .select('id, email, is_active, created_at')
          .eq('streamer_id', streamerId)
          .order('created_at', { ascending: false });

        if (data) setSubscribers(data);
      }

      setIsLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel(`community-subs-${streamerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streamer_subscribers', filter: `streamer_id=eq.${streamerId}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamerId, isAuthorized]);

  const filteredSubscribers = subscribers.filter((s) =>
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    const csvContent = [
      ['Email', 'Status', 'Subscribed At'].join(','),
      ...filteredSubscribers.map((s) =>
        [s.email, s.is_active ? 'Active' : 'Inactive', new Date(s.created_at).toLocaleDateString()].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      {/* Subscriber Count Card */}
      <div className="backdrop-blur-md bg-card/20 border border-border/30 rounded-xl p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Community
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your community engagement and notification subscribers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-card/30 border border-border/20 p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-3xl font-display font-bold">{subscriberCount}</p>
              )}
              <p className="text-sm text-muted-foreground">Notification Subscribers</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                People who get notified when you go live
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriber List - only for authorized users */}
      {isAuthorized && !isLoading && (
        <div className="backdrop-blur-md bg-card/20 border border-border/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Subscriber List
            </h3>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredSubscribers.length === 0} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredSubscribers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>{searchQuery ? 'No subscribers match your search.' : 'No subscribers yet.'}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-card/30">
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscribed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                          sub.is_active
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-muted text-muted-foreground border border-border/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sub.is_active ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                          {sub.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
