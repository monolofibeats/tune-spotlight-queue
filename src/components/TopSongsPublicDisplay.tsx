import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Award, Trophy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

interface TopSongDisplay {
  position: number;
  artist_name: string;
  song_title: string;
  song_url?: string;
}

interface TopSongsPublicDisplayProps {
  streamerId: string;
  showTopSongs?: boolean;
  topSongsMessage?: string;
  hideTitle?: boolean;
}

export function TopSongsPublicDisplay({ streamerId, showTopSongs, topSongsMessage, hideTitle }: TopSongsPublicDisplayProps) {
  const { t } = useLanguage();
  const [songs, setSongs] = useState<TopSongDisplay[]>([]);

  const fetchSongs = async () => {
    const { data } = await supabase
      .from('streamer_top_songs')
      .select('position, submission_id')
      .eq('streamer_id', streamerId)
      .eq('is_active', true)
      .order('position');

    if (!data || data.length === 0) { setSongs([]); return; }

    const subIds = data.map(d => d.submission_id);
    const { data: subs } = await supabase
      .from('submissions')
      .select('id, artist_name, song_title, song_url')
      .in('id', subIds);

    if (subs) {
      const enriched = data.map(d => {
        const sub = subs.find(s => s.id === d.submission_id);
        return {
          position: d.position,
          artist_name: sub?.artist_name || 'Unknown',
          song_title: sub?.song_title || 'Untitled',
          song_url: sub?.song_url,
        };
      });
      setSongs(enriched);
    }
  };

  useEffect(() => {
    if (!showTopSongs) return;

    fetchSongs();

    // Real-time subscription for updates
    const channel = supabase
      .channel(`top-songs-${streamerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streamer_top_songs',
          filter: `streamer_id=eq.${streamerId}`,
        },
        () => { fetchSongs(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamerId, showTopSongs]);

  if (!showTopSongs || songs.length === 0) return null;

  const getIcon = (pos: number) => {
    if (pos === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (pos === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    return <Award className="w-5 h-5 text-amber-600" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-center gap-2">
        <Trophy className="w-4 h-4 text-primary/60" />
        <h3 className="text-sm font-semibold text-center tracking-wide">{t('topSongs.publicTitle')}</h3>
        <Trophy className="w-4 h-4 text-primary/60" />
      </div>

      <div className="flex items-end justify-center gap-1.5 sm:gap-2 py-2">
        {[2, 1, 3].map(pos => {
          const song = songs.find(s => s.position === pos);
          if (!song) return <div key={pos} className={`w-[90px] sm:w-[110px] ${pos === 1 ? 'order-2' : pos === 2 ? 'order-1' : 'order-3'}`} />;

          const podiumHeight = pos === 1 ? 'h-[100px]' : pos === 2 ? 'h-[80px]' : 'h-[65px]';
          const podiumBg = pos === 1
            ? 'bg-gradient-to-t from-yellow-600/30 via-yellow-500/10 to-transparent border-yellow-500/40'
            : pos === 2
              ? 'bg-gradient-to-t from-slate-400/20 via-slate-300/8 to-transparent border-slate-400/40'
              : 'bg-gradient-to-t from-amber-700/20 via-amber-600/8 to-transparent border-amber-700/40';

          return (
            <motion.div
              key={pos}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: pos === 1 ? 0.1 : pos === 2 ? 0 : 0.2, duration: 0.4 }}
              className={`flex flex-col items-center w-[90px] sm:w-[110px] ${pos === 1 ? 'order-2' : pos === 2 ? 'order-1' : 'order-3'}`}
            >
              <div className="w-full mb-1.5 text-center px-0.5">
                {song.song_url ? (
                  <a
                    href={song.song_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link hover:opacity-80 transition-opacity block"
                    title="Open song"
                  >
                    <p className="text-[11px] sm:text-xs font-bold truncate group-hover/link:underline">{song.song_title}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{song.artist_name}</p>
                    <span className="inline-flex items-center gap-0.5 text-[8px] text-primary/60">
                      <ExternalLink className="w-2 h-2" /> Open
                    </span>
                  </a>
                ) : (
                  <>
                    <p className="text-[11px] sm:text-xs font-bold truncate">{song.song_title}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{song.artist_name}</p>
                  </>
                )}
              </div>

              <div className={`w-full ${podiumHeight} rounded-t-lg border border-b-0 ${podiumBg} flex flex-col items-center justify-start pt-2.5`}>
                <div className="flex items-center justify-center w-7 h-7 rounded-full mb-0.5" style={{
                  backgroundColor: pos === 1 ? 'rgba(234,179,8,0.2)' : pos === 2 ? 'rgba(148,163,184,0.2)' : 'rgba(180,83,9,0.2)'
                }}>
                  {getIcon(pos)}
                </div>
                <span className={`text-lg sm:text-xl font-black font-display ${
                  pos === 1 ? 'text-yellow-400' : pos === 2 ? 'text-slate-300' : 'text-amber-600'
                }`}>
                  {pos}
                </span>
              </div>

              <div className={`w-[calc(100%+4px)] h-1.5 rounded-b-sm ${
                pos === 1 ? 'bg-yellow-500/40' : pos === 2 ? 'bg-slate-400/30' : 'bg-amber-700/30'
              }`} />
            </motion.div>
          );
        })}
      </div>

      {topSongsMessage && (
        <p className="text-center text-xs text-muted-foreground italic mt-1">
          {topSongsMessage}
        </p>
      )}
    </motion.div>
  );
}
