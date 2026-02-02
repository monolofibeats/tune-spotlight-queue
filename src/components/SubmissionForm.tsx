import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music2, Sparkles, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MusicEmbed } from './MusicEmbed';
import { toast } from '@/hooks/use-toast';

type Platform = 'spotify' | 'apple-music' | 'soundcloud' | 'youtube' | 'other';

const detectPlatform = (url: string): Platform => {
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('music.apple.com')) return 'apple-music';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'other';
};

export function SubmissionForm() {
  const [songUrl, setSongUrl] = useState('');
  const [artistName, setArtistName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [message, setMessage] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const platform = songUrl ? detectPlatform(songUrl) : null;
  const showPreview = songUrl && (platform === 'spotify' || platform === 'soundcloud');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!songUrl || !submitterName) {
      toast({
        title: "Missing information",
        description: "Please fill in the required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Song submitted! 🎵",
      description: isPriority 
        ? "Your song has been added to the priority queue!" 
        : "Your song has been added to the queue.",
    });
    
    // Reset form
    setSongUrl('');
    setArtistName('');
    setSongTitle('');
    setSubmitterName('');
    setMessage('');
    setIsPriority(false);
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-2xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-strong rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Music2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-display font-semibold">Submit Your Song</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Song Link (Spotify, Apple Music, SoundCloud, etc.) *
              </label>
              <Input
                placeholder="https://open.spotify.com/track/..."
                value={songUrl}
                onChange={(e) => setSongUrl(e.target.value)}
                className="bg-background/50"
              />
              {platform && (
                <div className="mt-2">
                  <Badge variant="queue" className="text-xs">
                    {platform === 'apple-music' ? 'Apple Music' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Badge>
                </div>
              )}
            </div>

            {showPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="overflow-hidden"
              >
                <label className="text-sm text-muted-foreground mb-2 block">Preview</label>
                <MusicEmbed url={songUrl} platform={platform!} />
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Artist Name</label>
                <Input
                  placeholder="Artist name"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Song Title</label>
                <Input
                  placeholder="Song title"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Your Name *</label>
              <Input
                placeholder="How should we call you?"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Message (optional)</label>
              <Textarea
                placeholder="Why should we check out this song?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-background/50 min-h-[100px] resize-none rounded-lg border-border focus-visible:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Priority Upgrade */}
        <motion.div
          className={`glass rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer ${
            isPriority 
              ? 'border-amber-500/50 bg-amber-500/5' 
              : 'border-border hover:border-amber-500/30'
          }`}
          onClick={() => setIsPriority(!isPriority)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl transition-all ${isPriority ? 'bg-amber-500/20' : 'bg-secondary'}`}>
                <Sparkles className={`w-6 h-6 ${isPriority ? 'text-amber-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  Skip the Queue
                  <Badge variant="premium">$5</Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Get your song reviewed first with priority placement
                </p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
              isPriority 
                ? 'border-amber-500 bg-amber-500' 
                : 'border-muted-foreground'
            }`}>
              {isPriority && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              )}
            </div>
          </div>
        </motion.div>

        <Button
          type="submit"
          variant={isPriority ? 'premium' : 'hero'}
          size="xl"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              {isPriority ? 'Submit with Priority - $5' : 'Submit Song'}
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
