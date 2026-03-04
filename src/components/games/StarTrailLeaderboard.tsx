import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  streamer_name: string;
  score: number;
  shape: string;
  created_at: string;
}

interface StarTrailLeaderboardProps {
  streamerId?: string;
}

export function StarTrailLeaderboard({ streamerId }: StarTrailLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('star_trail_scores')
        .select('id, streamer_name, score, shape, created_at')
        .order('score', { ascending: false })
        .limit(10);
      if (data) setLeaderboard(data);
    };
    fetchLeaderboard();
  }, []);

  if (leaderboard.length === 0) return null;

  const shown = expanded ? leaderboard : leaderboard.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl bg-card/20 backdrop-blur-md border border-border/30 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-primary fill-primary" />
        <h3 className="text-sm font-bold text-foreground">⭐ Star Trail</h3>
        <Trophy className="w-3.5 h-3.5 text-primary ml-auto" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Leaderboard</span>
      </div>

      <div className="space-y-1">
        {shown.map((entry, i) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-card/10 border border-border/10"
          >
            <span className={`w-5 text-right font-bold ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <span className="flex-1 truncate font-medium text-foreground">{entry.streamer_name}</span>
            <span className="text-muted-foreground text-[10px]">{entry.shape}</span>
            <span className="font-bold text-primary tabular-nums">{entry.score}</span>
          </div>
        ))}
      </div>

      {leaderboard.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mx-auto mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `Show all ${leaderboard.length}`}
        </button>
      )}
    </motion.div>
  );
}
