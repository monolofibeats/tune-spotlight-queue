import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Radio, Users, Music, TrendingUp, ExternalLink, Filter, ArrowLeft, Flame, Clock, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useActiveStreamers } from '@/hooks/useStreamer';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import type { Streamer } from '@/types/streamer';

const CONTENT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'music', label: 'Music' },
  { value: 'art', label: 'Art' },
  { value: 'games', label: 'Games' },
  { value: 'writing', label: 'Writing' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular', icon: Flame },
  { value: 'submissions', label: 'Most Submissions', icon: TrendingUp },
  { value: 'newest', label: 'Newest', icon: Clock },
  { value: 'live', label: 'Live Now', icon: Radio },
];

interface StreamerWithStats extends Streamer {
  submission_count: number;
}

const Browse = () => {
  const { streamers, isLoading } = useActiveStreamers();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [contentType, setContentType] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});

  // Fetch submission counts for all streamers
  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('streamer_id')
        .not('streamer_id', 'is', null);

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((sub) => {
          if (sub.streamer_id) {
            counts[sub.streamer_id] = (counts[sub.streamer_id] || 0) + 1;
          }
        });
        setSubmissionCounts(counts);
      }
    };
    fetchCounts();
  }, []);

  const streamersWithStats: StreamerWithStats[] = useMemo(() => {
    return streamers.map(s => ({
      ...s,
      submission_count: submissionCounts[s.id] || 0,
    }));
  }, [streamers, submissionCounts]);

  const filtered = useMemo(() => {
    let result = [...streamersWithStats];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.display_name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.bio && s.bio.toLowerCase().includes(q))
      );
    }

    // Content type filter
    if (contentType !== 'all') {
      result = result.filter(s => (s.submission_type || 'music') === contentType);
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => b.submission_count - a.submission_count || (b.is_live ? 1 : 0) - (a.is_live ? 1 : 0));
        break;
      case 'submissions':
        result.sort((a, b) => b.submission_count - a.submission_count);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'live':
        result.sort((a, b) => (b.is_live ? 1 : 0) - (a.is_live ? 1 : 0));
        break;
    }

    return result;
  }, [streamersWithStats, search, contentType, sortBy]);

  const liveCount = streamers.filter(s => s.is_live).length;
  const totalSubmissions = Object.values(submissionCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-14">
        {/* Hero */}
        <section className="py-12 px-4 border-b border-border/20">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold">Browse Streamers</h1>
                <p className="text-sm text-muted-foreground">Discover creators and submit your work for live review</p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/30">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-lg font-display font-bold">{streamers.length}</div>
                  <div className="text-[11px] text-muted-foreground">Streamers</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/30">
                <Radio className="w-4 h-4 text-destructive" />
                <div>
                  <div className="text-lg font-display font-bold">{liveCount}</div>
                  <div className="text-[11px] text-muted-foreground">Live Now</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/30">
                <Music className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-lg font-display font-bold">{totalSubmissions}</div>
                  <div className="text-[11px] text-muted-foreground">Total Submissions</div>
                </div>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search streamers by name, slug, or bio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Content type pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                  {CONTENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setContentType(type.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        contentType === type.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort tabs */}
              <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border/30 w-fit">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      sortBy === opt.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <opt.icon className="w-3 h-3" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Live Now Section */}
        {liveCount > 0 && sortBy !== 'live' && (
          <section className="py-8 px-4 border-b border-border/20 bg-destructive/[0.02]">
            <div className="container mx-auto max-w-6xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <h2 className="text-sm font-display font-semibold">Live Now</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {streamersWithStats
                  .filter(s => s.is_live)
                  .map((streamer, i) => (
                    <BrowseStreamerCard key={streamer.id} streamer={streamer} index={i} />
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* Main Feed */}
        <section className="py-8 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground">
                {filtered.length} streamer{filtered.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading streamers...</p>
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((streamer, index) => (
                  <BrowseStreamerCard key={streamer.id} streamer={streamer} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 rounded-xl border border-border/50 bg-card/30">
                <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No streamers found</h3>
                <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
                <Button variant="outline" size="sm" onClick={() => { setSearch(''); setContentType('all'); }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

function BrowseStreamerCard({ streamer, index }: { streamer: StreamerWithStats; index: number }) {
  const isLive = streamer.is_live;
  const contentLabel = streamer.submission_type
    ? streamer.submission_type.charAt(0).toUpperCase() + streamer.submission_type.slice(1)
    : 'Music';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        to={`/${streamer.slug}`}
        className={`group block p-5 rounded-xl border bg-card/30 hover:border-primary/30 transition-all duration-200 ${
          isLive ? 'border-destructive/40 hover:border-destructive/60' : 'border-border/50'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {streamer.avatar_url ? (
              <img
                src={streamer.avatar_url}
                alt={streamer.display_name}
                className="w-14 h-14 rounded-full object-cover ring-1 ring-border group-hover:ring-primary/30 transition-all"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <span className="text-xl font-display font-bold text-primary">
                  {streamer.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {isLive && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full border-2 border-background animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-semibold text-sm truncate">{streamer.display_name}</h3>
              {isLive && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                  LIVE
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {streamer.bio || 'Content reviewer on UpStar'}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50">
                <Music className="w-2.5 h-2.5" />
                {contentLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5" />
                {streamer.submission_count} submissions
              </span>
              <span className="font-mono text-muted-foreground/60">/{streamer.slug}</span>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2 mt-2">
              {streamer.twitch_url && <ExternalLink className="w-3 h-3 text-muted-foreground/40" />}
              {streamer.youtube_url && <ExternalLink className="w-3 h-3 text-muted-foreground/40" />}
              {streamer.instagram_url && <ExternalLink className="w-3 h-3 text-muted-foreground/40" />}
              {streamer.tiktok_url && <ExternalLink className="w-3 h-3 text-muted-foreground/40" />}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default Browse;
