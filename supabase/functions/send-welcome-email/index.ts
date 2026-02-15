import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
            <h1 style="font-size: 24px; margin-bottom: 16px;">Welcome to UpStar! 🌟</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Your account has been created successfully. You can now submit songs, track your submissions, and more.
            </p>
            <p style="margin: 24px 0;">
              <a href="https://upstar.gg/auth" 
                 style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Go to UpStar →
              </a>
            </p>
            <p style="color: #999; font-size: 13px;">
              If you didn't create this account, you can safely ignore this email.
            </p>
          </div>
        `,
      });

      console.log("[WELCOME-EMAIL] Sent welcome email to", email);
    } else if (type === "password-reset") {
      // Generate a magic link for password reset
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: "https://upstar.gg/auth",
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
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
            <h1 style="font-size: 24px; margin-bottom: 16px;">Reset your password</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              We received a request to reset your UpStar password. Click the button below to log in and set a new password.
            </p>
            <p style="margin: 24px 0;">
              <a href="${linkData.properties.action_link}" 
                 style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Log in to UpStar →
              </a>
            </p>
            <p style="color: #999; font-size: 13px;">
              This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
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
