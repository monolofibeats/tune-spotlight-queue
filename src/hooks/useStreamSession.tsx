import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StreamSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  title: string | null;
  created_by: string | null;
  streamer_id: string | null;
}

interface StreamSessionContextType {
  currentSession: StreamSession | null;
  isLive: boolean;
  isLoading: boolean;
  startSession: (title?: string, streamerId?: string) => Promise<void>;
  endSession: () => Promise<void>;
}

const StreamSessionContext = createContext<StreamSessionContextType>({
  currentSession: null,
  isLive: false,
  isLoading: true,
  startSession: async () => {},
  endSession: async () => {},
});

interface StreamSessionProviderProps {
  children: ReactNode;
  streamerId?: string; // scope to a specific streamer
}

export function StreamSessionProvider({ children, streamerId }: StreamSessionProviderProps) {
  const [currentSession, setCurrentSession] = useState<StreamSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveSession = async () => {
    try {
      let query = (supabase
        .from('stream_sessions' as any)
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)) as any;

      // If a streamer ID is provided, scope to their sessions only
      if (streamerId) {
        query = query.eq('streamer_id', streamerId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      setCurrentSession(data as StreamSession | null);
    } catch (error) {
      console.error('Error fetching stream session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSession();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`stream_session_changes_${streamerId || 'global'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_sessions',
        },
        () => {
          fetchActiveSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamerId]);

  const startSession = async (title?: string, overrideStreamerId?: string) => {
    const sid = overrideStreamerId || streamerId;
    if (!sid) {
      console.error('Cannot start session: no streamer_id provided');
      throw new Error('No streamer ID available');
    }
    try {
      // End any existing active sessions for this streamer
      await (supabase
        .from('stream_sessions' as any)
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('is_active', true)
        .eq('streamer_id', sid)) as any;

      // Create new session with streamer_id
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase
        .from('stream_sessions' as any)
        .insert({
          title: title || 'Live Stream',
          is_active: true,
          streamer_id: sid,
          created_by: user?.id,
        })) as any;

      if (error) throw error;
      await fetchActiveSession();
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  };

  const endSession = async () => {
    if (!currentSession) return;

    try {
      const { error } = await (supabase
        .from('stream_sessions' as any)
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .eq('id', currentSession.id)) as any;

      if (error) throw error;
      setCurrentSession(null);
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  };

  const isLive = !!currentSession?.is_active;

  return (
    <StreamSessionContext.Provider value={{ 
      currentSession, 
      isLive, 
      isLoading, 
      startSession, 
      endSession 
    }}>
      {children}
    </StreamSessionContext.Provider>
  );
}

export function useStreamSession() {
  return useContext(StreamSessionContext);
}
