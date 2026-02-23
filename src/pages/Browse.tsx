import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useActiveStreamers } from '@/hooks/useStreamer';
import { supabase } from '@/integrations/supabase/client';
import type { Streamer } from '@/types/streamer';

const CONTENT_TYPES = [
  { value: 'music', label: '🎵 Music', description: 'Submit beats, tracks & songs for live review' },
  { value: 'art', label: '🎨 Art', description: 'Get your visual art critiqued on stream' },
  { value: 'games', label: '🎮 Games', description: 'Share indie games & game design for feedback' },
  { value: 'writing', label: '✍️ Writing', description: 'Poems, lyrics & stories reviewed live' },
  { value: 'other', label: '✨ Other', description: 'All other creative submissions' },
];

// Placeholder cards shown when a category has no real streamers yet
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

  // Fetch looping video URLs for all streamers
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

  // Group by content type
  const grouped = useMemo(() => {
    const groups: Record<string, StreamerWithVideo[]> = {};
    CONTENT_TYPES.forEach(ct => {
      groups[ct.value] = filtered.filter(s => (s.submission_type || 'music') === ct.value);
    });
    return groups;
  }, [filtered]);

  // Always show all categories (real + placeholders when empty)
  const allCategories = CONTENT_TYPES;
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

        {/* Category Feeds */}
        <div className="py-6 px-4">
          <div className="container mx-auto max-w-5xl space-y-10">
            {isLoading ? (
              <div className="text-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading streamers...</p>
              </div>
            ) : activeCategories.length > 0 ? (
              activeCategories.map((category) => (
                <CategorySection
                  key={category.value}
                  label={category.label}
                  streamers={grouped[category.value]}
                />
              ))
            ) : (
              <div className="text-center py-20 rounded-xl border border-border/50 bg-card/30">
                <h3 className="text-lg font-semibold mb-2">No streamers found</h3>
                <p className="text-sm text-muted-foreground mb-4">Try a different search term</p>
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

function CategorySection({ label, streamers }: { label: string; streamers: StreamerWithVideo[] }) {
  return (
    <section>
      <h2 className="text-lg font-display font-bold mb-4 text-foreground/90">{label}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {streamers.map((streamer, index) => (
          <StreamerCard key={streamer.id} streamer={streamer} index={index} />
        ))}
      </div>
    </section>
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
        {/* Media area */}
        <div className="relative aspect-video bg-muted/30 overflow-hidden">
          {isLive ? (
            /* LIVE state — pulsing overlay */
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
            /* Offline with looping video */
            <video
              src={streamer.video_url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : streamer.avatar_url ? (
            /* Offline fallback — avatar */
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <img
                src={streamer.avatar_url}
                alt={streamer.display_name}
                className="w-20 h-20 rounded-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
            </div>
          ) : (
            /* Offline fallback — initial */
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <span className="text-4xl font-display font-bold text-muted-foreground/30">
                {streamer.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Info bar */}
        <div className="p-3">
          <div className="flex items-center gap-2">
            {!isLive && streamer.avatar_url && (
              <img
                src={streamer.avatar_url}
                alt=""
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
            )}
            <span className="font-display font-semibold text-sm truncate">
              {streamer.display_name}
            </span>
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
