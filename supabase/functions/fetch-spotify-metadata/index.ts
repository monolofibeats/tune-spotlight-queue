import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.25.76";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const requestSchema = z.object({
  url: z.string().url().max(2000),
});

interface TopTrack {
  name: string;
  url: string;
}

interface SocialLink {
  platform: string;
  url: string;
}

interface SpotifyMetadata {
  songTitle?: string;
  artistName?: string;
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

const extractDataFromEmbedHtml = (html: string): Partial<SpotifyMetadata> => {
  const result: Partial<SpotifyMetadata> = {};

  const byTestId = html.match(/data-testid="creator-link"[^>]*>([^<]+)</i);
  if (byTestId?.[1]) result.artistName = byTestId[1].trim();

  if (!result.artistName) {
    const byArtistHref = html.match(/href="https:\/\/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)[^"]*"[^>]*>([^<]+)<\/a>/i);
    if (byArtistHref?.[2]) {
      result.artistName = byArtistHref[2].trim();
      result.artistId = byArtistHref[1];
      result.artistUrl = `https://open.spotify.com/artist/${byArtistHref[1]}`;
    }
  }

  if (!result.artistId) {
    const artistIdMatch = html.match(/href="https:\/\/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/i);
    if (artistIdMatch?.[1]) {
      result.artistId = artistIdMatch[1];
      result.artistUrl = `https://open.spotify.com/artist/${artistIdMatch[1]}`;
    }
  }

  const byArtistsJson = html.match(/"artists"\s*:\s*\[\s*\{\s*"name"\s*:\s*"([^"]+)"/i);
  if (!result.artistName && byArtistsJson?.[1]) result.artistName = byArtistsJson[1].trim();

  const coverMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                     html.match(/name="og:image"\s+content="([^"]+)"/i) ||
                     html.match(/"image"\s*:\s*"([^"]+)"/i);
  if (coverMatch?.[1]) result.albumArt = coverMatch[1];

  const albumMatch = html.match(/"album"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/i);
  if (albumMatch?.[1]) result.albumName = albumMatch[1].trim();

  return result;
};

const detectPlatform = (url: string): string => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('instagram.com')) return 'Instagram';
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'Twitter';
  if (lowerUrl.includes('facebook.com')) return 'Facebook';
  if (lowerUrl.includes('youtube.com')) return 'YouTube';
  if (lowerUrl.includes('tiktok.com')) return 'TikTok';
  if (lowerUrl.includes('soundcloud.com')) return 'SoundCloud';
  if (lowerUrl.includes('wikipedia.org')) return 'Wikipedia';
  return 'Website';
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const fetchArtistFromEmbed = async (artistId: string): Promise<Partial<SpotifyMetadata>> => {
  const result: Partial<SpotifyMetadata> = {};
  try {
    const artistEmbedUrl = `https://open.spotify.com/embed/artist/${artistId}`;
    const response = await fetch(artistEmbedUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) return result;

    const html = await response.text();
    const artistImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                             html.match(/name="og:image"\s+content="([^"]+)"/i);
    if (artistImageMatch?.[1]) result.artistImage = artistImageMatch[1];

    const resourceMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/i);
    if (resourceMatch?.[1]) {
      try {
        const jsonData = JSON.parse(resourceMatch[1]);
        const props = jsonData?.props?.pageProps;
        if (props?.state?.data?.entity) {
          const entity = props.state.data.entity;
          if (entity.name) result.artistName = entity.name;
          if (entity.visuals?.avatarImage?.sources?.[0]?.url) result.artistImage = entity.visuals.avatarImage.sources[0].url;
          if (entity.profile?.biography?.text) result.artistBio = entity.profile.biography.text;
          if (entity.stats?.monthlyListeners) result.monthlyListeners = formatNumber(entity.stats.monthlyListeners);
          if (entity.discography?.topTracks?.items) {
            result.artistTopTracks = entity.discography.topTracks.items.slice(0, 5).map((item: any) => ({
              name: item.track?.name || item.name,
              url: `https://open.spotify.com/track/${(item.track?.uri || item.uri || '').split(':').pop()}`,
            }));
          }
          if (entity.profile?.externalLinks?.items) {
            result.artistSocialLinks = entity.profile.externalLinks.items.map((link: any) => ({
              platform: link.name || detectPlatform(link.url),
              url: link.url,
            }));
          }
        }
      } catch (e) {
        console.error('Failed to parse artist embed JSON:', e);
      }
    }

    const inlineDataMatch = html.match(/Spotify\.Entity\s*=\s*({[^;]+});/i) ||
                            html.match(/"entity"\s*:\s*({[^}]+})/i);
    if (inlineDataMatch?.[1] && !result.artistBio) {
      try {
        const entityData = JSON.parse(inlineDataMatch[1]);
        if (entityData.biography) {
          result.artistBio = typeof entityData.biography === 'string'
            ? entityData.biography
            : entityData.biography.text;
        }
      } catch (e) { /* ignore */ }
    }
  } catch (error) {
    console.error('Error fetching artist embed:', error);
  }
  return result;
};

const fetchArtistOembed = async (artistId: string): Promise<Partial<SpotifyMetadata>> => {
  const result: Partial<SpotifyMetadata> = {};
  try {
    const artistUrl = `https://open.spotify.com/artist/${artistId}`;
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(artistUrl)}`;
    const response = await fetch(oembedUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "accept": "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.thumbnail_url) result.artistImage = data.thumbnail_url;
      if (data.title) result.artistName = data.title;
    }
  } catch (error) {
    console.error('Error fetching artist oEmbed:', error);
  }
  return result;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit: 20 requests per 60 seconds
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitResult = await checkRateLimit(clientIp, "fetch-spotify-metadata", 20, 60);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(corsHeaders, rateLimitResult.retryAfterSeconds);
    }

    const raw = await req.json();
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // quick=true skips artist profile fetching (used by form autofill)
    const quickMode = raw.quick === true;

    const { url } = parsed.data;
    const result: SpotifyMetadata = {};

    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        accept: "application/json",
      },
    });

    if (!oembedRes.ok) {
      return new Response(
        JSON.stringify({ error: `Spotify oEmbed failed (${oembedRes.status})` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }

    const oembed = await oembedRes.json();
    result.songTitle = oembed?.title;
    if (oembed?.thumbnail_url) result.albumArt = oembed.thumbnail_url;

    const iframeUrl: string | undefined = oembed?.iframe_url;
    if (iframeUrl) {
      const embedRes = await fetch(iframeUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (embedRes.ok) {
        const embedHtml = await embedRes.text();
        const extracted = extractDataFromEmbedHtml(embedHtml);
        if (extracted.artistName) result.artistName = extracted.artistName;
        if (extracted.artistId) result.artistId = extracted.artistId;
        if (extracted.artistUrl) result.artistUrl = extracted.artistUrl;
        if (extracted.albumName) result.albumName = extracted.albumName;
        if (extracted.albumArt && !result.albumArt) result.albumArt = extracted.albumArt;
      }
    }

    if (result.artistId && !quickMode) {
      const artistOembed = await fetchArtistOembed(result.artistId);
      if (artistOembed.artistImage) result.artistImage = artistOembed.artistImage;

      const artistEmbed = await fetchArtistFromEmbed(result.artistId);
      if (artistEmbed.artistImage && !result.artistImage) result.artistImage = artistEmbed.artistImage;
      if (artistEmbed.artistBio) result.artistBio = artistEmbed.artistBio;
      if (artistEmbed.artistTopTracks) result.artistTopTracks = artistEmbed.artistTopTracks;
      if (artistEmbed.artistSocialLinks) result.artistSocialLinks = artistEmbed.artistSocialLinks;
      if (artistEmbed.monthlyListeners) result.monthlyListeners = artistEmbed.monthlyListeners;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Edge function error:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
