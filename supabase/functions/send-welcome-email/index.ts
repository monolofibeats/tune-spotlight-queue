import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { wrapEmail } from "../_shared/email-wrapper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const siteUrl = Deno.env.get("SITE_URL") || "https://upstargg.lovable.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, type } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ success: false, error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendKey);

    if (type === "welcome") {
      await resend.emails.send({
        from: "UpStar <info@upstar.gg>",
        to: [email],
        subject: "Welcome to UpStar! 🎵",
        html: wrapEmail(
          "🌟 Welcome to UpStar!",
          `<p>Your account has been created successfully.</p>
           <p>You can now submit songs, track your submissions, and more.</p>
           <p style="color:#888;font-size:12px;">If you didn't create this account, you can safely ignore this email.</p>`,
          `${siteUrl}/auth`,
          "Go to UpStar →",
        ),
      });

      console.log("[WELCOME-EMAIL] Sent welcome email to", email);
    } else if (type === "password-reset") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${siteUrl}/auth`,
        },
      });

      if (linkError || !linkData?.properties?.action_link) {
        console.error("[WELCOME-EMAIL] Magic link generation failed:", linkError?.message);
        return new Response(JSON.stringify({ success: false, error: "Could not generate reset link" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await resend.emails.send({
        from: "UpStar <info@upstar.gg>",
        to: [email],
        subject: "Reset your UpStar password",
        html: wrapEmail(
          "🔑 Reset Your Password",
          `<p>We received a request to reset your UpStar password.</p>
           <p>Click the button below to log in and set a new password.</p>
           <p style="color:#888;font-size:12px;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>`,
          linkData.properties.action_link,
          "Log in to UpStar →",
        ),
      });

      console.log("[WELCOME-EMAIL] Sent password reset email to", email);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[WELCOME-EMAIL] Error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
