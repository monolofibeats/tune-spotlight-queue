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
}: NowPlayingPanelProps) {
  const { t } = useLanguage();
  const cfg = {
    showActionButtons: true,
    showVisualizer: true,
    showLUFS: true,
    showDBFS: true,
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

  // Decode HTML entities in artist name
  const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
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
          <div className="widget-now-playing glass-strong rounded-2xl border-2 border-primary/40 overflow-hidden shadow-lg shadow-primary/10">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-border/30">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <Music2 className="w-5 h-5 text-primary" />
                   <span className="text-sm font-semibold text-primary">{t('nowPlaying.title')}</span>
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
              <div className="np-main-content flex flex-col gap-6">
                {/* Song Info & Player - Full Width */}
                <div className="space-y-4">
                  {/* Song Header */}
                  <div className="flex items-start gap-4">
                    <PositionBadge
                      position={position}
                      badgeClassName="w-14 h-12 rounded-xl text-lg"
                      showGlow={position <= 3}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-display font-bold truncate scalable-text">
                          {submission.song_title}
                        </h2>
                        {submission.is_priority && (
                          <Badge variant="premium" className="shrink-0">
                            <Zap className="w-3 h-3 mr-1" />
                            Priority
                          </Badge>
                        )}
                      </div>
                      <p className="text-lg text-muted-foreground truncate scalable-text">
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
                            {t('nowPlaying.openLink')}
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
                          <span className="text-sm font-medium">{t('nowPlaying.audioFile')}</span>
                        </div>
                        {cfg.showDownload && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onDownload}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                      
                      <AudioPlayer
                        src={audioUrl}
                        isLoading={isLoadingAudio}
                        onAudioElement={handleAudioElement}
                      />
                      
                      {/* Audio Visualizer */}
                      {cfg.showVisualizer && (
                        <AudioVisualizer key={audioUrl || ''} audioElement={audioEl} className="rounded-lg" showLUFS={cfg.showLUFS} showDBFS={cfg.showDBFS} />
                      )}
                      
                      {/* Stem Separation */}
                      {cfg.showStemSeparation && (
                        <StemSeparationPanel 
                          submissionId={submission.id}
                          hasAudioFile={!!submission.audio_file_url}
                        />
                      )}
                      
                    </div>
                  )}

                  {/* Spotify Embed - for Spotify links */}
                  {cfg.showSpotifyEmbed && submission.platform === 'spotify' && submission.song_url && (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-1">
                        {isLoadingSpotify ? (
                          <div className="flex items-center justify-center py-12 bg-card/50 rounded-lg">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
                      <a
                        href={submission.song_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('nowPlaying.openInSpotify')}
                      </a>
                    </div>
                  )}

                  {/* SoundCloud Embed - for SoundCloud links */}
                  {cfg.showSoundCloudEmbed && submission.platform === 'soundcloud' && submission.song_url && (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent p-1">
                        <iframe
                          width="100%"
                          height="166"
                          scrolling="no"
                          frameBorder="no"
                          allow="autoplay"
                          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(submission.song_url)}&color=%23f97316&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true`}
                          loading="lazy"
                          className="rounded-lg"
                        />
                      </div>
                      
                      {/* Open in SoundCloud */}
                      <a
                        href={submission.song_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-500/90 text-white font-medium text-sm transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in SoundCloud
                      </a>
                    </div>
                  )}

                  {/* Message */}
                  {cfg.showMessage && submission.message && (
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border/30">
                      <p className="text-sm text-muted-foreground italic">
                        "{submission.message}"
                      </p>
                    </div>
                  )}
                </div>

                {cfg.showSubmitterInsights && (
                <div className="rounded-xl border border-border/30 overflow-hidden">
                  <button
                    onClick={() => setInsightsExpanded(!insightsExpanded)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-card/50 hover:bg-card/70 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">{t('nowPlaying.submitterInsights')}</span>
                      {submitterStats && (
                        <span className="text-[10px] text-muted-foreground/60">
                          · {submitterStats.username || submission?.email?.split('@')[0] || 'Anonymous'}
                          · {submitterStats.total_submissions || 1} submission{(submitterStats.total_submissions || 1) !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {insightsExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
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
                        <div className="p-4 border-t border-border/30">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Spotify Artist Card - if Spotify submission */}
                            {submission?.platform === 'spotify' && (
                              <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                                 <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                   <Disc3 className="w-4 h-4 text-green-400" />
                                   {t('nowPlaying.artistProfile')}
                                </h3>
                                
                                {isLoadingSpotify ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-green-400" />
                                  </div>
                                ) : spotifyMeta ? (
                                  <div className="space-y-4">
                                    {spotifyMeta.artistImage && (
                                      <div className="aspect-square rounded-full overflow-hidden border-2 border-green-500/30 shadow-lg mx-auto w-24 h-24">
                                        <img
                                          src={spotifyMeta.artistImage}
                                          alt={`${spotifyMeta.artistName || submission.artist_name}`}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    
                                    <div className="text-center">
                                      <p className="font-semibold text-green-400 text-lg">
                                        {spotifyMeta.artistName 
                                          ? decodeHtmlEntities(spotifyMeta.artistName) 
                                          : submission.artist_name}
                                      </p>
                                      {spotifyMeta.monthlyListeners && (
                                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                                          <Users className="w-3 h-3" />
                                          {spotifyMeta.monthlyListeners} {t('nowPlaying.monthlyListeners')}
                                        </div>
                                      )}
                                    </div>

                                    {spotifyMeta.artistBio && (
                                      <div className="p-3 rounded-lg bg-card/50 border border-border/30">
                                        <p className="text-xs text-muted-foreground line-clamp-4">
                                          {spotifyMeta.artistBio}
                                        </p>
                                      </div>
                                    )}

                                    {spotifyMeta.artistTopTracks && spotifyMeta.artistTopTracks.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">{t('nowPlaying.topTracks')}</p>
                                        <div className="space-y-1">
                                          {spotifyMeta.artistTopTracks.slice(0, 5).map((track, index) => (
                                            <a
                                              key={index}
                                              href={track.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-green-500/10 transition-colors group"
                                            >
                                              <span className="text-[10px] text-muted-foreground w-4">{index + 1}</span>
                                              <Play className="w-3 h-3 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                              <span className="text-xs truncate flex-1">{track.name}</span>
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {spotifyMeta.artistSocialLinks && spotifyMeta.artistSocialLinks.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Links</p>
                                        <div className="flex flex-wrap gap-2">
                                          {spotifyMeta.artistSocialLinks.map((link, index) => (
                                            <a
                                              key={index}
                                              href={link.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card/50 border border-border/30 hover:border-green-500/30 hover:bg-green-500/10 transition-colors text-xs"
                                            >
                                              <span>{getSocialIcon(link.platform)}</span>
                                              <span>{link.platform}</span>
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {spotifyMeta.artistUrl && (
                                      <a
                                        href={spotifyMeta.artistUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1.5 text-xs text-green-400 hover:underline mt-2"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        {t('nowPlaying.viewArtistOnSpotify')}
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-muted-foreground text-sm">
                                    No artist data available
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Submitter Stats */}
                            <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <User className="w-4 h-4 text-primary" />
                                Submitter Details
                              </h3>
                              
                              {isLoadingStats ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                              ) : (
                                <div className="space-y-3">
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
                                        {submitterStats?.username || submission?.email?.split('@')[0] || 'Anonymous'}
                                      </p>
                                    </div>
                                  </div>

                                  {submission?.email && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start text-xs"
                                      onClick={handleCopyContact}
                                    >
                                      {copiedContact ? (
                                          <>
                                           <Check className="w-3 h-3 mr-2 text-green-500" />
                                           {t('nowPlaying.copied')}
                                         </>
                                       ) : (
                                         <>
                                           <Copy className="w-3 h-3 mr-2" />
                                           {t('nowPlaying.copyContact')}
                                        </>
                                      )}
                                    </Button>
                                  )}

                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
                                    <div className="text-center p-2 rounded-lg bg-secondary/30">
                                      <div className="flex items-center justify-center gap-1 text-primary mb-1">
                                        <Send className="w-3 h-3" />
                                      </div>
                                      <p className="text-lg font-bold">{submitterStats?.total_submissions || 1}</p>
                                      <p className="text-[10px] text-muted-foreground">{t('nowPlaying.submissions')}</p>
                                    </div>
                                    
                                    <div className="text-center p-2 rounded-lg bg-secondary/30">
                                      <div className="flex items-center justify-center gap-1 text-primary mb-1">
                                        <Calendar className="w-3 h-3" />
                                      </div>
                                      <p className="text-xs font-medium">
                                        {formatDate(submitterStats?.created_at || submission?.created_at || '')}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">{t('nowPlaying.submitted')}</p>
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

              {/* Review Actions */}
              {onStatusChange && submission && (
                <div className="px-6 py-4 border-t border-border/30 bg-card/30">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground mr-2">{t('nowPlaying.actions')}</span>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => onStatusChange(submission.id, 'reviewed')}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t('nowPlaying.done')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => onStatusChange(submission.id, 'skipped')}
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      {t('nowPlaying.skip')}
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive ml-auto"
                        onClick={() => onDelete(submission.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('nowPlaying.trash')}
                      </Button>
                    )}
                  </div>
                </div>
              )}

            {/* Visual accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
