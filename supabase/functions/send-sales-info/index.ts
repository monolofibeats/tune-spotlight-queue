import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { wrapEmail } from "../_shared/email-wrapper.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit: 10 requests per 300 seconds (admin email sending)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitResult = await checkRateLimit(clientIp, "send-sales-info", 10, 300);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(corsHeaders, rateLimitResult.retryAfterSeconds);
    }

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // Verify admin role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');
    if (!roles || roles.length === 0) throw new Error('Forbidden');

    const { email, inquiryId } = await req.json();
    if (!email || !inquiryId) throw new Error('Missing email or inquiryId');

    // Send info email via Resend using branded template
    const bodyHtml = `
      <h3 style="font-size:15px;margin:20px 0 8px;color:#EAB308;">💰 Revenue & Earnings</h3>
      <ul style="padding-left:20px;color:#ccc;font-size:13px;line-height:1.8;">
        <li><strong style="color:#fff;">80/20 revenue split</strong> – You keep 80% of all earnings (after processing fees)</li>
        <li>Multiple revenue streams: paid submissions, VIP queue, pre-stream spots, and bidding</li>
        <li>Flexible payouts via Bank/SEPA or PayPal (minimum €50 threshold)</li>
      </ul>
      
      <h3 style="font-size:15px;margin:20px 0 8px;color:#EAB308;">🎯 Platform Features</h3>
      <ul style="padding-left:20px;color:#ccc;font-size:13px;line-height:1.8;">
        <li>Fully customizable streamer page with your own branding</li>
        <li>Real-time submission queue with live stream integration</li>
        <li>Custom submission forms – choose what info you collect</li>
        <li>Team management – invite editors and admins</li>
        <li>Dashboard builder with drag-and-drop widgets</li>
        <li>Stem separation tool for isolating vocals and instruments</li>
      </ul>
      
      <h3 style="font-size:15px;margin:20px 0 8px;color:#EAB308;">📊 Platform Stats</h3>
      <ul style="padding-left:20px;color:#ccc;font-size:13px;line-height:1.8;">
        <li>Growing community of music streamers and artists</li>
        <li>Industry-lowest platform fees at just 20%</li>
        <li>Secure Stripe payment processing</li>
        <li>Multi-language support (German & English)</li>
      </ul>
      
      <h3 style="font-size:15px;margin:20px 0 8px;color:#EAB308;">🚀 Getting Started</h3>
      <p>Joining is simple – apply through our platform and get set up within minutes once approved. We handle all the technical infrastructure so you can focus on reviewing music and growing your audience.</p>`;

    const emailHtml = wrapEmail(
      "Welcome to UpStar – Here's What We Offer",
      `<p>Hi there! Thank you for your interest in joining UpStar as a streamer.</p>${bodyHtml}`,
      "https://upstar.gg",
      "Visit UpStar →",
    );

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'UpStar <noreply@upstar.gg>',
        to: [email],
        subject: 'Welcome to UpStar – Platform Overview & Stats',
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend error: ${errText}`);
    }

    // Mark inquiry as email_sent
    await supabaseAdmin
      .from('sales_inquiries')
      .update({ status: 'email_sent', processed_at: new Date().toISOString(), processed_by: user.id })
      .eq('id', inquiryId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
