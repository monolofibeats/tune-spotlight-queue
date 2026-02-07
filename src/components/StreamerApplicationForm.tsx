import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, User, Mail, Link as LinkIcon, MessageSquare, Check, Instagram, Music, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface StreamerApplicationFormProps {
  onSuccess?: () => void;
}

export function StreamerApplicationForm({ onSuccess }: StreamerApplicationFormProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [desiredSlug, setDesiredSlug] = useState('');
  const [twitchUrl, setTwitchUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [applicationMessage, setApplicationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Generate slug from display name
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!desiredSlug || desiredSlug === generateSlug(displayName)) {
      setDesiredSlug(generateSlug(value));
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim() || !email.trim() || !desiredSlug.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const hasAtLeastOnePlatform = twitchUrl || youtubeUrl || tiktokUrl || instagramUrl || spotifyUrl || twitterUrl || websiteUrl;
    if (!hasAtLeastOnePlatform) {
      toast({
        title: "Platform required",
        description: "Please provide at least one social or streaming platform link.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('streamer_applications')
        .insert({
          display_name: displayName.trim(),
          email: email.trim().toLowerCase(),
          desired_slug: desiredSlug.trim().toLowerCase(),
          twitch_url: twitchUrl.trim() || null,
          youtube_url: youtubeUrl.trim() || null,
          tiktok_url: tiktokUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          spotify_url: spotifyUrl.trim() || null,
          twitter_url: twitterUrl.trim() || null,
          website_url: websiteUrl.trim() || null,
          application_message: applicationMessage.trim() || null,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This username or email has already been used in an application.');
        }
        throw error;
      }

      setIsSubmitted(true);
      toast({
        title: "Application submitted! 🎉",
        description: "We'll review your application and get back to you within 24-48 hours.",
      });
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit application';
      toast({
        title: "Submission failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Application Submitted!</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Thank you for applying to join UpStar. We'll review your application and contact you at <strong>{email}</strong> within 24-48 hours.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Display Name *
          </Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            placeholder="Your streamer name"
            required
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>
      </div>

      {/* Desired Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug" className="flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          Your Profile URL *
        </Label>
        <div className="flex items-center">
          <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0 border-input">
            upstar.gg/
          </span>
          <Input
            id="slug"
            value={desiredSlug}
            onChange={(e) => setDesiredSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="yourname"
            className="rounded-l-none"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This will be your unique profile URL. Only lowercase letters, numbers, and hyphens.
        </p>
      </div>

      {/* Streaming & Social Platforms */}
      <div className="space-y-4">
        <Label>Platforms & Social Links (at least one required)</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Twitch */}
          <div className="space-y-2">
            <Label htmlFor="twitch" className="text-sm text-muted-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
              </svg>
              Twitch
            </Label>
            <Input
              id="twitch"
              value={twitchUrl}
              onChange={(e) => setTwitchUrl(e.target.value)}
              placeholder="https://twitch.tv/yourname"
            />
          </div>

          {/* YouTube */}
          <div className="space-y-2">
            <Label htmlFor="youtube" className="text-sm text-muted-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube
            </Label>
            <Input
              id="youtube"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@yourname"
            />
          </div>

          {/* TikTok */}
          <div className="space-y-2">
            <Label htmlFor="tiktok" className="text-sm text-muted-foreground flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
              TikTok
            </Label>
            <Input
              id="tiktok"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              placeholder="https://tiktok.com/@yourname"
            />
          </div>

          {/* Instagram */}
          <div className="space-y-2">
            <Label htmlFor="instagram" className="text-sm text-muted-foreground flex items-center gap-2">
              <Instagram className="w-4 h-4 text-pink-500" />
              Instagram
            </Label>
            <Input
              id="instagram"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/yourname"
            />
          </div>

          {/* Spotify */}
          <div className="space-y-2">
            <Label htmlFor="spotify" className="text-sm text-muted-foreground flex items-center gap-2">
              <Music className="w-4 h-4 text-green-500" />
              Spotify
            </Label>
            <Input
              id="spotify"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="https://open.spotify.com/artist/..."
            />
          </div>

          {/* Twitter/X */}
          <div className="space-y-2">
            <Label htmlFor="twitter" className="text-sm text-muted-foreground flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X (Twitter)
            </Label>
            <Input
              id="twitter"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              placeholder="https://x.com/yourname"
            />
          </div>

          {/* Website */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website" className="text-sm text-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              Website / Other
            </Label>
            <Input
              id="website"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>
      </div>

      {/* Application Message */}
      <div className="space-y-2">
        <Label htmlFor="message" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Tell us about yourself
        </Label>
        <Textarea
          id="message"
          value={applicationMessage}
          onChange={(e) => setApplicationMessage(e.target.value)}
          placeholder="What kind of content do you create? Why do you want to join UpStar? Any experience with music reviews?"
          rows={4}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Submit Application
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By submitting this application, you agree to our terms of service and community guidelines.
      </p>
    </form>
  );
}
