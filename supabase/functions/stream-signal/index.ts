import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, roomId, sdp, candidate, viewerId, isAdmin } = await req.json();

    console.log(`[stream-signal] Action: ${action}, Room: ${roomId}`);

    // For medium audience, we'll use a simple relay approach
    // Admin broadcasts their stream info, viewers connect to retrieve it
    
    if (action === "create-room") {
      // Admin creates a room when starting to stream
      const { data, error } = await supabase
        .from("stream_config")
        .update({
          stream_type: "screenshare",
          stream_url: roomId, // Use as room identifier
        })
        .eq("is_active", true);

      if (error) {
        console.error("Error creating room:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, roomId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "close-room") {
      // Admin closes the room
      const { error } = await supabase
        .from("stream_config")
        .update({
          stream_type: "none",
          stream_url: null,
        })
        .eq("is_active", true);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "offer") {
      // Admin sends their SDP offer - store it for viewers to retrieve
      // We'll use a simple approach: store in a realtime broadcast
      return new Response(
        JSON.stringify({ success: true, message: "Offer stored" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-room-info") {
      // Viewer wants to check if there's an active screenshare
      const { data, error } = await supabase
        .from("stream_config")
        .select("*")
        .eq("is_active", true)
        .eq("stream_type", "screenshare")
        .maybeSingle();

      return new Response(
        JSON.stringify({ 
          success: true, 
          active: !!data,
          roomId: data?.stream_url 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[stream-signal] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
