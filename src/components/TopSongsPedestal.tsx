import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, Eye, EyeOff, GripVertical, X, Crown, Medal, Award, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Streamer } from '@/types/streamer';

interface Submission {
  id: string;
  artist_name: string;
  song_title: string;
  platform: string;
  status: string;
}

interface TopSong {
  id: string;
  submission_id: string;
  position: number;
  is_active: boolean;
  submission?: Submission;
}

interface TopSongsPedestalProps {
  streamer: Streamer;
  submissions: Submission[];
  onStreamerUpdate?: (s: Streamer) => void;
}

export function TopSongsPedestal({ streamer, submissions, onStreamerUpdate }: TopSongsPedestalProps) {
  const { t } = useLanguage();
  const [topSongs, setTopSongs] = useState<TopSong[]>([]);
  const [showPublicly, setShowPublicly] = useState(!!streamer.show_top_songs);
  const [topSongsMessage, setTopSongsMessage] = useState(streamer.top_songs_message || '');
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);
  const [draggingSubmission, setDraggingSubmission] = useState<Submission | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTopSongs = useCallback(async () => {
    const { data } = await supabase
      .from('streamer_top_songs')
      .select('id, submission_id, position, is_active')
      .eq('streamer_id', streamer.id)
      .eq('is_active', true)
      .order('position');
    
    if (data) {
      // Enrich with submission data
      const enriched = data.map(ts => {
        const sub = submissions.find(s => s.id === ts.submission_id);
        return { ...ts, submission: sub };
      });
      setTopSongs(enriched);
    }
  }, [streamer.id, submissions]);

  useEffect(() => { fetchTopSongs(); }, [fetchTopSongs]);

  const handleTogglePublic = async (checked: boolean) => {
    setShowPublicly(checked);
    const { error } = await supabase
      .from('streamers')
      .update({ show_top_songs: checked })
      .eq('id', streamer.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update visibility', variant: 'destructive' });
      setShowPublicly(!checked);
    } else {
      onStreamerUpdate?.({ ...streamer, show_top_songs: checked } as Streamer);
    }
  };

  const handleMessageSave = async () => {
    const { error } = await supabase
      .from('streamers')
      .update({ top_songs_message: topSongsMessage || null })
      .eq('id', streamer.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to save message', variant: 'destructive' });
    } else {
      onStreamerUpdate?.({ ...streamer, top_songs_message: topSongsMessage || null } as Streamer);
    }
  };
    }
  };

  const handleReset = async () => {
    // Deactivate all active top songs
    const { error } = await supabase
      .from('streamer_top_songs')
      .update({ is_active: false })
      .eq('streamer_id', streamer.id)
      .eq('is_active', true);
    if (error) {
      toast({ title: 'Error', description: 'Failed to reset', variant: 'destructive' });
    } else {
      setTopSongs([]);
      toast({ title: t('topSongs.resetSuccess') });
    }
  };

  const placeOnPedestal = async (submission: Submission, targetPosition: number) => {
    // Check if this song is already on the pedestal
    const existingIndex = topSongs.findIndex(ts => ts.submission_id === submission.id);
    if (existingIndex !== -1) {
      toast({ title: t('topSongs.alreadyOnPedestal'), variant: 'destructive' });
      return;
    }

    // Cascading logic: new song at target pushes existing down
    // First, deactivate all current active songs that will be displaced
    const currentActive = [...topSongs].sort((a, b) => a.position - b.position);
    
    // Build new arrangement: insert at targetPosition, push others down
    const newArrangement: { submission_id: string; position: number }[] = [];
    
    // The new song goes to the target position
    newArrangement.push({ submission_id: submission.id, position: targetPosition });
    
    // Existing songs cascade down
    let nextPos = targetPosition + 1;
    for (const song of currentActive) {
      if (song.submission_id === submission.id) continue;
      if (song.position >= targetPosition) {
        if (nextPos <= 3) {
          newArrangement.push({ submission_id: song.submission_id, position: nextPos });
          nextPos++;
        }
        // Songs pushed past 3 get deactivated (handled by not including them)
      } else {
        newArrangement.push({ submission_id: song.submission_id, position: song.position });
      }
    }

    // Also fill positions below target with existing songs that were there
    for (const song of currentActive) {
      if (song.position < targetPosition && !newArrangement.find(a => a.submission_id === song.submission_id)) {
        newArrangement.push({ submission_id: song.submission_id, position: song.position });
      }
    }

    // Deactivate all current
    await supabase
      .from('streamer_top_songs')
      .update({ is_active: false })
      .eq('streamer_id', streamer.id)
      .eq('is_active', true);

    // Insert new arrangement
    const inserts = newArrangement.map(a => ({
      streamer_id: streamer.id,
      submission_id: a.submission_id,
      position: a.position,
      is_active: true,
    }));

    if (inserts.length > 0) {
      const { error } = await supabase.from('streamer_top_songs').insert(inserts);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }

    await fetchTopSongs();
  };

  const removeFromPedestal = async (position: number) => {
    const currentActive = [...topSongs].sort((a, b) => a.position - b.position);
    const remaining = currentActive.filter(s => s.position !== position);

    // Deactivate all
    await supabase
      .from('streamer_top_songs')
      .update({ is_active: false })
      .eq('streamer_id', streamer.id)
      .eq('is_active', true);

    // Rebuild: shift songs up to fill the gap
    const newArrangement: { submission_id: string; position: number }[] = [];
    let pos = 1;
    for (const song of remaining.sort((a, b) => a.position - b.position)) {
      newArrangement.push({ submission_id: song.submission_id, position: pos });
      pos++;
    }

    if (newArrangement.length > 0) {
      const inserts = newArrangement.map(a => ({
        streamer_id: streamer.id,
        submission_id: a.submission_id,
        position: a.position,
        is_active: true,
      }));
      await supabase.from('streamer_top_songs').insert(inserts);
    }

    await fetchTopSongs();
    toast({ title: t('topSongs.resetSuccess') });
  };

  const handleDragStart = (e: React.DragEvent, submission: Submission) => {
    e.dataTransfer.setData('submission_id', submission.id);
    setDraggingSubmission(submission);
  };

  const handleDragOver = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    setDragOverPosition(position);
  };

  const handleDragLeave = () => setDragOverPosition(null);

  const handleDrop = async (e: React.DragEvent, position: number) => {
    e.preventDefault();
    setDragOverPosition(null);
    const subId = e.dataTransfer.getData('submission_id');
    const sub = submissions.find(s => s.id === subId);
    if (sub) await placeOnPedestal(sub, position);
    setDraggingSubmission(null);
  };

  const getPositionIcon = (pos: number) => {
    if (pos === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (pos === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    return <Award className="w-5 h-5 text-amber-600" />;
  };

  const getPositionStyle = (pos: number) => {
    if (pos === 1) return 'border-yellow-500/50 bg-yellow-500/5 shadow-yellow-500/10';
    if (pos === 2) return 'border-slate-400/50 bg-slate-400/5 shadow-slate-400/10';
    return 'border-amber-600/50 bg-amber-600/5 shadow-amber-600/10';
  };

  const getSpotHeight = (pos: number) => {
    if (pos === 1) return 'min-h-[120px]';
    if (pos === 2) return 'min-h-[100px]';
    return 'min-h-[85px]';
  };

  // Available songs = reviewed/pending, not already on pedestal, filtered by search
  const pedestalSubmissionIds = topSongs.map(ts => ts.submission_id);
  const availableSongs = submissions.filter(s => {
    if (pedestalSubmissionIds.includes(s.id) || s.status === 'deleted') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.song_title.toLowerCase().includes(q) || s.artist_name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-display font-bold">{t('topSongs.title')}</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Public toggle */}
          <div className="flex items-center gap-2">
            {showPublicly ? (
              <Eye className="w-4 h-4 text-primary" />
            ) : (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">{t('topSongs.displayPublicly')}</span>
            <Switch checked={showPublicly} onCheckedChange={handleTogglePublic} />
          </div>

          {/* Reset button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={topSongs.length === 0}>
                <RotateCcw className="w-3.5 h-3.5" />
                {t('topSongs.reset')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('topSongs.resetConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('topSongs.resetConfirmDesc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('topSongs.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>{t('topSongs.confirmReset')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Pedestal - 3 spots */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(pos => {
          const song = topSongs.find(ts => ts.position === pos);
          const isOver = dragOverPosition === pos;

          return (
            <motion.div
              key={pos}
              className={`relative rounded-xl border-2 border-dashed p-4 transition-all ${getSpotHeight(pos)} flex flex-col items-center justify-center gap-2
                ${isOver ? 'border-primary bg-primary/10 scale-[1.02]' : song ? getPositionStyle(pos) + ' border-solid' : 'border-border/50 bg-muted/10'}
              `}
              onDragOver={(e) => handleDragOver(e, pos)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, pos)}
              layout
            >
              {/* Position icon */}
              <div className="flex items-center gap-1.5 mb-1">
                {getPositionIcon(pos)}
                <span className="text-xs font-bold text-muted-foreground">#{pos}</span>
              </div>

              <AnimatePresence mode="wait">
                {song?.submission ? (
                  <motion.div
                    key={song.submission_id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-center w-full"
                  >
                    <p className="font-semibold text-sm truncate">{song.submission.song_title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.submission.artist_name}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-6 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => removeFromPedestal(pos)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      {t('topSongs.remove')}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground text-center"
                  >
                    {t('topSongs.dragHere')}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Draggable song list */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('topSongs.availableSongs')}</h3>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('topSongs.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border/30 bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {availableSongs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t('topSongs.noSongsAvailable')}</p>
          ) : (
            availableSongs.map(sub => (
              <div
                key={sub.id}
                draggable
                onDragStart={(e) => handleDragStart(e, sub)}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-card/50 border border-border/30 cursor-grab active:cursor-grabbing hover:bg-card/80 transition-colors group"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.song_title}</p>
                  <p className="text-xs text-muted-foreground truncate">{sub.artist_name}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 uppercase">{sub.platform}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
