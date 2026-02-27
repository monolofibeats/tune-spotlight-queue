import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CLEANUP-CODES] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find codes that were reserved (is_used=true) with a session ID but
    // reserved more than 2 hours ago — check if the Stripe session actually paid
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: suspectCodes, error } = await supabase
      .from("referral_codes")
      .select("id, code, used_on_session_id, used_at")
      .eq("is_used", true)
      .not("used_on_session_id", "is", null)
      .lt("used_at", twoHoursAgo);

    if (error) {
      logStep("Query error", { error: error.message });
      throw error;
    }

    if (!suspectCodes || suspectCodes.length === 0) {
      logStep("No suspect codes found");
      return new Response(JSON.stringify({ cleaned: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Checking suspect codes", { count: suspectCodes.length });

    let cleaned = 0;

    for (const code of suspectCodes) {
      try {
        const session = await stripe.checkout.sessions.retrieve(code.used_on_session_id!);

        if (session.payment_status !== "paid") {
          // Payment was never completed — un-reserve the code
          await supabase
            .from("referral_codes")
            .update({
              is_used: false,
              used_at: null,
              used_by_email: null,
              used_on_session_id: null,
            })
            .eq("id", code.id);

          logStep("Code un-reserved", { code: code.code, sessionStatus: session.payment_status });
          cleaned++;
        }
      } catch (stripeErr) {
        logStep("Stripe check failed for code", { code: code.code, error: String(stripeErr) });
      }
    }

    logStep("Cleanup complete", { cleaned });

    return new Response(JSON.stringify({ cleaned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
