import { useState, useEffect, useRef } from 'react';
import { Search, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface StreamerResult {
  id: string;
  slug: string;
  display_name: string;
  avatar_url: string | null;
  is_live: boolean;
}

export function StreamerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StreamerResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('streamers')
        .select('id, slug, display_name, avatar_url, is_live')
        .eq('status', 'approved')
        .ilike('display_name', `%${query}%`)
        .order('is_live', { ascending: false })
        .limit(8);

      if (data) {
        setResults(data as StreamerResult[]);
        setIsOpen(true);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a streamer..."
          className="pl-10 h-10"
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-50 top-full mt-2 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden"
          >
            {results.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  navigate(`/${s.slug}`);
                  setIsOpen(false);
                  setQuery('');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {s.display_name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.display_name}</p>
                  <p className="text-xs text-muted-foreground">/{s.slug}</p>
                </div>
                {s.is_live && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <Radio className="w-3 h-3" />
                    LIVE
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
        {isOpen && query.length >= 1 && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-50 top-full mt-2 w-full rounded-xl border border-border bg-card shadow-lg p-4 text-center text-sm text-muted-foreground"
          >
            No streamers found
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
