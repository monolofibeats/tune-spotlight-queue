import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  id: string;
  streamer_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface AdminStreamerChatProps {
  streamerId: string;
  role: 'admin' | 'streamer';
  /** Optional label shown for the other party */
  streamerName?: string;
}

export function AdminStreamerChat({ streamerId, role, streamerName }: AdminStreamerChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const unreadCount = messages.filter(
    m => !m.is_read && m.sender_role !== role
  ).length;

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('admin_streamer_chat')
      .select('*')
      .eq('streamer_id', streamerId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as ChatMessage[]);
    }
  };

  // Mark messages from the other party as read
  const markAsRead = async () => {
    if (!user) return;
    const unread = messages.filter(m => !m.is_read && m.sender_role !== role);
    if (unread.length === 0) return;

    await supabase
      .from('admin_streamer_chat')
      .update({ is_read: true })
      .eq('streamer_id', streamerId)
      .neq('sender_role', role)
      .eq('is_read', false);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`admin_chat_${streamerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_streamer_chat',
        filter: `streamer_id=eq.${streamerId}`,
      }, fetchMessages)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamerId]);

  // Auto-scroll and mark read when opened
  useEffect(() => {
    if (isOpen) {
      markAsRead();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    const { error } = await supabase
      .from('admin_streamer_chat')
      .insert({
        streamer_id: streamerId,
        sender_id: user.id,
        sender_role: role,
        message: newMessage.trim(),
      });

    if (!error) {
      setNewMessage('');
    }
    setIsSending(false);
  };

  const title = role === 'admin'
    ? `Chat with ${streamerName || 'Streamer'}`
    : 'Admin Messages';

  return (
    <div className="fixed bottom-4 right-4 z-[100]" style={{ maxWidth: '360px', width: '100%' }}>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="default"
        size="sm"
        className="ml-auto flex gap-2 shadow-lg"
      >
        <MessageSquare className="w-4 h-4" />
        {title}
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            {unreadCount}
          </Badge>
        )}
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </Button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Messages */}
            <div className="h-64 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No messages yet. Start the conversation!
                </p>
              )}
              {messages.map((msg) => {
                const isOwn = msg.sender_role === role;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="break-words">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-2 border-t border-border flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                maxLength={500}
                className="h-9 text-sm"
              />
              <Button type="submit" size="sm" disabled={isSending || !newMessage.trim()} className="h-9 px-3">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
