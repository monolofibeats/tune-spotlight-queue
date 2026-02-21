import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import upstarStar from '@/assets/upstar-star.png';

interface TopSongDisplay {
  position: number;
  artist_name: string;
  song_title: string;
}

interface TopSongsPublicDisplayProps {
  streamerId: string;
  showTopSongs?: boolean;
  topSongsMessage?: string;
}

export function TopSongsPublicDisplay({ streamerId, showTopSongs }: TopSongsPublicDisplayProps) {
  const { t } = useLanguage();
  const [songs, setSongs] = useState<TopSongDisplay[]>([]);

  useEffect(() => {
    if (!showTopSongs) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('streamer_top_songs')
        .select('position, submission_id')
        .eq('streamer_id', streamerId)
        .eq('is_active', true)
        .order('position');

      if (!data || data.length === 0) return;

      // Fetch submission details
      const subIds = data.map(d => d.submission_id);
      const { data: subs } = await supabase
        .from('submissions')
        .select('id, artist_name, song_title')
        .in('id', subIds);

      if (subs) {
        const enriched = data.map(d => {
          const sub = subs.find(s => s.id === d.submission_id);
          return {
            position: d.position,
            artist_name: sub?.artist_name || 'Unknown',
            song_title: sub?.song_title || 'Untitled',
          };
        });
        setSongs(enriched);
      }
    };

    fetch();
  }, [streamerId, showTopSongs]);

  if (!showTopSongs || songs.length === 0) return null;

  const getIcon = (pos: number) => {
    if (pos === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (pos === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    return <Award className="w-5 h-5 text-amber-600" />;
  };

  const getStyle = (pos: number) => {
    if (pos === 1) return 'border-yellow-500/40 bg-yellow-500/5';
    if (pos === 2) return 'border-slate-400/30 bg-slate-400/5';
    return 'border-amber-600/30 bg-amber-600/5';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-center gap-2">
        <img src={upstarStar} alt="" className="w-5 h-5" />
        <h3 className="text-sm font-semibold text-center">{t('topSongs.publicTitle')}</h3>
        <img src={upstarStar} alt="" className="w-5 h-5" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Display in visual pedestal order: 2nd, 1st, 3rd */}
        {[2, 1, 3].map(pos => {
          const song = songs.find(s => s.position === pos);
          if (!song) return <div key={pos} />;

          return (
            <motion.div
              key={pos}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: pos * 0.1 }}
              className={`rounded-xl border p-3 text-center ${getStyle(pos)} ${pos === 1 ? 'sm:-mt-2' : pos === 3 ? 'sm:mt-2' : 'sm:mt-1'}`}
            >
              <div className="flex justify-center mb-1.5">
                {getIcon(pos)}
              </div>
              <p className="text-xs font-bold truncate">{song.song_title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{song.artist_name}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
