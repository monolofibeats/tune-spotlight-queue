import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  Copy,
  Check,
  Disc3,
  Users,
  Play,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  SkipForward,
} from 'lucide-react';
import { MiniPedestal } from '@/components/MiniPedestal';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { StemSeparationPanel } from '@/components/StemSeparationPanel';
import { PositionBadge } from '@/components/queue/PositionBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { PlatformOpenButton } from '@/components/PlatformOpenButton';

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

interface TopTrack {
  name: string;
  url: string;
}

interface SocialLink {
  platform: string;
  url: string;
}

interface SpotifyMetadata {
  artistName?: string;
  songTitle?: string;
  albumArt?: string;
  artistId?: string;
  artistUrl?: string;
  albumName?: string;
  artistImage?: string;
  artistBio?: string;
  artistTopTracks?: TopTrack[];
  artistSocialLinks?: SocialLink[];
  monthlyListeners?: string;
}

export interface NowPlayingConfig {
  showActionButtons?: boolean;
  showVisualizer?: boolean;
  showLUFS?: boolean;
  showDBFS?: boolean;
  showKeyFinder?: boolean;
  showStemSeparation?: boolean;
  showSubmitterInsights?: boolean;
  showSpotifyEmbed?: boolean;
  showSoundCloudEmbed?: boolean;
  showYouTubeEmbed?: boolean;
  showDropboxEmbed?: boolean;
  showMessage?: boolean;
  showDownload?: boolean;
}

interface NowPlayingPanelProps {
  submission: Submission | null;
  audioUrl: string | null;
  isLoadingAudio: boolean;
  position: number;
  onClose: () => void;
  onDownload: () => void;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  onAddToPedestal?: (submissionId: string, position: number) => void;
  config?: NowPlayingConfig;
  compactVisualizer?: boolean;
  textScale?: number;
  /** Grid width in columns (out of 12). Controls max-width. */
  widthCols?: number;
  /** Grid height in rows (rowHeight=40px). Controls max-height with overflow scroll. */
  heightRows?: number;
}

// Social platform icons mapping
const getSocialIcon = (platform: string) => {
  const lowerPlatform = platform.toLowerCase();
  if (lowerPlatform.includes('instagram')) return '📸';
  if (lowerPlatform.includes('twitter') || lowerPlatform.includes('x')) return '𝕏';
  if (lowerPlatform.includes('facebook')) return '📘';
  if (lowerPlatform.includes('youtube')) return '▶️';
  if (lowerPlatform.includes('tiktok')) return '🎵';
  if (lowerPlatform.includes('soundcloud')) return '☁️';
  if (lowerPlatform.includes('wikipedia')) return '📖';
  return '🔗';
};

export function NowPlayingPanel({
  submission,
  audioUrl,
  isLoadingAudio,
  position,
  onClose,
  onDownload,
  onStatusChange,
  onDelete,
  onAddToPedestal,
  config,
  compactVisualizer,
  textScale = 100,
  widthCols,
  heightRows,
}: NowPlayingPanelProps) {
  const { t } = useLanguage();
  const cfg = {
    showActionButtons: true,
    showVisualizer: true,
    showLUFS: true,
    showDBFS: true,
    showKeyFinder: true,
    showStemSeparation: true,
    showSubmitterInsights: true,
    showSpotifyEmbed: true,
    showSoundCloudEmbed: true,
    showYouTubeEmbed: true,
    showDropboxEmbed: true,
    showMessage: true,
    showDownload: true,
    ...config,
  };

  const [submitterStats, setSubmitterStats] = useState<SubmitterStats | null>(null);
  const [spotifyMeta, setSpotifyMeta] = useState<SpotifyMetadata | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingSpotify, setIsLoadingSpotify] = useState(false);
  const [copiedContact, setCopiedContact] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  const handleAudioElement = useCallback((el: HTMLAudioElement | null) => {
    setAudioEl(el);
  }, []);

  // Fetch submitter profile stats
  useEffect(() => {
    const fetchSubmitterStats = async () => {
      if (!submission?.email) {
        setSubmitterStats(null);
        return;
      }

      setIsLoadingStats(true);
      try {
        const { count: totalSubmissions } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('email', submission.email);

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

  const handleCopyContact = async () => {
    if (submission?.email) {
      await navigator.clipboard.writeText(submission.email);
      setCopiedContact(true);
      toast({
        title: t('nowPlaying.copied'),
        description: t('nowPlaying.copiedDesc'),
      });
      setTimeout(() => setCopiedContact(false), 2000);
    }
  };

  const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const [collapsed, setCollapsed] = useState(!submission);

  // Auto-expand when a song is loaded, collapse when cleared
  useEffect(() => {
    if (submission) {
      setCollapsed(false);
    } else {
      setCollapsed(true);
    }
  }, [submission]);

  return (
    <div className="mb-4" style={{
      ...(textScale !== 100 ? { zoom: textScale / 100 } : {}),
      ...(widthCols && widthCols < 12 ? { maxWidth: `${(widthCols / 12) * 100}%` } : {}),
    } as React.CSSProperties}>
      <div className="widget-now-playing rounded-xl overflow-hidden bg-card/15 backdrop-blur-xl" style={{
        ...(heightRows ? { maxHeight: `${heightRows * 40}px`, overflowY: 'auto' as const } : {}),
      }}>
        {/* Header — always visible, clickable to expand/collapse when empty */}
        <div
          className={`px-3 py-2 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent border-b border-border/10 flex items-center gap-2 ${!submission ? 'cursor-pointer hover:bg-yellow-500/5 transition-colors' : ''}`}
          onClick={() => { if (!submission) setCollapsed(c => !c); }}
        >
          <Music2 className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-xs font-semibold text-yellow-500">{t('nowPlaying.title')}</span>
          {!submission && (
            <span className="text-[10px] text-muted-foreground ml-1">{t('nowPlaying.empty')}</span>
          )}
          <div className="flex-1" />
          {!submission ? (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c); }}>
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!collapsed && !submission && (
            <motion.div
              key="empty"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Disc3 className="w-8 h-8 opacity-30 animate-pulse-slow" />
                <p className="text-xs">{t('nowPlaying.dragOrClick')}</p>
              </div>
            </motion.div>
          )}
          {!collapsed && submission && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
            {/* Main Content — compact */}
            <div className="p-3">
              <div className="np-main-content flex flex-col gap-3">
                {/* Song Header — compact single row */}
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Play className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold truncate scalable-text">
                        {submission.song_title}
                      </h2>
                      {submission.is_priority && (
                        <Badge variant="premium" className="shrink-0 text-[10px] px-1.5 py-0">
                          <Zap className="w-2.5 h-2.5 mr-0.5" />
                          Priority
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate scalable-text">
                        {submission.artist_name}
                      </p>
                      <Badge className={`text-[10px] px-1.5 py-0 ${getPlatformColor(submission.platform)}`}>
                        {submission.platform === 'apple-music' ? 'Apple Music' : 
                         submission.platform.charAt(0).toUpperCase() + submission.platform.slice(1)}
                      </Badge>
                      {submission.song_url && submission.song_url !== 'direct-upload' && (
                        <a
                          href={submission.song_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 text-[10px] text-primary hover:underline shrink-0"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          Open
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audio Player — compact wrapper */}
                {submission.audio_file_url && (
                  <div className="rounded-lg bg-card/10 overflow-hidden">
                    <div className="p-2">
                      {cfg.showDownload && (
                        <div className="flex justify-end mb-1">
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={onDownload}>
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>
                      )}
                      
                      <AudioPlayer
                        src={audioUrl}
                        isLoading={isLoadingAudio}
                        onAudioElement={handleAudioElement}
                      />
                    </div>
                    
                    {/* Audio Visualizer — only when enabled & URL loaded */}
                    {cfg.showVisualizer && audioUrl && (
                      <div className="px-2 pb-2">
                        <AudioVisualizer key={audioUrl} audioElement={audioEl} className="rounded-lg" showLUFS={cfg.showLUFS} showDBFS={cfg.showDBFS} showKeyFinder={cfg.showKeyFinder} height={compactVisualizer ? 160 : 320} />
                      </div>
                    )}
                    
                    {/* Stem Separation */}
                    {cfg.showStemSeparation && (
                      <div className="px-2 pb-2">
                        <StemSeparationPanel 
                          submissionId={submission.id}
                          hasAudioFile={!!submission.audio_file_url}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Spotify Embed — compact */}
                {cfg.showSpotifyEmbed && submission.platform === 'spotify' && submission.song_url && (
                  <div className="rounded-lg overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    {isLoadingSpotify ? (
                      <div className="flex items-center justify-center py-6 bg-card/50">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : (
                      <iframe
                        src={`https://open.spotify.com/embed/track/${submission.song_url.match(/track\/([a-zA-Z0-9]+)/)?.[1]}?utm_source=generator&theme=0`}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-lg"
                      />
                    )}
                  </div>
                )}

                {/* SoundCloud Embed — compact */}
                {cfg.showSoundCloudEmbed && submission.platform === 'soundcloud' && submission.song_url && (
                  <div className="rounded-lg overflow-hidden border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                    <iframe
                      width="100%"
                      height="130"
                      scrolling="no"
                      frameBorder="no"
                      allow="autoplay"
                      src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(submission.song_url)}&color=%23f97316&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true`}
                      loading="lazy"
                      className="rounded-lg"
                    />
                  </div>
                )}

                {/* YouTube Embed — compact */}
                {cfg.showYouTubeEmbed && submission.platform === 'youtube' && submission.song_url && (() => {
                  const videoId = submission.song_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
                  if (!videoId) return null;
                  return (
                    <div className="rounded-lg overflow-hidden border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                      <iframe
                        width="100%"
                        height="152"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        className="rounded-lg"
                      />
                    </div>
                  );
                })()}

                {/* Dropbox Audio Embed */}
                {cfg.showDropboxEmbed && submission.platform === 'dropbox' && submission.song_url && (
                  <div className="rounded-lg overflow-hidden border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent p-3">
                    <audio
                      controls
                      src={submission.song_url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '').replace('?dl=1', '')}
                      className="w-full"
                      preload="metadata"
                    />
                  </div>
                )}

                {/* Open Link button — platform-colored with cursor-tracking glow */}
                {submission.song_url && submission.song_url !== 'direct-upload' && (
                  <PlatformOpenButton url={submission.song_url} platform={submission.platform} />
                )}

                {cfg.showMessage && submission.message && (
                  <div className="px-3 py-2 rounded-lg bg-card/20 border border-border/20">
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                      "{submission.message}"
                    </p>
                  </div>
                )}

                {/* Submitter Insights — collapsible, compact */}
                {cfg.showSubmitterInsights && (
                  <div className="rounded-lg border border-border/30 overflow-hidden">
                    <button
                      onClick={() => setInsightsExpanded(!insightsExpanded)}
                      className="w-full flex items-center justify-between px-3 py-1.5 bg-card/50 hover:bg-card/70 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground">{t('nowPlaying.submitterInsights')}</span>
                        {submitterStats && (
                          <span className="text-[10px] text-muted-foreground/60">
                            · {submitterStats.username || submission?.email?.split('@')[0] || 'Anonymous'}
                            · {submitterStats.total_submissions || 1} sub{(submitterStats.total_submissions || 1) !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {insightsExpanded ? (
                        <ChevronUp className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>

                    <AnimatePresence>
                      {insightsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 border-t border-border/30">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {/* Spotify Artist Card */}
                              {submission?.platform === 'spotify' && (
                                <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                                    <Disc3 className="w-3.5 h-3.5 text-green-400" />
                                    {t('nowPlaying.artistProfile')}
                                  </h3>
                                  
                                  {isLoadingSpotify ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                                    </div>
                                  ) : spotifyMeta ? (
                                    <div className="space-y-2">
                                      {spotifyMeta.artistImage && (
                                        <div className="rounded-full overflow-hidden border border-green-500/30 mx-auto w-16 h-16">
                                          <img
                                            src={spotifyMeta.artistImage}
                                            alt={`${spotifyMeta.artistName || submission.artist_name}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      )}
                                      
                                      <div className="text-center">
                                        <p className="font-semibold text-green-400 text-sm">
                                          {spotifyMeta.artistName 
                                            ? decodeHtmlEntities(spotifyMeta.artistName) 
                                            : submission.artist_name}
                                        </p>
                                        {spotifyMeta.monthlyListeners && (
                                          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                            <Users className="w-2.5 h-2.5" />
                                            {spotifyMeta.monthlyListeners} {t('nowPlaying.monthlyListeners')}
                                          </div>
                                        )}
                                      </div>

                                      {spotifyMeta.artistBio && (
                                        <p className="text-[10px] text-muted-foreground line-clamp-3 p-2 rounded bg-card/50 border border-border/30">
                                          {spotifyMeta.artistBio}
                                        </p>
                                      )}

                                      {spotifyMeta.artistTopTracks && spotifyMeta.artistTopTracks.length > 0 && (
                                        <div>
                                          <p className="text-[10px] font-medium text-muted-foreground mb-1">{t('nowPlaying.topTracks')}</p>
                                          <div className="space-y-0.5">
                                            {spotifyMeta.artistTopTracks.slice(0, 3).map((track, index) => (
                                              <a
                                                key={index}
                                                href={track.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 p-1 rounded hover:bg-green-500/10 transition-colors group"
                                              >
                                                <span className="text-[9px] text-muted-foreground w-3">{index + 1}</span>
                                                <Play className="w-2.5 h-2.5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <span className="text-[10px] truncate flex-1">{track.name}</span>
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {spotifyMeta.artistSocialLinks && spotifyMeta.artistSocialLinks.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {spotifyMeta.artistSocialLinks.map((link, index) => (
                                            <a
                                              key={index}
                                              href={link.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-card/50 border border-border/30 hover:border-green-500/30 transition-colors text-[10px]"
                                            >
                                              <span>{getSocialIcon(link.platform)}</span>
                                              <span>{link.platform}</span>
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {spotifyMeta.artistUrl && (
                                        <a
                                          href={spotifyMeta.artistUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-center gap-1 text-[10px] text-green-400 hover:underline"
                                        >
                                          <ExternalLink className="w-2.5 h-2.5" />
                                          {t('nowPlaying.viewArtistOnSpotify')}
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-center py-2 text-muted-foreground text-xs">
                                      No artist data available
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Submitter Stats */}
                              <div className="p-3 rounded-lg bg-card/50 border border-border/30">
                                <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-primary" />
                                  Submitter Details
                                </h3>
                                
                                {isLoadingStats ? (
                                  <div className="flex items-center justify-center py-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      {submitterStats?.avatar_url ? (
                                        <img
                                          src={submitterStats.avatar_url}
                                          alt="Avatar"
                                          className="w-7 h-7 rounded-full object-cover border border-border"
                                        />
                                      ) : (
                                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                                        </div>
                                      )}
                                      <p className="text-xs font-medium">
                                        {submitterStats?.username || submission?.email?.split('@')[0] || 'Anonymous'}
                                      </p>
                                    </div>

                                    {submission?.email && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start text-[10px] h-7"
                                        onClick={handleCopyContact}
                                      >
                                        {copiedContact ? (
                                          <>
                                            <Check className="w-2.5 h-2.5 mr-1.5 text-green-500" />
                                            {t('nowPlaying.copied')}
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-2.5 h-2.5 mr-1.5" />
                                            {t('nowPlaying.copyContact')}
                                          </>
                                        )}
                                      </Button>
                                    )}

                                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/30">
                                      <div className="text-center p-1.5 rounded bg-secondary/30">
                                        <Send className="w-2.5 h-2.5 text-primary mx-auto mb-0.5" />
                                        <p className="text-sm font-bold">{submitterStats?.total_submissions || 1}</p>
                                        <p className="text-[9px] text-muted-foreground">{t('nowPlaying.submissions')}</p>
                                      </div>
                                      
                                      <div className="text-center p-1.5 rounded bg-secondary/30">
                                        <Calendar className="w-2.5 h-2.5 text-primary mx-auto mb-0.5" />
                                        <p className="text-[10px] font-medium">
                                          {formatDate(submitterStats?.created_at || submission?.created_at || '')}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground">{t('nowPlaying.submitted')}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Review Actions — compact bar */}
            {cfg.showActionButtons && onStatusChange && submission && (
              <div className="px-3 py-2.5 border-t border-border/10 bg-card/10">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    className="h-9 text-xs gap-1.5 px-3 flex-1 min-w-0 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_0_12px_-2px] hover:shadow-emerald-500/30 transition-all"
                    onClick={() => onStatusChange(submission.id, 'reviewed')}
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t('nowPlaying.done')}</span>
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 text-xs gap-1.5 px-3 flex-1 min-w-0 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/50 hover:shadow-[0_0_12px_-2px] hover:shadow-red-500/30 transition-all"
                    onClick={() => onStatusChange(submission.id, 'skipped')}
                  >
                    <SkipForward className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t('nowPlaying.skip')}</span>
                  </Button>
                </div>
                <div className="relative flex items-center justify-center mt-2">
                  {onAddToPedestal && (
                    <div className="flex justify-center">
                      <div className="scale-110 origin-center">
                        <MiniPedestal onSelect={(pos) => onAddToPedestal(submission.id, pos)} />
                      </div>
                    </div>
                  )}
                  {onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-1/2 -translate-y-1/2 h-8 text-xs gap-1.5 px-2.5 text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-strong">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will move "{submission.artist_name} – {submission.song_title}" to the trash. You can restore it within 7 days.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(submission.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Move to Trash
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            )}

          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
