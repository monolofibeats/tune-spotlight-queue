import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { autoCreateUserFromPayment } from "../_shared/auto-create-user.ts";
import { recordEarning } from "../_shared/record-earning.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not set");
    }

    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 500) {
      throw new Error("Invalid sessionId");
    }
    logStep("Verifying session", { sessionId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // ── Idempotency check: if a submission was already created for this Stripe
    // session, return it — but still generate a magic link for auto-login.
    const { data: existingEarning } = await supabase
      .from("streamer_earnings")
      .select("submission_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    // Also check submissions table directly (earnings may have failed to record)
    const { data: existingSub } = await supabase
      .from("submissions")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    const alreadyProcessedId = existingEarning?.submission_id || existingSub?.id;

    if (alreadyProcessedId) {
      logStep("Already processed, generating login link", { submissionId: alreadyProcessedId });

      // Still generate a magic link so the user can auto-login
      let actionLink: string | null = null;
      let hashedToken: string | null = null;
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const stripeEmail = session.customer_details?.email || session.metadata?.email || null;
        if (stripeEmail) {
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: stripeEmail,
            options: { redirectTo: req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://upstargg.lovable.app" },
          });
          actionLink = linkData?.properties?.action_link || null;
          hashedToken = linkData?.properties?.hashed_token || null;
        }
      } catch (e) {
        logStep("Warning: failed to generate login link for idempotent return", { error: String(e) });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Your VIP submission has been added to the queue!",
        submissionId: alreadyProcessedId,
        actionLink,
        hashedToken,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    logStep("Session retrieved", { 
      paymentStatus: session.payment_status,
      status: session.status 
    });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const metadata = session.metadata || {};
    // Use Stripe's authoritative amount instead of fragile metadata string
    const amountPaid = Math.round((session.amount_total || 0)) / 100;
    const audioFileUrl = (metadata.audio_file_url || metadata.audioFileUrl || "").trim();

    const stripeEmail = session.customer_details?.email || metadata.email || null;

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://upstargg.lovable.app";

    // Look up streamer slug for magic-link redirect
    let redirectPath = '/user/dashboard';
    if (metadata.streamer_id) {
      const { data: streamerRow } = await supabase
        .from("streamers").select("slug").eq("id", metadata.streamer_id).maybeSingle();
      if (streamerRow?.slug) redirectPath = `/${streamerRow.slug}/submit`;
    }

    const { userId: autoUserId, created: accountCreated, actionLink, hashedToken } = await autoCreateUserFromPayment(
      stripeEmail,
      origin,
      redirectPath,
    );

    const finalUserId = (metadata.user_id && metadata.user_id.length > 0) ? metadata.user_id : (autoUserId || null);

    // If upgrading an existing submission, update in-place to preserve song_url etc.
    const originalSubId = (metadata.original_submission_id || "").trim();
    if (originalSubId) {
      logStep("Upgrading existing submission to priority", { originalSubId, amountPaid });

      const { data: upgraded, error: upgradeErr } = await supabase
        .from("submissions")
        .update({
          is_priority: true,
          amount_paid: amountPaid,
          stripe_session_id: sessionId,
          email: stripeEmail || undefined,
          user_id: finalUserId || undefined,
        })
        .eq("id", originalSubId)
        .select()
        .single();

      if (!upgradeErr && upgraded) {
        logStep("Submission upgraded", { submissionId: upgraded.id });

        if (metadata.streamer_id) {
          try {
            await recordEarning({
              stripeSessionId: sessionId,
              streamerId: metadata.streamer_id,
              submissionId: upgraded.id,
              paymentType: "priority",
              customerEmail: stripeEmail,
            });
            logStep("Earnings recorded for upgrade");
          } catch (e) {
            logStep("Warning: Failed to record earnings (non-fatal)", { error: String(e) });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          submissionId: upgraded.id,
          message: "Your submission has been upgraded to VIP!",
          actionLink: actionLink || null,
          hashedToken: hashedToken || null,
          accountCreated: accountCreated || false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      logStep("Upgrade failed, falling back to insert", { error: upgradeErr?.message });
    }

    logStep("Creating submission", { metadata, amountPaid, accountCreated });

    const { data: submission, error: insertError } = await supabase
      .from("submissions")
      .insert({
        song_url: metadata.song_url,
        platform: metadata.platform,
        artist_name: metadata.artist_name || "Unknown Artist",
        song_title: metadata.song_title || "Untitled",
        message: metadata.message || null,
        email: stripeEmail,
        amount_paid: amountPaid,
        is_priority: true,
        status: "pending",
        audio_file_url: audioFileUrl || null,
        streamer_id: metadata.streamer_id || null,
        user_id: finalUserId,
        stripe_session_id: sessionId,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        logStep("Duplicate insert detected, returning success");
        return new Response(JSON.stringify({
          success: true,
          message: "Your VIP submission has been added to the queue!",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      logStep("Insert error", { error: insertError });
      throw new Error(`Failed to create submission: ${insertError.message}`);
    }

    logStep("Submission created", { submissionId: submission.id });

    // Record earnings for the streamer
    if (metadata.streamer_id) {
      try {
        await recordEarning({
          stripeSessionId: sessionId,
          streamerId: metadata.streamer_id,
          submissionId: submission.id,
          paymentType: "priority",
          customerEmail: stripeEmail,
        });
        logStep("Earnings recorded for streamer");
      } catch (e) {
        logStep("Warning: Failed to record earnings", { error: String(e) });
      }
    }

    const accountMessage = accountCreated
      ? " We've sent you a login link to track your submission!"
      : "";

    return new Response(JSON.stringify({ 
      success: true, 
      submission,
      message: `Your priority submission has been added to the queue!${accountMessage}`,
      accountCreated,
      actionLink: actionLink || null,
      hashedToken: hashedToken || null,
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
