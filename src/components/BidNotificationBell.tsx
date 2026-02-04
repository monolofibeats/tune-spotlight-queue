import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, TrendingUp, Loader2, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface BidNotification {
  id: string;
  submission_id: string;
  notification_type: string;
  offer_amount_cents: number | null;
  is_read: boolean;
  created_at: string;
  submissions?: {
    song_title: string;
    artist_name: string;
  };
}

export function BidNotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<BidNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bid_notifications')
        .select(`
          *,
          submissions (
            song_title,
            artist_name
          )
        `)
        .eq('email', user.email)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data as BidNotification[]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime changes
    if (user?.email) {
      const channel = supabase
        .channel('bid_notifications_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bid_notifications',
            filter: `email=eq.${user.email}`,
          },
          (payload) => {
            // Show toast for new notifications
            const newNotif = payload.new as BidNotification;
            if (newNotif.notification_type === 'outbid') {
              toast({
                title: "Someone outbid you! 📈",
                description: "Check your notifications to reclaim your spot.",
              });
            }
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.email]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('bid_notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleViewOffer = (notification: BidNotification) => {
    markAsRead(notification.id);
    setOpen(false);
    navigate('/my-songs');
  };

  const unreadCount = notifications.length;

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-bold"
              >
                {unreadCount}
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notifications
          </h3>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No new notifications
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {notification.notification_type === 'outbid' ? (
                        <TrendingUp className="w-4 h-4 text-primary" />
                      ) : (
                        <Zap className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {notification.notification_type === 'outbid' 
                          ? 'Someone outbid you!'
                          : 'Your song is being reviewed!'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.submissions?.song_title} by {notification.submissions?.artist_name}
                      </p>
                      {notification.notification_type === 'outbid' && notification.offer_amount_cents && (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            New offer: €{(notification.offer_amount_cents / 100).toFixed(2)}
                          </Badge>
                          <Button
                            size="sm"
                            variant="hero"
                            className="h-6 text-xs px-2"
                            onClick={() => handleViewOffer(notification)}
                          >
                            Reclaim Spot
                          </Button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
