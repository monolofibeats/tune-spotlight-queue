import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PRIORITY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Initialize Supabase client to fetch pricing config
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      amount, 
      songUrl, 
      artistName, 
      songTitle, 
      message, 
      email,
      platform,
      audioFileUrl 
    } = await req.json();

    logStep("Received request", { amount, songUrl, artistName, songTitle, email, platform, hasAudioFile: !!audioFileUrl });

    // Fetch minimum amount from pricing_config
    const { data: pricingConfig } = await supabase
      .from('pricing_config')
      .select('min_amount_cents')
      .eq('config_type', 'skip_line')
      .single();

    const minAmountCents = pricingConfig?.min_amount_cents ?? 50; // Default to €0.50
    const amountCents = Math.round(amount * 100);
    
    if (amountCents < minAmountCents) {
      throw new Error(`Minimum priority payment is €${(minAmountCents / 100).toFixed(2)}`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create a checkout session with custom amount using price_data
    const session = await stripe.checkout.sessions.create({
      customer_email: email || undefined,
      line_items: [
        {
      price_data: {
            currency: "eur",
            product_data: {
              name: `Priority Submission: ${songTitle || 'Song'}`,
              description: `Skip the watchlist for "${songTitle}" by ${artistName}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/?payment=cancelled`,
      metadata: {
        song_url: songUrl,
        artist_name: artistName,
        song_title: songTitle,
        message: message || "",
        email: email || "",
        platform: platform,
        amount_paid: amount.toString(),
        audio_file_url: audioFileUrl || "",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
