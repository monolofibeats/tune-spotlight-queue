import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Calendar, Clock, ExternalLink, CheckCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { migrateLegacySocials, type SocialLink } from '@/lib/detectPlatform';

const PLATFORM_ICONS: Record<string, { icon: JSX.Element; color: string; label: string }> = {
  twitch: {
    label: 'Twitch',
    color: 'hover:text-[#9146FF] hover:border-[#9146FF]/30',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>,
  },
  youtube: {
    label: 'YouTube',
    color: 'hover:text-[#FF0000] hover:border-[#FF0000]/30',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  },
  tiktok: {
    label: 'TikTok',
    color: 'hover:text-foreground hover:border-foreground/30',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
  },
  instagram: {
    label: 'Instagram',
    color: 'hover:text-[#E4405F] hover:border-[#E4405F]/30',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  },
  twitter: {
    label: 'X',
    color: 'hover:text-foreground hover:border-foreground/30',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  spotify: {
    label: 'Spotify',
    color: 'hover:text-[#1DB954] hover:border-[#1DB954]/30',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
  },
  soundcloud: {
    label: 'SoundCloud',
    color: 'hover:text-[#FF5500] hover:border-[#FF5500]/30',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.057-.049-.1-.084-.1zm-.899.828c-.06 0-.091.038-.1.1L0 14.479l.176 1.317c.009.06.053.098.1.098.044 0 .09-.038.098-.098l.201-1.317-.2-1.326c-.009-.06-.055-.1-.1-.1zm1.818-1.154c-.064 0-.11.049-.117.111l-.222 2.469.222 2.404c.007.06.053.111.117.111.063 0 .11-.051.117-.111l.252-2.404-.252-2.469c-.007-.062-.054-.111-.117-.111zm.89-.27c-.073 0-.126.058-.133.126l-.213 2.739.213 2.586c.007.066.06.126.133.126.071 0 .124-.06.132-.126l.238-2.586-.238-2.739c-.008-.068-.061-.126-.132-.126zm.9-.237c-.083 0-.142.065-.148.14l-.2 2.976.2 2.717c.006.076.065.14.148.14.08 0 .14-.064.148-.14l.227-2.717-.227-2.976c-.008-.075-.068-.14-.148-.14zm.93-.175c-.09 0-.158.074-.163.154l-.188 3.151.188 2.8c.005.082.073.155.163.155.088 0 .155-.073.163-.155l.213-2.8-.213-3.151c-.008-.08-.075-.154-.163-.154zm.964-.097c-.1 0-.173.08-.178.168l-.176 3.248.176 2.853c.005.088.079.168.178.168.098 0 .172-.08.178-.168l.199-2.853-.199-3.248c-.006-.088-.08-.168-.178-.168zm1.032.017c-.11 0-.189.089-.193.182l-.164 3.131.164 2.876c.004.093.083.182.193.182.108 0 .187-.089.193-.182l.186-2.876-.186-3.131c-.006-.093-.085-.182-.193-.182zm1.065-.39c-.118 0-.203.096-.207.2l-.153 3.521.153 2.899c.004.102.089.199.207.199.116 0 .2-.097.207-.199l.173-2.899-.173-3.521c-.007-.104-.091-.2-.207-.2zm1.07-.078c-.128 0-.218.104-.221.214l-.141 3.6.141 2.912c.003.11.093.214.221.214.126 0 .216-.104.221-.214l.16-2.912-.16-3.6c-.005-.11-.095-.214-.221-.214zm1.066-.056c-.136 0-.234.11-.237.228l-.128 3.656.128 2.919c.003.118.101.228.237.228.134 0 .231-.11.237-.228l.146-2.919-.146-3.656c-.006-.118-.103-.228-.237-.228zm1.099-.043c-.146 0-.252.12-.255.24l-.116 3.699.116 2.924c.003.122.109.24.255.24.144 0 .249-.118.255-.24l.131-2.924-.131-3.699c-.006-.12-.111-.24-.255-.24zm4.498 2.422c-.27 0-.527.05-.769.142-.159-1.795-1.674-3.201-3.524-3.201-.477 0-.938.1-1.361.278-.158.066-.2.134-.202.268v6.33c.002.13.1.242.232.254h5.624c1.168 0 2.115-.956 2.115-2.135s-.947-2.136-2.115-2.136z"/></svg>,
  },
};

interface StreamerOfflineStateProps {
  streamerId: string;
  streamerName: string;
  offlineMessage?: string | null;
  nextStreamAt?: string | null;
  showOfflineSignup?: boolean;
  nextStreamPlatform?: string | null;
  offlineSocials?: SocialLink[] | string[];
  twitchUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
}

export function StreamerOfflineState({
  streamerId,
  streamerName,
  offlineMessage,
  nextStreamAt,
  showOfflineSignup = true,
  nextStreamPlatform,
  offlineSocials: rawOfflineSocials,
  twitchUrl,
  youtubeUrl,
  tiktokUrl,
  instagramUrl,
  twitterUrl,
}: StreamerOfflineStateProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Migrate legacy format if needed
  const socialLinks = migrateLegacySocials(rawOfflineSocials, { twitch_url: twitchUrl, youtube_url: youtubeUrl, tiktok_url: tiktokUrl, instagram_url: instagramUrl, twitter_url: twitterUrl });

  const platformLabels: Record<string, string> = {
    twitch: 'Twitch', youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram',
  };

  const handleSubscribe = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('streamer_subscribers' as any)
        .insert({ streamer_id: streamerId, email: email.trim().toLowerCase() } as any);

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'You\'re already subscribed! 🎉', description: 'We\'ll notify you when the stream goes live.' });
          setIsSubscribed(true);
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        toast({ title: 'Subscribed! 🔔', description: 'You\'ll get a notification when the stream goes live.' });
      }
    } catch (err) {
      console.error('Subscribe error:', err);
      toast({ title: 'Something went wrong', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStreamDate = nextStreamAt ? new Date(nextStreamAt) : null;
  const isNextStreamInFuture = nextStreamDate && nextStreamDate > new Date();

  const formatNextStream = () => {
    if (!nextStreamDate || !isNextStreamInFuture) return null;
    
    const now = new Date();
    const diff = nextStreamDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    const dateStr = nextStreamDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const timeStr = nextStreamDate.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    let relativeStr = '';
    if (days > 0) {
      relativeStr = `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      relativeStr = `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      relativeStr = 'very soon';
    }

    return { dateStr, timeStr, relativeStr };
  };

  const nextStream = formatNextStream();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 mb-4">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Currently Offline</span>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {offlineMessage || 'When the stream is active you can submit your songs here for review.'}
          </p>
        </div>

        {/* Next Stream */}
        {isNextStreamInFuture && nextStream && (
          <div className="mx-6 mb-4 rounded-xl bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                Next Stream{nextStreamPlatform && platformLabels[nextStreamPlatform] ? ` on ${platformLabels[nextStreamPlatform]}` : ''}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">{nextStream.dateStr}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {nextStream.timeStr}
              </span>
              <span className="text-xs text-primary font-medium">{nextStream.relativeStr}</span>
            </div>
          </div>
        )}

        {/* Email Signup */}
        {showOfflineSignup && (
          <div className="px-6 pb-4">
            {isSubscribed ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/5 border border-primary/20">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">You'll be notified when the stream goes live!</span>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Bell className="w-3 h-3" />
                  Get notified when {streamerName} goes live
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleSubscribe}
                    disabled={isSubmitting || !email.trim()}
                    className="h-9 px-4"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Notify Me'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Follow / Social Links */}
        {socialLinks.length > 0 && (
          <div className="px-6 pb-6 pt-2">
            <p className="text-xs text-muted-foreground mb-3 text-center">Follow {streamerName}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {socialLinks.map((link, idx) => {
                const platformInfo = PLATFORM_ICONS[link.platform];
                return (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/30 border border-border/30 text-muted-foreground text-xs font-medium transition-all hover:scale-105 hover:bg-muted/50 ${platformInfo?.color || 'hover:text-primary hover:border-primary/30'}`}
                    title={platformInfo?.label || link.platform}
                  >
                    {platformInfo?.icon || <LinkIcon className="w-4 h-4" />}
                    <span>{platformInfo?.label || 'Follow'}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
