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
  // Artist profile data
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

  // Generic: first artist link
  if (!result.artistName) {
    const byArtistHref = html.match(/href="https:\/\/open\.spotify\.com\/artist\/([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (byArtistHref?.[2]) {
      result.artistName = byArtistHref[2].trim();
      result.artistId = byArtistHref[1].split('?')[0];
      result.artistUrl = `https://open.spotify.com/artist/${byArtistHref[1].split('?')[0]}`;
    }
  }

  // Extract artist ID if not already found
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

const fetchArtistPageData = async (artistId: string): Promise<Partial<SpotifyMetadata>> => {
  const result: Partial<SpotifyMetadata> = {};
  
  try {
    // Fetch the artist page
    const artistPageUrl = `https://open.spotify.com/artist/${artistId}`;
    const response = await fetch(artistPageUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch artist page: ${response.status}`);
      return result;
    }

    const html = await response.text();

    // Extract artist image from og:image
    const artistImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                             html.match(/name="og:image"\s+content="([^"]+)"/i);
    if (artistImageMatch?.[1]) {
      result.artistImage = artistImageMatch[1];
    }

    // Extract monthly listeners
    const listenersMatch = html.match(/(\d[\d,\.]+)\s*monthly\s*listeners/i);
    if (listenersMatch?.[1]) {
      result.monthlyListeners = listenersMatch[1];
    }

    // Try to extract data from embedded JSON in the page
    const scriptDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/i) ||
                            html.match(/<script[^>]*type="application\/json"[^>]*>([^<]+)<\/script>/i);
    
    if (scriptDataMatch?.[1]) {
      try {
        const jsonData = JSON.parse(scriptDataMatch[1]);
        
        // Try to find artist data in various possible locations
        const findArtistData = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return null;
          
          // Look for artist profile
          if (obj.profile && obj.profile.biography) {
            return obj;
          }
          if (obj.artistUnion || obj.artist) {
            return obj.artistUnion || obj.artist;
          }
          
          // Recursive search
          for (const key of Object.keys(obj)) {
            const found = findArtistData(obj[key]);
            if (found) return found;
          }
          return null;
        };

        const artistData = findArtistData(jsonData);
        
        if (artistData) {
          // Extract biography
          if (artistData.profile?.biography?.text) {
            result.artistBio = artistData.profile.biography.text;
          } else if (artistData.biography) {
            result.artistBio = typeof artistData.biography === 'string' 
              ? artistData.biography 
              : artistData.biography.text;
          }

          // Extract top tracks
          if (artistData.discography?.topTracks?.items) {
            result.artistTopTracks = artistData.discography.topTracks.items
              .slice(0, 5)
              .map((track: any) => ({
                name: track.track?.name || track.name,
                url: track.track?.uri 
                  ? `https://open.spotify.com/track/${track.track.uri.split(':').pop()}`
                  : `https://open.spotify.com/track/${track.id}`,
              }));
          }

          // Extract external links / social links
          if (artistData.profile?.externalLinks?.items) {
            result.artistSocialLinks = artistData.profile.externalLinks.items.map((link: any) => ({
              platform: link.name || detectPlatform(link.url),
              url: link.url,
            }));
          } else if (artistData.externalLinks) {
            result.artistSocialLinks = artistData.externalLinks.map((link: any) => ({
              platform: link.name || detectPlatform(link.url),
              url: link.url,
            }));
          }

          // Get artist image from profile if available
          if (artistData.visuals?.avatarImage?.sources?.[0]?.url) {
            result.artistImage = artistData.visuals.avatarImage.sources[0].url;
          } else if (artistData.images?.[0]?.url) {
            result.artistImage = artistData.images[0].url;
          }

          // Monthly listeners
          if (artistData.stats?.monthlyListeners) {
            result.monthlyListeners = formatNumber(artistData.stats.monthlyListeners);
          }
        }
      } catch (e) {
        console.error('Failed to parse JSON data:', e);
      }
    }

    // Alternative: Try to extract social links from meta tags or visible HTML
    if (!result.artistSocialLinks || result.artistSocialLinks.length === 0) {
      const socialLinks: SocialLink[] = [];
      
      // Look for common social media patterns in the HTML
      const instagramMatch = html.match(/href="(https?:\/\/(www\.)?instagram\.com\/[^"]+)"/i);
      if (instagramMatch?.[1]) {
        socialLinks.push({ platform: 'Instagram', url: instagramMatch[1] });
      }
      
      const twitterMatch = html.match(/href="(https?:\/\/(www\.)?(twitter|x)\.com\/[^"]+)"/i);
      if (twitterMatch?.[1]) {
        socialLinks.push({ platform: 'Twitter', url: twitterMatch[1] });
      }
      
      const facebookMatch = html.match(/href="(https?:\/\/(www\.)?facebook\.com\/[^"]+)"/i);
      if (facebookMatch?.[1]) {
        socialLinks.push({ platform: 'Facebook', url: facebookMatch[1] });
      }
      
      const youtubeMatch = html.match(/href="(https?:\/\/(www\.)?youtube\.com\/[^"]+)"/i);
      if (youtubeMatch?.[1]) {
        socialLinks.push({ platform: 'YouTube', url: youtubeMatch[1] });
      }
      
      const tiktokMatch = html.match(/href="(https?:\/\/(www\.)?tiktok\.com\/[^"]+)"/i);
      if (tiktokMatch?.[1]) {
        socialLinks.push({ platform: 'TikTok', url: tiktokMatch[1] });
      }

      if (socialLinks.length > 0) {
        result.artistSocialLinks = socialLinks;
      }
    }

  } catch (error) {
    console.error('Error fetching artist page:', error);
  }

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
    
    // oEmbed provides a thumbnail which is usually the album art
    if (oembed?.thumbnail_url) {
      result.albumArt = oembed.thumbnail_url;
    }

    // 2) Fetch embed HTML to get more artist data
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
        
        // Merge extracted data
        if (extracted.artistName) result.artistName = extracted.artistName;
        if (extracted.artistId) result.artistId = extracted.artistId;
        if (extracted.artistUrl) result.artistUrl = extracted.artistUrl;
        if (extracted.albumName) result.albumName = extracted.albumName;
        if (extracted.albumArt && !result.albumArt) result.albumArt = extracted.albumArt;
      }
    }

    // 3) Fetch artist page for profile picture, bio, top tracks, and social links
    if (result.artistId) {
      console.log(`Fetching artist data for: ${result.artistId}`);
      const artistData = await fetchArtistPageData(result.artistId);
      
      if (artistData.artistImage) result.artistImage = artistData.artistImage;
      if (artistData.artistBio) result.artistBio = artistData.artistBio;
      if (artistData.artistTopTracks) result.artistTopTracks = artistData.artistTopTracks;
      if (artistData.artistSocialLinks) result.artistSocialLinks = artistData.artistSocialLinks;
      if (artistData.monthlyListeners) result.monthlyListeners = artistData.monthlyListeners;
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
