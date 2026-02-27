import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

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

    // Rate limit: 10 requests per 60 seconds per IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed } = await checkRateLimit(clientIp, "create-priority-payment", 10, 60);
    if (!allowed) {
      logStep("Rate limited", { ip: clientIp });
      return rateLimitResponse(corsHeaders);
    }

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
      audioFileUrl,
      streamerId,
      streamerSlug,
      referralCode,
      originalSubmissionId,
    } = await req.json();

    logStep("Received request", { amount, songUrl, artistName, songTitle, email, platform, hasAudioFile: !!audioFileUrl, streamerId, streamerSlug, hasReferral: !!referralCode });

    // Fetch minimum amount from pricing_config (prefer streamer-specific, fall back to global)
    const { data: pricingConfigs } = await supabase
      .from('pricing_config')
      .select('min_amount_cents, streamer_id')
      .eq('config_type', 'skip_line');
    const pricingConfig = pricingConfigs?.find(r => streamerId && r.streamer_id === streamerId)
      ?? pricingConfigs?.find(r => r.streamer_id === null)
      ?? pricingConfigs?.[0];

    const minAmountCents = pricingConfig?.min_amount_cents ?? 50; // Default to €0.50
    const amountCents = Math.round(amount * 100);
    
    // Validate pre-discount amount against minimum
    if (amountCents < minAmountCents) {
      throw new Error(`Minimum priority payment is €${(minAmountCents / 100).toFixed(2)}`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Validate and atomically reserve referral/discount code if provided
    let validatedReferralCode: string | null = null;
    let discountPercent = 0;
    if (referralCode) {
      // Atomically reserve the code to prevent race conditions
      const { data: reservedCodes, error: reserveError } = await supabase
        .from('referral_codes')
        .update({ is_used: true, used_at: new Date().toISOString(), used_by_email: email || null })
        .eq('code', referralCode)
        .eq('is_used', false)
        .select('code, discount_percent, expires_at');

      if (reserveError || !reservedCodes || reservedCodes.length === 0) {
        throw new Error('Invalid or already used discount code');
      }

      const codeData = reservedCodes[0];
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        // Un-reserve expired code
        await supabase.from('referral_codes').update({ is_used: false, used_at: null, used_by_email: null }).eq('code', codeData.code);
        throw new Error('Discount code has expired');
      }
      validatedReferralCode = codeData.code;
      discountPercent = codeData.discount_percent;
      logStep("Discount code reserved", { code: validatedReferralCode, discount: discountPercent });
    }

    // Apply discount server-side
    const finalAmountCents = discountPercent > 0
      ? Math.max(1, Math.round(amountCents * (1 - discountPercent / 100)))
      : amountCents;

    logStep("Final charge amount", { original: amountCents, discount: discountPercent, final: finalAmountCents });

    // Build the redirect URL - go back to streamer page if slug provided, else root
    const origin = req.headers.get("origin") || "";
    const successPath = streamerSlug ? `/${streamerSlug}/submit` : "/";
    const cancelPath = streamerSlug ? `/${streamerSlug}/submit` : "/";

    // Create a checkout session with custom amount using price_data
    const session = await stripe.checkout.sessions.create({
      customer_email: email || undefined,
      line_items: [
        {
      price_data: {
            currency: "eur",
            product_data: {
              name: `Priority Submission: ${songTitle || 'Song'}`,
              description: `Skip the watchlist for "${songTitle}" by ${artistName}${discountPercent > 0 ? ` (${discountPercent}% discount applied)` : ''}`,
            },
            unit_amount: finalAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}${successPath}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelPath}?payment=cancelled`,
      metadata: {
        song_url: (songUrl || "").slice(0, 490),
        artist_name: (artistName || "").slice(0, 200),
        song_title: (songTitle || "").slice(0, 200),
        message: (message || "").slice(0, 490),
        email: (email || "").slice(0, 250),
        platform: platform,
        amount_paid: amount.toString(),
        streamer_id: streamerId || "",
        streamer_slug: streamerSlug || "",
        audio_file_url: (audioFileUrl || "").slice(0, 490),
        referral_code: validatedReferralCode || "",
        original_submission_id: originalSubmissionId || "",
      },
    });

    // Link session ID to the already-reserved discount code
    if (validatedReferralCode) {
      await supabase
        .from('referral_codes')
        .update({ used_on_session_id: session.id })
        .eq('code', validatedReferralCode);
      logStep("Discount code linked to session", { code: validatedReferralCode });
    }

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
