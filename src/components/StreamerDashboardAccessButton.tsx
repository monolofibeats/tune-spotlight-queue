import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  streamerId: string;
  streamerUserId: string;
}

export function StreamerDashboardAccessButton({ streamerId, streamerUserId }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Owner always has access
    if (user.id === streamerUserId) {
      setHasAccess(true);
      return;
    }

    // Check team membership
    const check = async () => {
      const { data } = await supabase
        .from('streamer_team_members')
        .select('id')
        .eq('streamer_id', streamerId)
        .eq('user_id', user.id)
        .eq('invitation_status', 'accepted')
        .maybeSingle();

      setHasAccess(!!data);
    };

    check();
  }, [user, streamerId, streamerUserId]);

  if (!hasAccess) return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      className="gap-2"
      onClick={() => navigate('/streamer/dashboard')}
    >
      <LayoutDashboard className="w-4 h-4" />
      See Dashboard
    </Button>
  );
}
