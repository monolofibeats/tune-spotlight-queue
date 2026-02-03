import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SPOT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { sessionId, spotId } = await req.json();
    logStep("Request data", { sessionId, spotId });

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status, spotId: session.metadata?.spot_id });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const metadata = session.metadata;
    if (!metadata?.spot_id) {
      throw new Error("Invalid session metadata");
    }

    // Use the price from metadata (set during checkout from database)
    const amountPaid = metadata.price_cents 
      ? Math.round(parseInt(metadata.price_cents) / 100) 
      : Math.round((session.amount_total || 0) / 100);

    // Create the submission first
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .insert({
        song_url: metadata.song_url,
        platform: metadata.platform,
        artist_name: metadata.artist_name,
        song_title: metadata.song_title,
        message: metadata.message || null,
        amount_paid: amountPaid,
        is_priority: true,
        user_id: metadata.user_id,
        audio_file_url: metadata.audio_file_url || null,
      })
      .select()
      .single();

    if (submissionError) {
      logStep("Error creating submission", { error: submissionError.message });
      throw new Error("Failed to create submission");
    }
    logStep("Submission created", { submissionId: submission.id });

    // Update the spot to mark it as purchased
    const { error: spotError } = await supabaseAdmin
      .from('pre_stream_spots')
      .update({
        is_available: false,
        purchased_by: metadata.user_id,
        purchased_at: new Date().toISOString(),
        submission_id: submission.id,
      })
      .eq('id', metadata.spot_id)
      .eq('is_available', true);

    if (spotError) {
      logStep("Error updating spot", { error: spotError.message });
      // Don't throw - submission was created, spot update is secondary
    } else {
      logStep("Spot marked as purchased");
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Pre-stream Spot #${metadata.spot_number} purchased successfully!`,
      spotNumber: parseInt(metadata.spot_number),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
