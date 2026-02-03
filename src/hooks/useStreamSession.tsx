import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StreamSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  title: string | null;
  created_by: string | null;
}

interface StreamSessionContextType {
  currentSession: StreamSession | null;
  isLive: boolean;
  isLoading: boolean;
  startSession: (title?: string) => Promise<void>;
  endSession: () => Promise<void>;
}

const StreamSessionContext = createContext<StreamSessionContextType>({
  currentSession: null,
  isLive: false,
  isLoading: true,
  startSession: async () => {},
  endSession: async () => {},
});

export function StreamSessionProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSession] = useState<StreamSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveSession = async () => {
    try {
      const { data, error } = await (supabase
        .from('stream_sessions' as any)
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()) as any;

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
      .channel('stream_session_changes')
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
  }, []);

  const startSession = async (title?: string) => {
    try {
      // First, end any existing active sessions
      await (supabase
        .from('stream_sessions' as any)
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('is_active', true)) as any;

      // Create new session
      const { error } = await (supabase
        .from('stream_sessions' as any)
        .insert({
          title: title || 'Live Stream',
          is_active: true,
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
