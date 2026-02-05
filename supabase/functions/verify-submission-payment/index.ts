import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation schema
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

    // Parse and validate input
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

    // Verify this is a submission payment
    if (session.metadata?.type !== "submission") {
      throw new Error("Invalid payment type");
    }

    // Check if already processed
    const { data: existing } = await supabaseClient
      .from('submissions')
      .select('id')
      .eq('song_url', session.metadata.song_url)
      .eq('created_at', new Date().toISOString().split('T')[0])
      .limit(1);

    // Create submission if not already exists
    const { data: submission, error: insertError } = await supabaseClient
      .from('submissions')
      .insert({
        song_url: session.metadata.song_url,
        platform: session.metadata.platform || 'other',
        artist_name: session.metadata.artist_name || 'Unknown Artist',
        song_title: session.metadata.song_title || 'Untitled',
        message: session.metadata.message || null,
        email: session.metadata.email || null,
        amount_paid: Math.round((session.amount_total || 0) / 100),
        is_priority: false,
        user_id: session.metadata.user_id || null,
        status: 'pending',
        audio_file_url: session.metadata.audio_file_url || null,
      })
      .select()
      .single();

    if (insertError) {
      logStep("Insert error", insertError);
      // Check if it's a duplicate (already processed)
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

    logStep("Submission created", { submissionId: submission.id });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Your song "${session.metadata.song_title}" has been submitted!`,
      submissionId: submission.id,
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
