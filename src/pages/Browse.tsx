import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft, Music, Palette, Gamepad2, PenTool, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useActiveStreamers } from '@/hooks/useStreamer';
import { supabase } from '@/integrations/supabase/client';
import type { Streamer } from '@/types/streamer';

const CONTENT_TYPES = [
  { value: 'music', label: 'Music', icon: Music, description: 'Submit beats, tracks & songs for live review' },
  { value: 'art', label: 'Art', icon: Palette, description: 'Get your visual art critiqued on stream' },
  { value: 'games', label: 'Games', icon: Gamepad2, description: 'Share indie games & game design for feedback' },
  { value: 'writing', label: 'Writing', icon: PenTool, description: 'Poems, lyrics & stories reviewed live' },
  { value: 'other', label: 'Other', icon: Sparkles, description: 'All other creative submissions' },
];

const PLACEHOLDER_STREAMERS: Record<string, Array<{ name: string; bio: string }>> = {
  music: [
    { name: 'BeatReviewr', bio: 'Hip-hop & trap beat reactions' },
    { name: 'MelodyCheck', bio: 'Pop & R&B song reviews' },
    { name: 'BassDrop Live', bio: 'Electronic & EDM critiques' },
  ],
  art: [
    { name: 'SketchCritic', bio: 'Digital art & illustration feedback' },
    { name: 'Canvas Live', bio: 'Painting & mixed media reviews' },
  ],
  games: [
    { name: 'IndieSpotlight', bio: 'Indie game playtests & feedback' },
    { name: 'GameDevReview', bio: 'Game design critique sessions' },
  ],
  writing: [
    { name: 'WordSmith Live', bio: 'Poetry & lyrics deep dives' },
    { name: 'StoryStream', bio: 'Short fiction & creative writing' },
  ],
  other: [
    { name: 'CreativeHub', bio: 'Podcasts, videos & more' },
  ],
};

interface StreamerWithVideo extends Streamer {
  video_url?: string | null;
}

const Browse = () => {
  const { streamers, isLoading } = useActiveStreamers();
  const [search, setSearch] = useState('');
  const [videoUrls, setVideoUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from('stream_config')
        .select('streamer_id, video_url, stream_type')
        .eq('is_active', true);

      if (data) {
        const urls: Record<string, string | null> = {};
        data.forEach((cfg) => {
          if (cfg.streamer_id && cfg.video_url) {
            urls[cfg.streamer_id] = cfg.video_url;
          }
        });
        setVideoUrls(urls);
      }
    };
    fetchVideos();
  }, []);

  const enrichedStreamers: StreamerWithVideo[] = useMemo(() => {
    return streamers.map(s => ({
      ...s,
      video_url: videoUrls[s.id] || null,
    }));
  }, [streamers, videoUrls]);

  const filtered = useMemo(() => {
    if (!search.trim()) return enrichedStreamers;
    const q = search.toLowerCase();
    return enrichedStreamers.filter(s =>
      s.display_name.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      (s.bio && s.bio.toLowerCase().includes(q))
    );
  }, [enrichedStreamers, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, StreamerWithVideo[]> = {};
    CONTENT_TYPES.forEach(ct => {
      groups[ct.value] = filtered.filter(s => (s.submission_type || 'music') === ct.value);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-14">
        <section className="py-8 px-4 border-b border-border/20">
          <div className="container mx-auto max-w-5xl">
            <div className="flex items-center gap-3 mb-6">
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Browse Streamers</h1>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or genre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>
        </section>

        <div className="py-6 px-4">
          <div className="container mx-auto max-w-5xl space-y-12">
            {isLoading ? (
              <div className="text-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading streamers...</p>
              </div>
            ) : (
              CONTENT_TYPES.map((category) => (
                <CategorySection
                  key={category.value}
                  label={category.label}
                  icon={category.icon}
                  description={category.description}
                  streamers={grouped[category.value]}
                  placeholders={PLACEHOLDER_STREAMERS[category.value] || []}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

function CategorySection({
  label,
  description,
  streamers,
  placeholders,
}: {
  label: string;
  description: string;
  streamers: StreamerWithVideo[];
  placeholders: Array<{ name: string; bio: string }>;
}) {
  const hasReal = streamers.length > 0;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-display font-bold text-foreground">{label}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasReal
          ? streamers.map((streamer, index) => (
              <StreamerCard key={streamer.id} streamer={streamer} index={index} />
            ))
          : placeholders.map((ph, index) => (
              <PlaceholderCard key={ph.name} name={ph.name} bio={ph.bio} index={index} />
            ))}
      </div>
    </section>
  );
}

function PlaceholderCard({ name, bio, index }: { name: string; bio: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
    >
      <div className="block rounded-xl overflow-hidden border border-dashed border-border/60 bg-card/20 opacity-60">
        <div className="relative aspect-video bg-muted/20 flex items-center justify-center">
          <span className="text-4xl font-display font-bold text-muted-foreground/20">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-muted/40 text-[10px] text-muted-foreground">
            Coming soon
          </div>
        </div>
        <div className="p-3">
          <span className="font-display font-semibold text-sm text-muted-foreground">{name}</span>
          <p className="text-xs text-muted-foreground/60 mt-1">{bio}</p>
        </div>
      </div>
    </motion.div>
  );
}

function StreamerCard({ streamer, index }: { streamer: StreamerWithVideo; index: number }) {
  const isLive = !!streamer.is_live;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link
        to={`/${streamer.slug}`}
        className="group block rounded-xl overflow-hidden border border-border/50 bg-card/40 hover:border-primary/40 transition-all duration-200"
      >
        <div className="relative aspect-video bg-muted/30 overflow-hidden">
          {isLive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-primary/20 to-primary/5">
              {streamer.avatar_url ? (
                <img
                  src={streamer.avatar_url}
                  alt={streamer.display_name}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-destructive/60 mb-3"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-destructive/60 mb-3">
                  <span className="text-2xl font-display font-bold text-primary">
                    {streamer.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-lg font-display font-bold">{streamer.display_name}</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                </span>
                <span className="text-sm font-bold text-destructive tracking-wider uppercase">Live</span>
              </div>
            </div>
          ) : streamer.video_url ? (
            <video
              src={streamer.video_url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : streamer.avatar_url ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <img
                src={streamer.avatar_url}
                alt={streamer.display_name}
                className="w-20 h-20 rounded-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <span className="text-4xl font-display font-bold text-muted-foreground/30">
                {streamer.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2">
            {!isLive && streamer.avatar_url && (
              <img src={streamer.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
            )}
            <span className="font-display font-semibold text-sm truncate">{streamer.display_name}</span>
          </div>
          {streamer.bio && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{streamer.bio}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default Browse;
