import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.25.76";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation schema
const requestSchema = z.object({
  amount: z.number().min(0.01).max(100),
  songUrl: z.string().max(2000),
  artistName: z.string().max(200).optional().default('Unknown Artist'),
  songTitle: z.string().max(200).optional().default('Untitled'),
  message: z.string().max(1000).optional(),
  email: z.string().email().max(255).optional(),
  platform: z.string().max(50).optional().default('other'),
  audioFileUrl: z.string().max(500).optional().nullable(),
  streamerSlug: z.string().max(100).optional().nullable(),
  streamerId: z.string().max(100).optional().nullable(),
  referralCode: z.string().max(20).optional().nullable(),
});

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBMISSION-PAYMENT] ${step}${detailsStr}`);
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

    // Rate limit: 10 requests per 60 seconds per IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed } = await checkRateLimit(clientIp, "create-submission-payment", 10, 60);
    if (!allowed) {
      logStep("Rate limited", { ip: clientIp });
      return rateLimitResponse(corsHeaders);
    }

    // Parse and validate input
    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      logStep("Validation failed", validationResult.error.errors);
      throw new Error(`Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
    }
    
    const { amount, songUrl, artistName, songTitle, message, email, platform, audioFileUrl, streamerSlug, streamerId, referralCode } = validationResult.data;
    logStep("Input validated", { amount, platform, hasAudioFile: !!audioFileUrl, hasReferral: !!referralCode });

    // Check if submission pricing is active
    // Prefer streamer-specific config, fall back to global (streamer_id IS NULL)
    const { data: pricingConfigs, error: configError } = await supabaseClient
      .from('pricing_config')
      .select('*')
      .eq('config_type', 'submission');

    if (configError || !pricingConfigs || pricingConfigs.length === 0) {
      throw new Error('Pricing configuration not found');
    }

    const pricingConfig = pricingConfigs.find(r => streamerId && r.streamer_id === streamerId)
      ?? pricingConfigs.find(r => r.streamer_id === null)
      ?? pricingConfigs[0];

    if (!pricingConfig.is_active) {
      throw new Error('Paid submissions are not currently active');
    }

    // Validate amount is within configured range (allow discounted amounts below min)
    const minAmount = pricingConfig.min_amount_cents / 100;
    const maxAmount = pricingConfig.max_amount_cents / 100;
    
    // If a referral code is provided, allow amounts down to 10% below min
    const effectiveMin = referralCode ? minAmount * 0.9 : minAmount;
    
    if (amount < effectiveMin || amount > maxAmount) {
      throw new Error(`Amount must be between €${minAmount.toFixed(2)} and €${maxAmount.toFixed(2)}`);
    }

    // Validate referral code server-side
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let validatedReferralCode: string | null = null;
    if (referralCode) {
      // Atomically reserve the code to prevent race conditions
      const { data: reservedCodes, error: reserveError } = await serviceClient
        .from('referral_codes')
        .update({ is_used: true, used_at: new Date().toISOString(), used_by_email: email || null })
        .eq('code', referralCode)
        .eq('is_used', false)
        .select('code, discount_percent, expires_at');

      if (reserveError || !reservedCodes || reservedCodes.length === 0) {
        throw new Error('Invalid or already used referral code');
      }

      const codeData = reservedCodes[0];
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        // Un-reserve expired code
        await serviceClient.from('referral_codes').update({ is_used: false, used_at: null, used_by_email: null }).eq('code', codeData.code);
        throw new Error('Referral code has expired');
      }
      validatedReferralCode = codeData.code;
      logStep("Referral code reserved", { code: validatedReferralCode, discount: codeData.discount_percent });
    }

    // Authenticate user (optional - allow guest checkout)
    let user = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      user = userData.user;
    }

    logStep("User context", { authenticated: !!user, email: user?.email || email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customerEmail = user?.email || email;
    let customerId;
    
    if (customerEmail) {
      const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const amountCents = Math.round(amount * 100);
    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://upstargg.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Song Submission",
              description: `Submit: ${songTitle} by ${artistName}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: streamerSlug 
        ? `${origin}/${streamerSlug}/submit?submission_payment=success&session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/?submission_payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: streamerSlug
        ? `${origin}/${streamerSlug}/submit?submission_payment=cancelled`
        : `${origin}/?submission_payment=cancelled`,
      metadata: {
        type: "submission",
        user_id: user?.id || "",
        song_url: (songUrl || "").slice(0, 490),
        artist_name: (artistName || "").slice(0, 200),
        song_title: (songTitle || "").slice(0, 200),
        message: (message || "").slice(0, 490),
        platform: platform,
        email: (customerEmail || "").slice(0, 250),
        // Store both keys to be resilient across verifier versions
        audio_file_url: (audioFileUrl || "").slice(0, 490),
        audioFileUrl: (audioFileUrl || "").slice(0, 490),
        streamer_id: streamerId || "",
        referral_code: validatedReferralCode || "",
      },
    });

    // Link session ID to the already-reserved referral code
    if (validatedReferralCode) {
      await serviceClient
        .from('referral_codes')
        .update({ used_on_session_id: session.id })
        .eq('code', validatedReferralCode);
      logStep("Referral code linked to session", { code: validatedReferralCode });
    }

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
