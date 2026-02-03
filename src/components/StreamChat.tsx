import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  color: string;
}

interface StreamChatProps {
  roomId: string;
}

const CHAT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

const getRandomColor = () => CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)];

export function StreamChat({ roomId }: StreamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [userColor] = useState(getRandomColor);
  const [isSettingUsername, setIsSettingUsername] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    // Check for saved username
    const savedUsername = localStorage.getItem('stream_chat_username');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsSettingUsername(false);
    }
  }, []);

  useEffect(() => {
    if (isSettingUsername) return;

    const channel = supabase.channel(`chat:${roomId}`, {
      config: { broadcast: { self: true } },
    });

    channel.on('broadcast', { event: 'chat-message' }, ({ payload }) => {
      const msg: ChatMessage = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        username: payload.username,
        message: payload.message,
        timestamp: new Date(payload.timestamp),
        color: payload.color,
      };
      setMessages((prev) => [...prev.slice(-100), msg]);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, isSettingUsername]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSetUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem('stream_chat_username', username.trim());
      setIsSettingUsername(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat-message',
      payload: {
        username,
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
        color: userColor,
      },
    });

    setNewMessage('');
  };

  if (isSettingUsername) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 gap-4">
        <MessageCircle className="w-10 h-10 text-primary" />
        <p className="text-sm text-muted-foreground text-center">
          {t('stream.chat.enterUsername')}
        </p>
        <form onSubmit={handleSetUsername} className="w-full flex gap-2">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('stream.chat.usernamePlaceholder')}
            maxLength={20}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!username.trim()}>
            {t('stream.chat.join')}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3" ref={scrollRef}>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm break-words"
              >
                <span style={{ color: msg.color }} className="font-semibold">
                  {msg.username}:
                </span>{' '}
                <span className="text-foreground/90">{msg.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {t('stream.chat.empty')}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-border/50 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('stream.chat.messagePlaceholder')}
          maxLength={200}
          className="flex-1 h-9 text-sm"
        />
        <Button type="submit" size="icon" className="h-9 w-9" disabled={!newMessage.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
