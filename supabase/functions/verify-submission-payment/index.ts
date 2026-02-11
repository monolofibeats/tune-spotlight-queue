import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.25.76";
import { autoCreateUserFromPayment } from "../_shared/auto-create-user.ts";
import { recordEarning } from "../_shared/record-earning.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const requestSchema = z.object({
  sessionId: z.string().min(1).max(500),
});

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SUBMISSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      logStep("Validation failed", validationResult.error.errors);
      throw new Error(`Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
    }

    const { sessionId } = validationResult.data;
    logStep("Verifying session", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status, metadata: session.metadata });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (session.metadata?.type !== "submission") {
      throw new Error("Invalid payment type");
    }

    const stripeEmail = session.customer_details?.email || session.metadata?.email || null;
    logStep("Stripe email", { stripeEmail });

    const origin = req.headers.get("origin") || "https://tune-spotlight-queue.lovable.app";
    const { userId: autoUserId, created: accountCreated } = await autoCreateUserFromPayment(
      stripeEmail,
      origin,
    );

    const finalUserId = session.metadata?.user_id || autoUserId || null;

    const { data: submission, error: insertError } = await supabaseClient
      .from('submissions')
      .insert({
        song_url: session.metadata.song_url,
        platform: session.metadata.platform || 'other',
        artist_name: session.metadata.artist_name || 'Unknown Artist',
        song_title: session.metadata.song_title || 'Untitled',
        message: session.metadata.message || null,
        email: stripeEmail,
        amount_paid: Math.round((session.amount_total || 0) / 100),
        is_priority: false,
        user_id: finalUserId,
        status: 'pending',
        audio_file_url: (session.metadata.audio_file_url || session.metadata.audioFileUrl || '').trim() || null,
        streamer_id: session.metadata.streamer_id || null,
      })
      .select()
      .single();

    if (insertError) {
      logStep("Insert error", insertError);
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Submission already processed" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      throw insertError;
    }

    logStep("Submission created", { submissionId: submission.id, accountCreated });

    // Record earnings for the streamer
    if (session.metadata.streamer_id) {
      try {
        await recordEarning({
          stripeSessionId: sessionId,
          streamerId: session.metadata.streamer_id,
          submissionId: submission.id,
          paymentType: "submission",
          customerEmail: stripeEmail,
        });
        logStep("Earnings recorded for streamer");
      } catch (e) {
        logStep("Warning: Failed to record earnings", { error: String(e) });
        // Don't fail the submission if earnings recording fails
      }
    }

    const accountMessage = accountCreated
      ? " We've sent you a login link to track your submission!"
      : "";

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Your song "${session.metadata.song_title}" has been submitted!${accountMessage}`,
      submissionId: submission.id,
      accountCreated,
    }), {
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
