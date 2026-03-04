import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Calendar, Clock, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface StreamerOfflineStateProps {
  streamerId: string;
  streamerName: string;
  offlineMessage?: string | null;
  nextStreamAt?: string | null;
  showOfflineSignup?: boolean;
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
  twitchUrl,
  youtubeUrl,
  tiktokUrl,
  instagramUrl,
  twitterUrl,
}: StreamerOfflineStateProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const socialLinks = [
    { name: 'Twitch', url: twitchUrl, color: 'hover:text-[#9146FF]', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
    )},
    { name: 'YouTube', url: youtubeUrl, color: 'hover:text-[#FF0000]', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
    )},
    { name: 'TikTok', url: tiktokUrl, color: 'hover:text-foreground', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
    )},
    { name: 'Instagram', url: instagramUrl, color: 'hover:text-[#E4405F]', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
    )},
    { name: 'X / Twitter', url: twitterUrl, color: 'hover:text-foreground', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    )},
  ].filter(s => s.url);

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
    
    const dateStr = nextStreamDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = nextStreamDate.toLocaleTimeString(undefined, {
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
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Next Stream</span>
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

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="px-6 pb-6 pt-2">
            <p className="text-xs text-muted-foreground mb-3 text-center">Follow {streamerName}</p>
            <div className="flex items-center justify-center gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2.5 rounded-xl bg-muted/30 border border-border/30 text-muted-foreground transition-all hover:scale-105 hover:bg-muted/50 ${link.color}`}
                  title={link.name}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
