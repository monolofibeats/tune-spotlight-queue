import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { autoCreateUserFromPayment } from "../_shared/auto-create-user.ts";
import { recordEarning } from "../_shared/record-earning.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    logStep("ERROR: No stripe-signature header");
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: String(err) });
    return new Response(`Webhook signature verification failed: ${err}`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  if (event.type !== "checkout.session.completed") {
    // We only care about completed checkouts
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};

  logStep("Processing checkout session", {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    metadata,
  });

  // Only process paid sessions
  if (session.payment_status !== "paid") {
    logStep("Session not paid, skipping");
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Determine payment type from metadata
  const isSubmissionPayment = metadata.type === "submission";
  const isPriorityPayment = !isSubmissionPayment && metadata.song_url;
  const isBidPayment = metadata.type === "bid";

  if (!isSubmissionPayment && !isPriorityPayment && !isBidPayment) {
    logStep("Not a submission/priority/bid payment, skipping", { metadata });
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const sessionId = session.id;

  // ─── BID PAYMENT PROCESSING ───
  if (isBidPayment) {
    try {
      const submissionId = metadata.submission_id;
      const bidAmountCents = parseInt(metadata.bid_amount_cents || '0');
      const email = metadata.email;
      const userId = metadata.user_id || null;
      const streamerId = metadata.streamer_id;

      logStep("Processing bid payment", { submissionId, bidAmountCents, email });

      // Idempotency: check if already processed
      const { data: alreadyProcessed } = await supabase
        .from('submission_bids')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      if (alreadyProcessed) {
        logStep("Bid already processed", { sessionId });
        return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), { status: 200 });
      }

      // Upsert bid record
      const { data: existingBid } = await supabase
        .from('submission_bids')
        .select('*')
        .eq('submission_id', submissionId)
        .maybeSingle();

      let newTotalCents: number;
      if (existingBid) {
        newTotalCents = existingBid.total_paid_cents + bidAmountCents;
        await supabase
          .from('submission_bids')
          .update({
            bid_amount_cents: bidAmountCents,
            total_paid_cents: newTotalCents,
            stripe_session_id: sessionId,
            updated_at: new Date().toISOString(),
          })
          .eq('submission_id', submissionId);
        logStep("Bid updated", { newTotalCents });
      } else {
        newTotalCents = bidAmountCents;
        await supabase
          .from('submission_bids')
          .insert({
            submission_id: submissionId,
            user_id: userId || null,
            email,
            bid_amount_cents: bidAmountCents,
            total_paid_cents: newTotalCents,
            stripe_session_id: sessionId,
          });
        logStep("Bid created", { newTotalCents });
      }

      // Update submission boost_amount so it sorts correctly in queue
      await supabase
        .from('submissions')
        .update({
          is_priority: true,
          boost_amount: newTotalCents / 100,
          amount_paid: newTotalCents / 100,
        })
        .eq('id', submissionId);

      logStep("Submission boost updated", { submissionId, boostAmount: newTotalCents / 100 });

      // Record earnings
      if (streamerId) {
        try {
          await recordEarning({
            stripeSessionId: sessionId,
            streamerId,
            submissionId,
            paymentType: "bid",
            customerEmail: email,
          });
          logStep("Bid earnings recorded");
        } catch (e) {
          logStep("Warning: Failed to record bid earnings", { error: String(e) });
        }
      }

      // Outbid notifications for competing submissions
      if (streamerId) {
        try {
          const { data: bidConfigs } = await supabase
            .from('pricing_config')
            .select('*')
            .eq('config_type', 'bid_increment');
          const bidConfig = bidConfigs?.find(r => r.streamer_id === streamerId) 
            ?? bidConfigs?.find(r => r.streamer_id === null) 
            ?? bidConfigs?.[0];
          const incrementPercent = bidConfig?.min_amount_cents || 10;

          const { data: competingBids } = await supabase
            .from('submission_bids')
            .select('*, submissions!inner(status, streamer_id)')
            .neq('submission_id', submissionId)
            .order('total_paid_cents', { ascending: false });

          for (const bid of competingBids || []) {
            if (
              bid.submissions?.streamer_id === streamerId &&
              bid.submissions?.status === 'pending' &&
              bid.total_paid_cents > 0 &&
              bid.total_paid_cents < newTotalCents &&
              bid.email !== email
            ) {
              const suggestedBid = Math.ceil(newTotalCents * (1 + incrementPercent / 100));
              await supabase
                .from('bid_notifications')
                .insert({
                  submission_id: bid.submission_id,
                  email: bid.email,
                  user_id: bid.user_id || null,
                  notification_type: 'outbid',
                  offer_amount_cents: suggestedBid,
                });
              logStep("Outbid notification created", { email: bid.email, suggestedBid });
            }
          }

          // Trigger email sending
          await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-bid-notification`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({}),
            }
          ).catch(() => {});
          logStep("Bid email notifications triggered");
        } catch (notifErr) {
          logStep("Outbid notification failed (non-fatal)", { error: String(notifErr) });
        }
      }

      logStep("Bid webhook complete", { submissionId });
      return new Response(JSON.stringify({ received: true, submissionId }), { status: 200 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logStep("BID ERROR", { message: errorMessage });
      return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
  }

  try {
    // Idempotency: check if already processed
    const { data: existingEarning } = await supabase
      .from("streamer_earnings")
      .select("submission_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existingEarning?.submission_id) {
      logStep("Already processed", { submissionId: existingEarning.submission_id });
      return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), { status: 200 });
    }

    // Also check submissions table directly by stripe_session_id for idempotency
    const { data: existingSub } = await supabase
      .from("submissions")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existingSub?.id) {
      logStep("Submission already exists (matched by stripe_session_id)", { id: existingSub.id });
      return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), { status: 200 });
    }

    const stripeEmail = session.customer_details?.email || metadata.email || null;
    const siteUrl = Deno.env.get("SITE_URL") || "https://upstargg.lovable.app";

    // Look up streamer slug for magic-link redirect
    let redirectPath = '/user/dashboard';
    if (metadata.streamer_id) {
      const { data: streamerRow } = await supabase
        .from("streamers").select("slug").eq("id", metadata.streamer_id).maybeSingle();
      if (streamerRow?.slug) redirectPath = `/${streamerRow.slug}/submit`;
    }

    const { userId: autoUserId, created: accountCreated } = await autoCreateUserFromPayment(
      stripeEmail,
      siteUrl,
      redirectPath,
    );

    const finalUserId = metadata.user_id || autoUserId || null;
    const amountPaid = Math.round((session.amount_total || 0)) / 100;
    const audioFileUrl = (metadata.audio_file_url || metadata.audioFileUrl || "").trim();

    logStep("Creating submission", {
      isPriority: isPriorityPayment,
      amountPaid,
      songTitle: metadata.song_title,
      streamerId: metadata.streamer_id,
      accountCreated,
    });

    const { data: submission, error: insertError } = await supabase
      .from("submissions")
      .insert({
        song_url: metadata.song_url,
        platform: metadata.platform || "other",
        artist_name: metadata.artist_name || "Unknown Artist",
        song_title: metadata.song_title || "Untitled",
        message: metadata.message || null,
        email: stripeEmail,
        amount_paid: amountPaid,
        is_priority: isPriorityPayment ? true : false,
        status: "pending",
        audio_file_url: audioFileUrl || null,
        streamer_id: metadata.streamer_id || null,
        user_id: finalUserId,
        stripe_session_id: sessionId,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        logStep("Duplicate insert (race condition), OK");
        return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), { status: 200 });
      }
      logStep("Insert error", insertError);
      throw new Error(`Failed to create submission: ${insertError.message}`);
    }

    logStep("Submission created", { submissionId: submission.id });

    // Soft-delete the original free submission if this is a skip/upgrade
    const originalSubId = metadata.original_submission_id;
    if (originalSubId) {
      const { error: deleteErr } = await supabase
        .from("submissions")
        .update({ status: "deleted" })
        .eq("id", originalSubId)
        .eq("status", "pending");
      logStep("Original submission soft-deleted", { originalSubId, error: deleteErr?.message || null });
    }

    // Record earnings
    if (metadata.streamer_id) {
      try {
        await recordEarning({
          stripeSessionId: sessionId,
          streamerId: metadata.streamer_id,
          submissionId: submission.id,
          paymentType: isPriorityPayment ? "priority" : "submission",
          customerEmail: stripeEmail,
        });
        logStep("Earnings recorded");
      } catch (e) {
        logStep("Warning: Failed to record earnings (non-fatal)", { error: String(e) });
      }
    }

    // Outbid notifications: notify other paid submissions that got displaced
    if (isPriorityPayment && metadata.streamer_id && amountPaid > 0) {
      try {
        // Get bid increment config
        const { data: bidConfigs } = await supabase
          .from('pricing_config')
          .select('*')
          .eq('config_type', 'bid_increment');
        const bidConfig = bidConfigs?.find(r => r.streamer_id === metadata.streamer_id) 
          ?? bidConfigs?.find(r => r.streamer_id === null) 
          ?? bidConfigs?.[0];
        const incrementPercent = bidConfig?.min_amount_cents || 10;

        const currentTotalCents = Math.round(amountPaid * 100);

        // Find other pending paid submissions for this streamer that are now below this one
        const { data: competingSubmissions } = await supabase
          .from('submissions')
          .select('id, email, amount_paid, boost_amount, user_id')
          .eq('streamer_id', metadata.streamer_id)
          .eq('status', 'pending')
          .eq('is_priority', true)
          .neq('id', submission.id);

        for (const comp of competingSubmissions || []) {
          const compTotalCents = Math.round((comp.boost_amount || comp.amount_paid || 0) * 100);
          
          // Only notify if they paid less AND have a different email
          if (compTotalCents > 0 && compTotalCents < currentTotalCents && comp.email && comp.email !== stripeEmail) {
            const suggestedBid = Math.ceil(currentTotalCents * (1 + incrementPercent / 100));

            await supabase
              .from('bid_notifications')
              .insert({
                submission_id: comp.id,
                email: comp.email,
                user_id: comp.user_id || null,
                notification_type: 'outbid',
                offer_amount_cents: suggestedBid,
              });

            logStep("Outbid notification created", { 
              email: comp.email, 
              compTotal: compTotalCents, 
              newTotal: currentTotalCents,
              suggestedBid 
            });
          }
        }

        // Trigger email sending
        try {
          await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-bid-notification`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({}),
            }
          );
          logStep("Email notifications triggered");
        } catch (emailErr) {
          logStep("Email trigger failed (non-fatal)", { error: String(emailErr) });
        }
      } catch (notifErr) {
        logStep("Outbid notification failed (non-fatal)", { error: String(notifErr) });
      }
    }

    logStep("Webhook processing complete", { submissionId: submission.id });

    return new Response(JSON.stringify({ received: true, submissionId: submission.id }), {
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    // Return 500 so Stripe retries the webhook
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
});
