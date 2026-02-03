import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-SPOT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { 
      spotNumber, 
      spotId, 
      priceCents,
      songUrl, 
      artistName, 
      songTitle, 
      message, 
      audioFileUrl,
      email,
      platform 
    } = await req.json();
    
    logStep("Request data", { spotNumber, spotId, priceCents, email });

    if (!spotNumber || !spotId) {
      throw new Error("Invalid spot data");
    }

    if (!songUrl) {
      throw new Error("Song URL is required");
    }

    // Get user email - either from authenticated user or from request body
    let userEmail = email;
    let userId: string | null = null;
    
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData.user?.email) {
        userEmail = userData.user.email;
        userId = userData.user.id;
      }
    }
    
    if (!userEmail) {
      throw new Error("Email is required");
    }
    
    logStep("User context", { email: userEmail, authenticated: !!userId });

    // Verify spot is still available and get current price
    const { data: spot, error: spotError } = await supabaseClient
      .from('pre_stream_spots')
      .select('*')
      .eq('id', spotId)
      .eq('is_available', true)
      .single();

    if (spotError || !spot) {
      throw new Error("This spot is no longer available");
    }
    
    // Use the price from the database (authoritative source)
    const actualPriceCents = spot.price_cents;
    logStep("Spot verified available", { spotId, priceCents: actualPriceCents });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer by email
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://tune-spotlight-queue.lovable.app";

    // Create checkout session with dynamic price
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Pre-Stream Spot #${spotNumber}`,
              description: `Priority spot #${spotNumber} for the next stream`,
            },
            unit_amount: actualPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/?spot_payment=success&spot_id=${spotId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?spot_payment=cancelled`,
      metadata: {
        spot_id: spotId,
        spot_number: spotNumber.toString(),
        user_id: userId || "",
        email: userEmail,
        song_url: songUrl,
        artist_name: artistName || "Unknown Artist",
        song_title: songTitle || "Untitled",
        message: message || "",
        audio_file_url: audioFileUrl || "",
        platform: platform || "other",
        price_cents: actualPriceCents.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
