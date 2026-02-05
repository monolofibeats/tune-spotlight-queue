import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Streamer, StreamerContextType } from '@/types/streamer';

const StreamerContext = createContext<StreamerContextType>({
  streamer: null,
  isLoading: true,
  error: null,
});

interface StreamerProviderProps {
  children: ReactNode;
  slug?: string;
}

export function StreamerProvider({ children, slug: propSlug }: StreamerProviderProps) {
  const params = useParams<{ slug: string }>();
  const slug = propSlug || params.slug;
  
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    const fetchStreamer = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('streamers')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'approved')
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Streamer not found');
          } else {
            setError(fetchError.message);
          }
          setStreamer(null);
        } else {
          setStreamer(data as Streamer);
        }
      } catch (err) {
        setError('Failed to load streamer');
        setStreamer(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreamer();

    // Subscribe to realtime updates for this streamer
    const channel = supabase
      .channel(`streamer-${slug}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streamers',
          filter: `slug=eq.${slug}`,
        },
        (payload) => {
          setStreamer(payload.new as Streamer);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  return (
    <StreamerContext.Provider value={{ streamer, isLoading, error }}>
      {children}
    </StreamerContext.Provider>
  );
}

export function useStreamer() {
  return useContext(StreamerContext);
}

// Hook to fetch active streamers for the discovery page
export function useActiveStreamers() {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStreamers = async () => {
      const { data, error } = await supabase
        .from('streamers')
        .select('*')
        .eq('status', 'approved')
        .order('is_live', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setStreamers(data as Streamer[]);
      }
      setIsLoading(false);
    };

    fetchStreamers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('streamers-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streamers',
        },
        () => {
          fetchStreamers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { streamers, isLoading };
}
