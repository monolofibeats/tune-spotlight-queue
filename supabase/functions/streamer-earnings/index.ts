import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    // Get streamer profile
    const { data: streamer, error: streamerError } = await supabaseClient
      .from("streamers")
      .select("id, slug, display_name")
      .eq("user_id", user.id)
      .single();

    if (streamerError || !streamer) throw new Error("Streamer profile not found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Fetch all successful checkout sessions with this streamer's metadata
    const platformCut = 0.20; // 20% platform fee
    
    // Get all payment intents and filter by streamer metadata
    // We search for charges with metadata containing the streamer_id or streamer_slug
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      status: "complete",
    });

    const transactions: Array<{
      id: string;
      amount_cents: number;
      streamer_share_cents: number;
      platform_fee_cents: number;
      currency: string;
      created_at: string;
      description: string;
      customer_email: string | null;
      type: string;
    }> = [];

    let totalEarningsCents = 0;
    let totalPlatformFeeCents = 0;
    const monthlyEarnings: Record<string, number> = {};

    for (const session of sessions.data) {
      // Check if this session belongs to this streamer
      const meta = session.metadata || {};
      if (meta.streamer_id !== streamer.id && meta.streamer_slug !== streamer.slug) {
        continue;
      }

      const amountTotal = session.amount_total || 0;
      const streamerShare = Math.round(amountTotal * (1 - platformCut));
      const platformFee = amountTotal - streamerShare;

      totalEarningsCents += streamerShare;
      totalPlatformFeeCents += platformFee;

      const createdDate = new Date(session.created * 1000);
      const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
      monthlyEarnings[monthKey] = (monthlyEarnings[monthKey] || 0) + streamerShare;

      transactions.push({
        id: session.id,
        amount_cents: amountTotal,
        streamer_share_cents: streamerShare,
        platform_fee_cents: platformFee,
        currency: session.currency || "eur",
        created_at: createdDate.toISOString(),
        description: meta.type || "submission",
        customer_email: session.customer_details?.email || null,
        type: meta.type || "submission",
      });
    }

    // Sort transactions by date descending
    transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Build chart data from monthly earnings
    const chartData = Object.entries(monthlyEarnings)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        earnings: amount / 100,
      }));

    return new Response(
      JSON.stringify({
        total_earnings_cents: totalEarningsCents,
        total_platform_fee_cents: totalPlatformFeeCents,
        total_payouts_cents: 0, // Will be tracked separately when payouts are implemented
        current_balance_cents: totalEarningsCents, // For now, balance = total earnings
        transactions,
        chart_data: chartData,
        currency: "eur",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
