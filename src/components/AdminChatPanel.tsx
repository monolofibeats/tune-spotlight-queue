import { useState, useEffect } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Send, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Streamer {
  id: string;
  display_name: string;
  slug: string;
}

interface ChatMessage {
  id: string;
  streamer_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function AdminChatPanel() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [selectedStreamer, setSelectedStreamer] = useState<Streamer | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadByStreamer, setUnreadByStreamer] = useState<Record<string, number>>({});

  // Fetch approved streamers
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('streamers')
        .select('id, display_name, slug')
        .eq('status', 'approved')
        .order('display_name');
      if (data) setStreamers(data);
    };
    fetch();
  }, []);

  // Fetch unread counts
  useEffect(() => {
    const fetchUnread = async () => {
      const { data } = await supabase
        .from('admin_streamer_chat')
        .select('streamer_id')
        .eq('sender_role', 'streamer')
        .eq('is_read', false);

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((m: any) => {
          counts[m.streamer_id] = (counts[m.streamer_id] || 0) + 1;
        });
        setUnreadByStreamer(counts);
      }
    };
    fetchUnread();

    const channel = supabase
      .channel('admin_chat_unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_streamer_chat' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalUnread = Object.values(unreadByStreamer).reduce((a, b) => a + b, 0);

  // Fetch messages for selected streamer
  const fetchMessages = async (streamerId: string) => {
    const { data } = await supabase
      .from('admin_streamer_chat')
      .select('*')
      .eq('streamer_id', streamerId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
  };

  useEffect(() => {
    if (!selectedStreamer) return;
    fetchMessages(selectedStreamer.id);

    // Mark as read
    supabase
      .from('admin_streamer_chat')
      .update({ is_read: true })
      .eq('streamer_id', selectedStreamer.id)
      .eq('sender_role', 'streamer')
      .eq('is_read', false)
      .then();

    const channel = supabase
      .channel(`admin_chat_${selectedStreamer.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_streamer_chat',
        filter: `streamer_id=eq.${selectedStreamer.id}`,
      }, () => fetchMessages(selectedStreamer.id))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedStreamer]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedStreamer) return;

    setIsSending(true);
    await supabase
      .from('admin_streamer_chat')
      .insert({
        streamer_id: selectedStreamer.id,
        sender_id: user.id,
        sender_role: 'admin',
        message: newMessage.trim(),
      });
    setNewMessage('');
    setIsSending(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50" style={{ maxWidth: '360px', width: '100%' }}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="default"
        size="sm"
        className="ml-auto flex gap-2 shadow-lg"
      >
        <MessageSquare className="w-4 h-4" />
        Streamer Chat
        {totalUnread > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            {totalUnread}
          </Badge>
        )}
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            {!selectedStreamer ? (
              /* Streamer list */
              <div className="h-72 overflow-y-auto p-2 space-y-1">
                {streamers.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">No streamers yet</p>
                )}
                {streamers.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStreamer(s)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.display_name}</p>
                      <p className="text-xs text-muted-foreground">/{s.slug}</p>
                    </div>
                    {unreadByStreamer[s.id] > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5">
                        {unreadByStreamer[s.id]}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              /* Chat view */
              <>
                <div className="p-2 border-b border-border flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setSelectedStreamer(null); setMessages([]); }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium">{selectedStreamer.display_name}</span>
                </div>
                <div className="h-56 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">No messages yet</p>
                  )}
                  {messages.map(msg => {
                    const isOwn = msg.sender_role === 'admin';
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                        }`}>
                          <p className="break-words">{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={handleSend} className="p-2 border-t border-border flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Message streamer..."
                    maxLength={500}
                    className="h-9 text-sm"
                  />
                  <Button type="submit" size="sm" disabled={isSending || !newMessage.trim()} className="h-9 px-3">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
