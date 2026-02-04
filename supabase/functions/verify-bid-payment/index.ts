import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-BID] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status });

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    const metadata = session.metadata;
    if (!metadata || metadata.type !== 'bid') {
      throw new Error('Invalid session type');
    }

    const submissionId = metadata.submission_id;
    const bidAmountCents = parseInt(metadata.bid_amount_cents || '0');
    const email = metadata.email;
    const userId = metadata.user_id || null;

    logStep("Processing bid", { submissionId, bidAmountCents, email });

    // Check if bid record exists
    const { data: existingBid } = await supabaseAdmin
      .from('submission_bids')
      .select('*')
      .eq('submission_id', submissionId)
      .single();

    if (existingBid) {
      // Update existing bid
      const newTotal = existingBid.total_paid_cents + bidAmountCents;
      await supabaseAdmin
        .from('submission_bids')
        .update({
          bid_amount_cents: bidAmountCents,
          total_paid_cents: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('submission_id', submissionId);
      
      logStep("Bid updated", { newTotal });
    } else {
      // Create new bid record
      await supabaseAdmin
        .from('submission_bids')
        .insert({
          submission_id: submissionId,
          user_id: userId || null,
          email: email,
          bid_amount_cents: bidAmountCents,
          total_paid_cents: bidAmountCents,
        });
      
      logStep("Bid created");
    }

    // Update submission to mark as priority
    await supabaseAdmin
      .from('submissions')
      .update({
        is_priority: true,
        boost_amount: (existingBid?.total_paid_cents || 0) + bidAmountCents,
      })
      .eq('id', submissionId);

    // Get bid increment config
    const { data: bidConfig } = await supabaseAdmin
      .from('pricing_config')
      .select('*')
      .eq('config_type', 'bid_increment')
      .single();

    const incrementPercent = bidConfig?.min_amount_cents || 10; // Default 10%

    // Find other submissions that might be affected and create notifications
    const { data: competingBids } = await supabaseAdmin
      .from('submission_bids')
      .select('*, submissions!inner(status, song_title)')
      .neq('submission_id', submissionId)
      .order('total_paid_cents', { ascending: false });

    // Notify users who were outbid (those with lower total)
    const currentTotal = (existingBid?.total_paid_cents || 0) + bidAmountCents;
    
    for (const bid of competingBids || []) {
      if (bid.total_paid_cents < currentTotal && bid.submissions?.status === 'pending') {
        // Calculate suggested new bid (current leader + increment %)
        const suggestedBid = Math.ceil(currentTotal * (1 + incrementPercent / 100));
        
        await supabaseAdmin
          .from('bid_notifications')
          .insert({
            submission_id: bid.submission_id,
            email: bid.email,
            notification_type: 'outbid',
            offer_amount_cents: suggestedBid,
          });
        
        logStep("Outbid notification created", { email: bid.email, suggestedBid });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Your bid has been recorded! Your song moved up in the queue." 
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
