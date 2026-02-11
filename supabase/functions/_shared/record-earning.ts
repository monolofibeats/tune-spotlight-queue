import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const PLATFORM_FEE_RATE = 0.20; // 20% platform fee on net

interface RecordEarningParams {
  stripeSessionId: string;
  streamerId: string;
  submissionId?: string;
  paymentType: string;
  customerEmail?: string | null;
}

export async function recordEarning(params: RecordEarningParams) {
  const { stripeSessionId, streamerId, submissionId, paymentType, customerEmail } = params;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  // Retrieve the session to get amount
  const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
    expand: ["payment_intent"],
  });

  const grossCents = session.amount_total || 0;
  if (grossCents <= 0) return;

  // Get actual Stripe fee from the charge
  let stripeFee = 0;
  try {
    const pi = session.payment_intent as Stripe.PaymentIntent;
    if (pi?.latest_charge) {
      const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
      const charge = await stripe.charges.retrieve(chargeId, {
        expand: ["balance_transaction"],
      });
      const bt = charge.balance_transaction;
      if (bt && typeof bt !== "string") {
        stripeFee = bt.fee || 0;
      }
    }
  } catch (e) {
    // If we can't get exact fee, estimate it (1.4% + 25 cents for EU)
    stripeFee = Math.round(grossCents * 0.014 + 25);
    console.log(`[RECORD-EARNING] Could not fetch exact Stripe fee, using estimate: ${stripeFee}`);
  }

  const netCents = grossCents - stripeFee;
  const platformFeeCents = Math.round(netCents * PLATFORM_FEE_RATE);
  const streamerShareCents = netCents - platformFeeCents;

  const { error } = await supabase.from("streamer_earnings").insert({
    streamer_id: streamerId,
    submission_id: submissionId || null,
    stripe_session_id: stripeSessionId,
    gross_amount_cents: grossCents,
    stripe_fee_cents: stripeFee,
    net_amount_cents: netCents,
    platform_fee_cents: platformFeeCents,
    streamer_share_cents: streamerShareCents,
    currency: session.currency || "eur",
    payment_type: paymentType,
    customer_email: customerEmail || session.customer_details?.email || null,
  });

  if (error) {
    // Unique constraint = already recorded, not an error
    if (error.code === "23505") {
      console.log(`[RECORD-EARNING] Already recorded for session ${stripeSessionId}`);
      return;
    }
    console.error(`[RECORD-EARNING] Insert error:`, error);
    throw error;
  }

  console.log(`[RECORD-EARNING] Recorded: gross=${grossCents}, stripeFee=${stripeFee}, net=${netCents}, platform=${platformFeeCents}, streamer=${streamerShareCents}`);
}
