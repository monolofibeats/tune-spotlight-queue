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

      {/* Streaming Platforms */}
      <div className="space-y-4">
        <Label>Streaming Platforms (at least one required)</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="twitch" className="text-sm text-muted-foreground">
              Twitch Channel URL
            </Label>
            <Input
              id="twitch"
              value={twitchUrl}
              onChange={(e) => setTwitchUrl(e.target.value)}
              placeholder="https://twitch.tv/yourname"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="youtube" className="text-sm text-muted-foreground">
              YouTube Channel URL
            </Label>
            <Input
              id="youtube"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@yourname"
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
