import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation schema
const requestSchema = z.object({
  amount: z.number().min(0.5).max(100),
  songUrl: z.string().max(2000),
  artistName: z.string().max(200).optional().default('Unknown Artist'),
  songTitle: z.string().max(200).optional().default('Untitled'),
  message: z.string().max(1000).optional(),
  email: z.string().email().max(255).optional(),
  platform: z.string().max(50).optional().default('other'),
  audioFileUrl: z.string().max(500).optional().nullable(),
  streamerSlug: z.string().max(100).optional().nullable(),
  streamerId: z.string().max(100).optional().nullable(),
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

    // Parse and validate input
    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      logStep("Validation failed", validationResult.error.errors);
      throw new Error(`Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
    }
    
    const { amount, songUrl, artistName, songTitle, message, email, platform, audioFileUrl, streamerSlug, streamerId } = validationResult.data;
    logStep("Input validated", { amount, platform, hasAudioFile: !!audioFileUrl });

    // Check if submission pricing is active
    const { data: pricingConfig, error: configError } = await supabaseClient
      .from('pricing_config')
      .select('*')
      .eq('config_type', 'submission')
      .single();

    if (configError || !pricingConfig) {
      throw new Error('Pricing configuration not found');
    }

    if (!pricingConfig.is_active) {
      throw new Error('Paid submissions are not currently active');
    }

    // Validate amount is within configured range
    const minAmount = pricingConfig.min_amount_cents / 100;
    const maxAmount = pricingConfig.max_amount_cents / 100;
    
    if (amount < minAmount || amount > maxAmount) {
      throw new Error(`Amount must be between €${minAmount.toFixed(2)} and €${maxAmount.toFixed(2)}`);
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
    const origin = req.headers.get("origin") || "https://tune-spotlight-queue.lovable.app";

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
      success_url: `${origin}/?submission_payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?submission_payment=cancelled`,
      metadata: {
        type: "submission",
        user_id: user?.id || "",
        song_url: songUrl,
        artist_name: artistName,
        song_title: songTitle,
        message: message || "",
        platform: platform,
        email: customerEmail || "",
        // Store both keys to be resilient across verifier versions
        audio_file_url: audioFileUrl || "",
        audioFileUrl: audioFileUrl || "",
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
