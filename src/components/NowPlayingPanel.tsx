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
  Trophy,
  Crown,
  Medal,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { StemSeparationPanel } from '@/components/StemSeparationPanel';
import { PositionBadge } from '@/components/queue/PositionBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

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
    <div className="mb-4">
      <div className="widget-now-playing rounded-xl overflow-hidden bg-card/15 backdrop-blur-xl">
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

                {/* Open Link button — platform-colored with icon */}
                {submission.song_url && submission.song_url !== 'direct-upload' && (() => {
                  const platforms: Record<string, { bg: string; hover: string; border: string; text: string; label: string; glow: string; icon: React.ReactNode }> = {
                    spotify: {
                      bg: 'bg-[#1DB954]/12', hover: 'hover:bg-[#1DB954]/22', border: 'border-[#1DB954]/30 hover:border-[#1DB954]/50', text: 'text-[#1DB954]', label: 'Open in Spotify', glow: 'shadow-[#1DB954]/10',
                      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1DB954]"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
                    },
                    soundcloud: {
                      bg: 'bg-[#FF5500]/12', hover: 'hover:bg-[#FF5500]/22', border: 'border-[#FF5500]/30 hover:border-[#FF5500]/50', text: 'text-[#FF5500]', label: 'Open in SoundCloud', glow: 'shadow-[#FF5500]/10',
                      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FF5500]"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.062.045.094.09.094s.089-.032.099-.094l.226-1.308-.226-1.332c-.01-.06-.044-.094-.09-.094m1.83-1.229c-.063 0-.109.048-.116.109l-.217 2.546.217 2.456c.007.066.053.112.116.112.063 0 .109-.046.12-.112l.244-2.456-.244-2.546c-.011-.064-.057-.109-.12-.109m.862-.086c-.069 0-.12.053-.127.119l-.199 2.632.199 2.492c.007.069.058.122.127.122s.12-.053.131-.122l.222-2.492-.222-2.632c-.011-.066-.062-.119-.131-.119m.882-.141c-.074 0-.131.058-.139.13l-.181 2.773.181 2.523c.008.074.065.133.139.133.074 0 .131-.059.142-.133l.203-2.523-.203-2.773c-.011-.072-.068-.13-.142-.13m.881-.189c-.08 0-.142.063-.15.142l-.163 2.962.163 2.546c.008.08.07.145.15.145.08 0 .142-.065.153-.145l.183-2.546-.183-2.962c-.011-.079-.073-.142-.153-.142m.932-.243c-.063 0-.137.068-.144.153l-.145 3.205.145 2.561c.007.086.081.157.144.157.086 0 .148-.071.159-.157l.163-2.561-.163-3.205c-.011-.085-.073-.153-.159-.153m.88-.085c-.092 0-.161.074-.168.165l-.127 3.29.127 2.563c.007.092.076.168.168.168s.161-.076.172-.168l.142-2.563-.142-3.29c-.011-.091-.08-.165-.172-.165m.93-.128c-.097 0-.172.079-.178.176l-.115 3.418.115 2.563c.006.098.081.18.178.18.097 0 .172-.082.183-.18l.128-2.563-.128-3.418c-.011-.097-.086-.176-.183-.176m.882-.058c-.104 0-.183.085-.189.189l-.098 3.476.098 2.558c.006.104.085.193.189.193.104 0 .183-.089.194-.193l.11-2.558-.11-3.476c-.011-.104-.09-.189-.194-.189m.93-.031c-.109 0-.194.09-.199.199l-.08 3.507.08 2.55c.005.109.09.203.199.203.109 0 .194-.094.205-.203l.09-2.55-.09-3.507c-.011-.109-.096-.199-.205-.199m.93 0c-.115 0-.204.095-.21.21l-.062 3.507.062 2.539c.006.115.095.214.21.214.115 0 .204-.099.215-.214l.07-2.539-.07-3.507c-.011-.115-.1-.21-.215-.21m.93.072c-.12 0-.214.1-.219.219l-.044 3.435.044 2.527c.005.12.099.222.219.222.12 0 .214-.102.225-.222l.049-2.527-.049-3.435c-.011-.119-.105-.219-.225-.219m1.86-2.063c-.06 0-.12.01-.178.029-.12-.891-.96-1.577-1.975-1.577-.27 0-.54.054-.795.158-.105.043-.133.087-.133.17v7.319c0 .087.068.163.155.17h2.926c.96 0 1.74-.78 1.74-1.74s-.78-1.74-1.74-1.74"/></svg>,
                    },
                    youtube: {
                      bg: 'bg-[#FF0000]/12', hover: 'hover:bg-[#FF0000]/22', border: 'border-[#FF0000]/30 hover:border-[#FF0000]/50', text: 'text-[#FF0000]', label: 'Open on YouTube', glow: 'shadow-[#FF0000]/10',
                      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FF0000]"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
                    },
                    'apple-music': {
                      bg: 'bg-[#FC3C44]/12', hover: 'hover:bg-[#FC3C44]/22', border: 'border-[#FC3C44]/30 hover:border-[#FC3C44]/50', text: 'text-[#FC3C44]', label: 'Open in Apple Music', glow: 'shadow-[#FC3C44]/10',
                      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FC3C44]"><path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0 0 19.7.28C18.96.094 18.202.035 17.44.01c-.108-.005-.216-.008-.324-.01H6.884c-.108.002-.216.005-.324.01-.762.025-1.52.084-2.26.27a5.022 5.022 0 0 0-1.874.611C1.308 1.624.563 2.624.246 3.934a9.23 9.23 0 0 0-.24 2.19C.002 6.232 0 6.34 0 6.45v11.1c0 .11.002.218.006.326a9.23 9.23 0 0 0 .24 2.19c.317 1.31 1.062 2.31 2.18 3.043a5.022 5.022 0 0 0 1.874.611c.74.186 1.498.245 2.26.27.108.005.216.008.324.01h10.232c.108-.002.216-.005.324-.01.762-.025 1.52-.084 2.26-.27a5.022 5.022 0 0 0 1.874-.611c1.118-.733 1.863-1.733 2.18-3.043a9.23 9.23 0 0 0 .24-2.19c.004-.108.006-.216.006-.326V6.45c0-.11-.002-.218-.006-.326zM16.94 17.486c0 .36-.065.713-.192 1.053a2.78 2.78 0 0 1-.575.914 2.666 2.666 0 0 1-.896.637 2.553 2.553 0 0 1-1.086.247c-.38.007-.747-.08-1.086-.257a2.119 2.119 0 0 1-.794-.724c-.207-.32-.32-.693-.33-1.084a2.07 2.07 0 0 1 .257-1.072c.176-.338.424-.63.73-.856.306-.227.656-.38 1.028-.453l1.19-.248a.675.675 0 0 0 .39-.196.493.493 0 0 0 .163-.381V9.29a.386.386 0 0 0-.108-.287.459.459 0 0 0-.282-.138l-5.317 1.14a.429.429 0 0 0-.234.138.386.386 0 0 0-.09.262v7.233c0 .36-.065.713-.192 1.053a2.78 2.78 0 0 1-.575.914 2.666 2.666 0 0 1-.896.637 2.553 2.553 0 0 1-1.086.247 2.44 2.44 0 0 1-1.086-.257 2.119 2.119 0 0 1-.794-.724 2.07 2.07 0 0 1-.33-1.084 2.07 2.07 0 0 1 .257-1.072c.176-.338.424-.63.73-.856.306-.227.656-.38 1.028-.453l1.19-.248a.675.675 0 0 0 .39-.196.493.493 0 0 0 .163-.381V7.07c0-.2.04-.395.116-.578a1.37 1.37 0 0 1 .338-.483 1.67 1.67 0 0 1 .508-.332c.192-.082.4-.13.612-.144l5.85-1.26a.517.517 0 0 1 .262.008.517.517 0 0 1 .23.124.52.52 0 0 1 .152.22c.034.088.05.18.048.273v11.588z"/></svg>,
                    },
                  };
                  const st = platforms[submission.platform] || {
                    bg: 'bg-foreground/8', hover: 'hover:bg-foreground/16', border: 'border-foreground/20 hover:border-foreground/40', text: 'text-foreground', label: t('nowPlaying.openLink'), glow: 'shadow-foreground/5',
                    icon: <ExternalLink className="w-5 h-5 text-foreground" />,
                  };
                  return (
                    <button
                      onClick={() => window.open(submission.song_url, 'upstar-song-tab', 'noopener,noreferrer')}
                      className={`relative flex items-center justify-center gap-2.5 rounded-lg border ${st.border} ${st.bg} ${st.hover} backdrop-blur-md shadow-md ${st.glow} transition-all py-3 px-5 group cursor-pointer w-full animate-[pulse_3s_ease-in-out_infinite] overflow-hidden`}
                    >
                      {/* Decorative gradient lines filling left/right space */}
                      <span className="absolute left-3 right-[60%] top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-15" />
                      <span className="absolute right-3 left-[60%] top-1/2 -translate-y-1/2 h-px bg-gradient-to-l from-transparent via-current to-transparent opacity-15" />
                      {/* Platform icon */}
                      <span className="shrink-0 group-hover:scale-110 transition-transform duration-200">{st.icon}</span>
                      <span className={`text-sm font-semibold ${st.text}`}>{st.label}</span>
                      <ExternalLink className={`w-3.5 h-3.5 ${st.text} opacity-40`} />
                    </button>
                  );
                })()}

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
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {onAddToPedestal && (
                    <>
                      <Trophy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {[1, 2, 3].map(pos => (
                        <Button
                          key={pos}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1 px-2.5"
                          onClick={() => onAddToPedestal(submission.id, pos)}
                          title={`Add to Spot #${pos}`}
                        >
                          {pos === 1 ? <Crown className="w-3.5 h-3.5 text-yellow-400" /> : pos === 2 ? <Medal className="w-3.5 h-3.5 text-slate-300" /> : <Award className="w-3.5 h-3.5 text-amber-600" />}
                          #{pos}
                        </Button>
                      ))}
                    </>
                  )}
                  <div className="flex-1" />
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1.5 px-2.5 text-destructive hover:text-destructive shrink-0"
                      onClick={() => onDelete(submission.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
