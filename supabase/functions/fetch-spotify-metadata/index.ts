import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.25.76";

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

  // Extract artist name - Most reliable (currently): creator link testid
  const byTestId = html.match(/data-testid="creator-link"[^>]*>([^<]+)</i);
  if (byTestId?.[1]) result.artistName = byTestId[1].trim();

  // Generic: first artist link - clean up the ID
  if (!result.artistName) {
    const byArtistHref = html.match(/href="https:\/\/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)[^"]*"[^>]*>([^<]+)<\/a>/i);
    if (byArtistHref?.[2]) {
      result.artistName = byArtistHref[2].trim();
      result.artistId = byArtistHref[1]; // Only the clean ID
      result.artistUrl = `https://open.spotify.com/artist/${byArtistHref[1]}`;
    }
  }

  // Extract artist ID if not already found - ensure clean ID
  if (!result.artistId) {
    const artistIdMatch = html.match(/href="https:\/\/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/i);
    if (artistIdMatch?.[1]) {
      result.artistId = artistIdMatch[1];
      result.artistUrl = `https://open.spotify.com/artist/${artistIdMatch[1]}`;
    }
  }

  // Sometimes embedded JSON exists with more info
  const byArtistsJson = html.match(/"artists"\s*:\s*\[\s*\{\s*"name"\s*:\s*"([^"]+)"/i);
  if (!result.artistName && byArtistsJson?.[1]) result.artistName = byArtistsJson[1].trim();

  // Try to extract album art from the embed page (cover image)
  const coverMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                     html.match(/name="og:image"\s+content="([^"]+)"/i) ||
                     html.match(/"image"\s*:\s*"([^"]+)"/i);
  if (coverMatch?.[1]) result.albumArt = coverMatch[1];

  // Extract album name
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
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

// Try to fetch artist data from Spotify's embed endpoint
const fetchArtistFromEmbed = async (artistId: string): Promise<Partial<SpotifyMetadata>> => {
  const result: Partial<SpotifyMetadata> = {};
  
  try {
    // Try the artist embed page - this sometimes contains more data
    const artistEmbedUrl = `https://open.spotify.com/embed/artist/${artistId}`;
    console.log(`Fetching artist embed: ${artistEmbedUrl}`);
    
    const response = await fetch(artistEmbedUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch artist embed: ${response.status}`);
      return result;
    }

    const html = await response.text();
    
    // Extract artist image from og:image
    const artistImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                             html.match(/name="og:image"\s+content="([^"]+)"/i);
    if (artistImageMatch?.[1]) {
      result.artistImage = artistImageMatch[1];
      console.log(`Found artist image: ${result.artistImage}`);
    }

    // Try to find embedded resource data
    const resourceMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/i);
    if (resourceMatch?.[1]) {
      try {
        const jsonData = JSON.parse(resourceMatch[1]);
        console.log('Found __NEXT_DATA__ in artist embed');
        
        // Navigate through the JSON to find artist data
        const props = jsonData?.props?.pageProps;
        if (props?.state?.data?.entity) {
          const entity = props.state.data.entity;
          
          // Artist name
          if (entity.name) {
            result.artistName = entity.name;
          }
          
          // Profile image
          if (entity.visuals?.avatarImage?.sources?.[0]?.url) {
            result.artistImage = entity.visuals.avatarImage.sources[0].url;
          }
          
          // Biography
          if (entity.profile?.biography?.text) {
            result.artistBio = entity.profile.biography.text;
          }
          
          // Monthly listeners
          if (entity.stats?.monthlyListeners) {
            result.monthlyListeners = formatNumber(entity.stats.monthlyListeners);
          }
          
          // Top tracks
          if (entity.discography?.topTracks?.items) {
            result.artistTopTracks = entity.discography.topTracks.items.slice(0, 5).map((item: any) => ({
              name: item.track?.name || item.name,
              url: `https://open.spotify.com/track/${(item.track?.uri || item.uri || '').split(':').pop()}`,
            }));
          }
          
          // External links
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

    // Also look for inline script data
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
      } catch (e) {
        // Ignore parse errors
      }
    }

  } catch (error) {
    console.error('Error fetching artist embed:', error);
  }

  return result;
};

// Fetch from Spotify's oEmbed for artist
const fetchArtistOembed = async (artistId: string): Promise<Partial<SpotifyMetadata>> => {
  const result: Partial<SpotifyMetadata> = {};
  
  try {
    const artistUrl = `https://open.spotify.com/artist/${artistId}`;
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(artistUrl)}`;
    console.log(`Fetching artist oEmbed: ${oembedUrl}`);
    
    const response = await fetch(oembedUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "accept": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Artist oEmbed response:', JSON.stringify(data));
      
      if (data.thumbnail_url) {
        result.artistImage = data.thumbnail_url;
      }
      if (data.title) {
        result.artistName = data.title;
      }
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
    const raw = await req.json();
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const { url } = parsed.data;
    const result: SpotifyMetadata = {};

    // 1) oEmbed: provides title + thumbnail_url + iframe_url
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    console.log(`Fetching track oEmbed: ${oembedUrl}`);
    
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
    
    if (oembed?.thumbnail_url) {
      result.albumArt = oembed.thumbnail_url;
    }

    // 2) Fetch embed HTML to get artist ID
    const iframeUrl: string | undefined = oembed?.iframe_url;
    if (iframeUrl) {
      console.log(`Fetching track embed: ${iframeUrl}`);
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

    // 3) Fetch additional artist data
    if (result.artistId) {
      console.log(`Fetching artist data for: ${result.artistId}`);
      
      // Try oEmbed for artist image first (most reliable)
      const artistOembed = await fetchArtistOembed(result.artistId);
      if (artistOembed.artistImage) result.artistImage = artistOembed.artistImage;
      
      // Try embed page for more detailed data
      const artistEmbed = await fetchArtistFromEmbed(result.artistId);
      if (artistEmbed.artistImage && !result.artistImage) result.artistImage = artistEmbed.artistImage;
      if (artistEmbed.artistBio) result.artistBio = artistEmbed.artistBio;
      if (artistEmbed.artistTopTracks) result.artistTopTracks = artistEmbed.artistTopTracks;
      if (artistEmbed.artistSocialLinks) result.artistSocialLinks = artistEmbed.artistSocialLinks;
      if (artistEmbed.monthlyListeners) result.monthlyListeners = artistEmbed.monthlyListeners;
    }

    console.log('Final result:', JSON.stringify(result));
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
