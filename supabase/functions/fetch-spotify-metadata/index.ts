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

const extractArtistFromEmbedHtml = (html: string): string | undefined => {
  // Most reliable (currently): creator link testid
  const byTestId = html.match(/data-testid="creator-link"[^>]*>([^<]+)</i);
  if (byTestId?.[1]) return byTestId[1].trim();

  // Generic: first artist link
  const byArtistHref = html.match(/href="https:\/\/open\.spotify\.com\/artist\/[^"]+"[^>]*>([^<]+)<\/a>/i);
  if (byArtistHref?.[1]) return byArtistHref[1].trim();

  // Sometimes embedded JSON exists
  const byArtistsJson = html.match(/"artists"\s*:\s*\[\s*\{\s*"name"\s*:\s*"([^"]+)"/i);
  if (byArtistsJson?.[1]) return byArtistsJson[1].trim();

  return undefined;
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

    // 1) oEmbed: provides title + iframe_url
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl, {
      headers: {
        // Some regions are picky without a UA
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
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
    const songTitle: string | undefined = oembed?.title;
    const iframeUrl: string | undefined = oembed?.iframe_url;

    let artistName: string | undefined;

    // 2) Fetch embed HTML to get artist name
    if (iframeUrl) {
      const embedRes = await fetch(iframeUrl, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (embedRes.ok) {
        const embedHtml = await embedRes.text();
        artistName = extractArtistFromEmbedHtml(embedHtml);
      }
    }

    return new Response(JSON.stringify({ songTitle, artistName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
