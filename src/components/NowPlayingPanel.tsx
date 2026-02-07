import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Music2, 
  Download, 
  ExternalLink, 
  User, 
  Calendar, 
  Send, 
  Zap,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AudioPlayer } from '@/components/AudioPlayer';
import { PositionBadge } from '@/components/queue/PositionBadge';
import { supabase } from '@/integrations/supabase/client';

interface Submission {
  id: string;
  song_url: string;
  platform: string;
  artist_name: string;
  song_title: string;
  message: string | null;
  email: string | null;
  amount_paid: number;
  is_priority: boolean;
  status: string;
  feedback: string | null;
  created_at: string;
  audio_file_url: string | null;
  user_id?: string | null;
}

interface SubmitterStats {
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  total_submissions: number;
}

interface SpotifyMetadata {
  artistName?: string;
  songTitle?: string;
  albumArt?: string;
  artistImage?: string;
  previewUrl?: string;
}

interface NowPlayingPanelProps {
  submission: Submission | null;
  audioUrl: string | null;
  isLoadingAudio: boolean;
  position: number;
  onClose: () => void;
  onDownload: () => void;
}

export function NowPlayingPanel({
  submission,
  audioUrl,
  isLoadingAudio,
  position,
  onClose,
  onDownload,
}: NowPlayingPanelProps) {
  const [submitterStats, setSubmitterStats] = useState<SubmitterStats | null>(null);
  const [spotifyMeta, setSpotifyMeta] = useState<SpotifyMetadata | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingSpotify, setIsLoadingSpotify] = useState(false);

  // Fetch submitter profile stats
  useEffect(() => {
    const fetchSubmitterStats = async () => {
      if (!submission?.email) {
        setSubmitterStats(null);
        return;
      }

      setIsLoadingStats(true);
      try {
        // Get total submissions from this email
        const { count: totalSubmissions } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('email', submission.email);

        // Try to get profile if user_id exists
        let profile = null;
        if (submission.user_id) {
          const { data } = await supabase
            .from('profiles')
            .select('username, avatar_url, created_at')
            .eq('user_id', submission.user_id)
            .maybeSingle();
          profile = data;
        }

        setSubmitterStats({
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
          created_at: profile?.created_at || submission.created_at,
          total_submissions: totalSubmissions || 1,
        });
      } catch (error) {
        console.error('Failed to fetch submitter stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchSubmitterStats();
  }, [submission?.email, submission?.user_id, submission?.created_at]);

  // Fetch Spotify metadata if applicable
  useEffect(() => {
    const fetchSpotifyMeta = async () => {
      if (!submission?.song_url?.includes('spotify.com')) {
        setSpotifyMeta(null);
        return;
      }

      setIsLoadingSpotify(true);
      try {
        const { data, error } = await supabase.functions.invoke('fetch-spotify-metadata', {
          body: { url: submission.song_url },
        });

        if (!error && data) {
          setSpotifyMeta(data);
        }
      } catch (error) {
        console.error('Failed to fetch Spotify metadata:', error);
      } finally {
        setIsLoadingSpotify(false);
      }
    };

    fetchSpotifyMeta();
  }, [submission?.song_url]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'spotify': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'soundcloud': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'youtube': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'apple-music': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <AnimatePresence>
      {submission && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="mb-6 overflow-hidden"
        >
          <div className="glass-strong rounded-2xl border-2 border-primary/40 overflow-hidden shadow-lg shadow-primary/10">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-border/30">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Music2 className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">Now Playing</span>
                </div>
                
                <div className="flex-1" />
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Song Info & Player */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Song Header */}
                  <div className="flex items-start gap-4">
                    <PositionBadge
                      position={position}
                      badgeClassName="w-14 h-12 rounded-xl text-lg"
                      showGlow={position <= 3}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-display font-bold truncate">
                          {submission.song_title}
                        </h2>
                        {submission.is_priority && (
                          <Badge variant="premium" className="shrink-0">
                            <Zap className="w-3 h-3 mr-1" />
                            Priority
                          </Badge>
                        )}
                      </div>
                      <p className="text-lg text-muted-foreground truncate">
                        {submission.artist_name}
                      </p>
                      
                      {/* Platform & Link */}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={`text-xs ${getPlatformColor(submission.platform)}`}>
                          {submission.platform === 'apple-music' ? 'Apple Music' : 
                           submission.platform.charAt(0).toUpperCase() + submission.platform.slice(1)}
                        </Badge>
                        
                        {submission.song_url && submission.song_url !== 'direct-upload' && (
                          <a
                            href={submission.song_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Link
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Audio Player - for uploaded files */}
                  {submission.audio_file_url && (
                    <div className="p-4 rounded-xl bg-card/50 border border-border/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Music2 className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Audio File</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onDownload}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      
                      <AudioPlayer
                        src={audioUrl}
                        isLoading={isLoadingAudio}
                      />
                    </div>
                  )}

                  {/* Spotify Embed - for Spotify links */}
                  {submission.platform === 'spotify' && submission.song_url && (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent p-1">
                        {isLoadingSpotify ? (
                          <div className="flex items-center justify-center py-12 bg-card/50 rounded-lg">
                            <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                          </div>
                        ) : (
                          <iframe
                            src={`https://open.spotify.com/embed/track/${submission.song_url.match(/track\/([a-zA-Z0-9]+)/)?.[1]}?utm_source=generator&theme=0`}
                            width="100%"
                            height="232"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="rounded-lg"
                          />
                        )}
                      </div>
                      
                      {/* Open in Spotify Web Player */}
                      <div className="flex items-center gap-3">
                        <a
                          href={submission.song_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-500 hover:bg-green-400 text-black font-medium text-sm transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open in Spotify
                        </a>
                        <span className="text-xs text-muted-foreground">
                          Log in to Spotify for full playback
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {submission.message && (
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border/30">
                      <p className="text-sm text-muted-foreground italic">
                        "{submission.message}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: Submitter Stats */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Submitter Info
                    </h3>
                    
                    {isLoadingStats ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Avatar & Name */}
                        <div className="flex items-center gap-3">
                          {submitterStats?.avatar_url ? (
                            <img
                              src={submitterStats.avatar_url}
                              alt="Avatar"
                              className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {submitterStats?.username || submission.email?.split('@')[0] || 'Anonymous'}
                            </p>
                            {submission.email && (
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {submission.email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
                          <div className="text-center p-2 rounded-lg bg-secondary/30">
                            <div className="flex items-center justify-center gap-1 text-primary mb-1">
                              <Send className="w-3 h-3" />
                            </div>
                            <p className="text-lg font-bold">{submitterStats?.total_submissions || 1}</p>
                            <p className="text-[10px] text-muted-foreground">Submissions</p>
                          </div>
                          
                          <div className="text-center p-2 rounded-lg bg-secondary/30">
                            <div className="flex items-center justify-center gap-1 text-primary mb-1">
                              <Calendar className="w-3 h-3" />
                            </div>
                            <p className="text-xs font-medium">
                              {formatDate(submitterStats?.created_at || submission.created_at)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Submitted</p>
                          </div>
                        </div>

                        {/* Amount Paid */}
                        {submission.amount_paid > 0 && (
                          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                            <p className="text-xs text-muted-foreground">Amount Paid</p>
                            <p className="text-lg font-bold text-primary">
                              €{submission.amount_paid.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="p-4 rounded-xl bg-card/50 border border-border/30 space-y-2">
                    <h3 className="text-sm font-semibold mb-3">Quick Links</h3>
                    
                    {submission.song_url && submission.song_url !== 'direct-upload' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        asChild
                      >
                        <a href={submission.song_url} target="_blank" rel="noopener noreferrer">
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Open in {submission.platform === 'apple-music' ? 'Apple Music' : 
                                   submission.platform.charAt(0).toUpperCase() + submission.platform.slice(1)}
                        </a>
                      </Button>
                    )}
                    
                    {submission.audio_file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={onDownload}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Audio
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
