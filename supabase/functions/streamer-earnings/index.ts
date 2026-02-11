import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    // Fetch earnings from DB (RLS ensures only own earnings)
    const { data: earnings, error: earningsError } = await supabaseClient
      .from("streamer_earnings")
      .select("*")
      .eq("streamer_id", streamer.id)
      .order("created_at", { ascending: false });

    if (earningsError) throw earningsError;

    // Fetch completed payouts
    const { data: payouts } = await supabaseClient
      .from("payout_requests")
      .select("amount_cents, status")
      .eq("streamer_id", streamer.id)
      .eq("status", "completed");

    const totalPayoutsCents = (payouts || []).reduce((sum, p) => sum + p.amount_cents, 0);

    // Calculate totals
    let totalEarningsCents = 0;
    let totalPlatformFeeCents = 0;
    let totalStripeFeesCents = 0;
    const monthlyEarnings: Record<string, number> = {};

    const transactions = (earnings || []).map((e) => {
      totalEarningsCents += e.streamer_share_cents;
      totalPlatformFeeCents += e.platform_fee_cents;
      totalStripeFeesCents += e.stripe_fee_cents;

      const createdDate = new Date(e.created_at);
      const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
      monthlyEarnings[monthKey] = (monthlyEarnings[monthKey] || 0) + e.streamer_share_cents;

      return {
        id: e.id,
        amount_cents: e.gross_amount_cents,
        stripe_fee_cents: e.stripe_fee_cents,
        streamer_share_cents: e.streamer_share_cents,
        platform_fee_cents: e.platform_fee_cents,
        currency: e.currency,
        created_at: e.created_at,
        description: e.payment_type,
        customer_email: e.customer_email,
        type: e.payment_type,
      };
    });

    const chartData = Object.entries(monthlyEarnings)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        earnings: amount / 100,
      }));

    const currentBalanceCents = totalEarningsCents - totalPayoutsCents;

    return new Response(
      JSON.stringify({
        total_earnings_cents: totalEarningsCents,
        total_platform_fee_cents: totalPlatformFeeCents,
        total_stripe_fees_cents: totalStripeFeesCents,
        total_payouts_cents: totalPayoutsCents,
        current_balance_cents: currentBalanceCents,
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
