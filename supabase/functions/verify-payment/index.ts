import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    logStep("Verifying session", { sessionId });

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

    // Extract metadata
    const metadata = session.metadata || {};
    const amountPaid = parseFloat(metadata.amount_paid || "0");

    logStep("Creating submission", { metadata, amountPaid });

    // Create submission in database using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { data: submission, error: insertError } = await supabase
      .from("submissions")
      .insert({
        song_url: metadata.song_url,
        platform: metadata.platform,
        artist_name: metadata.artist_name || "Unknown Artist",
        song_title: metadata.song_title || "Untitled",
        message: metadata.message || null,
        email: metadata.email || null,
        amount_paid: amountPaid,
        is_priority: true,
        status: "pending",
        audio_file_url: metadata.audio_file_url || null,
      })
      .select()
      .single();

    if (insertError) {
      logStep("Insert error", { error: insertError });
      throw new Error(`Failed to create submission: ${insertError.message}`);
    }

    logStep("Submission created", { submissionId: submission.id });

    return new Response(JSON.stringify({ 
      success: true, 
      submission,
      message: "Your priority submission has been added to the queue!"
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
