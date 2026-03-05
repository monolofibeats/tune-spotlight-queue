import { useState, useEffect } from 'react';
import { Users, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CommunityPanelProps {
  streamerId: string;
}

export function CommunityPanel({ streamerId }: CommunityPanelProps) {
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { count, error } = await supabase
        .from('streamer_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('streamer_id', streamerId)
        .eq('is_active', true);

      if (!error) setSubscriberCount(count ?? 0);
      setIsLoading(false);
    };
    fetch();

    const channel = supabase
      .channel(`community-subs-${streamerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streamer_subscribers', filter: `streamer_id=eq.${streamerId}` }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamerId]);

  return (
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
  );
}
