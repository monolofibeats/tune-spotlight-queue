import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { wrapEmail } from "../_shared/email-wrapper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const siteUrl = Deno.env.get("SITE_URL") || "https://upstargg.lovable.app";

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-NOTIFICATION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// wrapEmail is now imported from _shared/email-wrapper.ts

// ── Notification type handlers ─────────────────────────────────────────
type NotificationType =
  | "team_invitation"
  | "payout_requested"
  | "payout_approved"
  | "payout_rejected"
  | "session_started"
  | "session_ended"
  | "profile_change"
  | "support_reply";

interface NotificationPayload {
  type: NotificationType;
  // Contextual data varies per type
  [key: string]: unknown;
}

interface EmailData {
  to: string[];
  subject: string;
  html: string;
}

async function buildEmails(
  payload: NotificationPayload,
  supabase: ReturnType<typeof createClient>,
): Promise<EmailData[]> {
  const emails: EmailData[] = [];

  switch (payload.type) {
    // ── Team invitation ──────────────────────────────────────────────
    case "team_invitation": {
      const { email, streamer_name, role, slug } = payload as any;
      const roleLabels: Record<string, string> = { viewer: "Viewer", editor: "Editor / Manager", admin: "Administrator" };
      emails.push({
        to: [email],
        subject: `You've been invited to join ${streamer_name}'s team on UpStar`,
        html: wrapEmail(
          "🌟 Team Invitation",
          `<p><strong>${streamer_name}</strong> has invited you to join their team on UpStar as a <strong>${roleLabels[role] || role}</strong>.</p>
           <p>As a team member, you'll be able to help manage their streamer dashboard.</p>
           <p style="color:#888;font-size:13px;margin-top:16px;">Sign in or create an account with this email address (${email}) to accept the invitation.</p>`,
          `${siteUrl}/auth`,
          "Accept Invitation",
        ),
      });
      break;
    }

    // ── Payout requested (notify admin) ──────────────────────────────
    case "payout_requested": {
      const { streamer_name, amount, currency, payout_method } = payload as any;
      // Notify all platform admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins?.length) {
        const adminIds = admins.map((a: any) => a.user_id);
        const { data: adminUsers } = await supabase.auth.admin.listUsers();
        const adminEmails = adminUsers?.users
          ?.filter((u: any) => adminIds.includes(u.id) && u.email)
          .map((u: any) => u.email!) || [];

        if (adminEmails.length) {
          emails.push({
            to: adminEmails,
            subject: `💸 Payout Request: ${streamer_name} – ${amount}`,
            html: wrapEmail(
              "💸 New Payout Request",
              `<p><strong>${streamer_name}</strong> has requested a payout.</p>
               <p><strong>Amount:</strong> ${amount}<br/>
               <strong>Method:</strong> ${payout_method === "paypal" ? "PayPal" : "Bank Transfer"}<br/>
               <strong>Currency:</strong> ${currency?.toUpperCase()}</p>`,
              `${siteUrl}/admin`,
              "Review in Dashboard",
            ),
          });
        }
      }
      break;
    }

    // ── Payout approved / rejected (notify streamer) ─────────────────
    case "payout_approved":
    case "payout_rejected": {
      const { streamer_email, streamer_name, amount, admin_notes } = payload as any;
      const approved = payload.type === "payout_approved";
      const notesLine = admin_notes ? `<p><strong>Note:</strong> ${admin_notes}</p>` : "";
      emails.push({
        to: [streamer_email],
        subject: approved
          ? `✅ Your payout of ${amount} has been approved`
          : `❌ Your payout request was declined`,
        html: wrapEmail(
          approved ? "✅ Payout Approved" : "❌ Payout Declined",
          `<p>Hey ${streamer_name},</p>
           <p>${approved
             ? `Your payout of <strong>${amount}</strong> has been approved and will be transferred shortly.`
             : `Unfortunately, your payout request of <strong>${amount}</strong> was declined.`
           }</p>
           ${notesLine}`,
          `${siteUrl}/streamer/payments`,
          "View Payout Details",
        ),
      });
      break;
    }

    // ── Session started (notify team members + subscribers) ────────────
    case "session_started": {
      const { streamer_id, streamer_name, session_title, slug } = payload as any;

      // Notify team members
      const { data: teamMembers } = await supabase
        .from("streamer_team_members")
        .select("email")
        .eq("streamer_id", streamer_id)
        .eq("invitation_status", "accepted");

      const teamEmails = teamMembers?.map((m: any) => m.email).filter(Boolean) || [];
      if (teamEmails.length) {
        emails.push({
          to: teamEmails,
          subject: `🔴 ${streamer_name} just went live!`,
          html: wrapEmail(
            "🔴 Stream Started",
            `<p><strong>${streamer_name}</strong> has started a new session${session_title ? `: <em>"${session_title}"</em>` : ""}.</p>
             <p>Head to the dashboard to help manage submissions!</p>`,
            `${siteUrl}/streamer/${slug}/dashboard`,
            "Open Dashboard",
          ),
        });
      }

      // Notify subscribers (fans who signed up for go-live alerts)
      const { data: subscribers } = await supabase
        .from("streamer_subscribers")
        .select("email")
        .eq("streamer_id", streamer_id)
        .eq("is_active", true);

      const subscriberEmails = subscribers?.map((s: any) => s.email).filter(Boolean) || [];
      // Remove duplicates with team emails
      const uniqueSubscriberEmails = subscriberEmails.filter((e: string) => !teamEmails.includes(e));
      if (uniqueSubscriberEmails.length) {
        emails.push({
          to: uniqueSubscriberEmails,
          subject: `🔴 ${streamer_name} just went live!`,
          html: wrapEmail(
            "🔴 Stream Started",
            `<p><strong>${streamer_name}</strong> is now live${session_title ? ` – <em>"${session_title}"</em>` : ""}!</p>
             <p>Head over to their page and submit your song now 🎵</p>`,
            `${siteUrl}/streamer/${slug}`,
            "Go to Stream",
          ),
        });
      }
      break;
    }

    // ── Session ended (notify team members) ──────────────────────────
    case "session_ended": {
      const { streamer_id, streamer_name, slug } = payload as any;
      const { data: teamMembers } = await supabase
        .from("streamer_team_members")
        .select("email")
        .eq("streamer_id", streamer_id)
        .eq("invitation_status", "accepted");

      const teamEmails = teamMembers?.map((m: any) => m.email).filter(Boolean) || [];
      if (teamEmails.length) {
        emails.push({
          to: teamEmails,
          subject: `⏹ ${streamer_name}'s session has ended`,
          html: wrapEmail(
            "⏹ Session Ended",
            `<p><strong>${streamer_name}</strong>'s stream session has ended.</p>`,
          ),
        });
      }
      break;
    }

    // ── Profile change (notify streamer + admins) ────────────────────
    case "profile_change": {
      const { streamer_email, streamer_name, field_name, old_value, new_value } = payload as any;
      const fieldLabels: Record<string, string> = {
        display_name: "Display Name",
        email: "Email",
        slug: "Page URL",
        bio: "Bio",
      };
      const label = fieldLabels[field_name] || field_name;
      
      // Notify streamer
      emails.push({
        to: [streamer_email],
        subject: `✏️ Your ${label} was updated on UpStar`,
        html: wrapEmail(
          `✏️ ${label} Updated`,
          `<p>Hey ${streamer_name},</p>
           <p>Your <strong>${label}</strong> has been changed:</p>
           <p style="background:#1a1a1a;padding:12px;border-radius:6px;font-size:13px;">
             <span style="color:#888;">Before:</span> ${old_value || "(empty)"}<br/>
             <span style="color:#888;">After:</span> <strong>${new_value || "(empty)"}</strong>
           </p>
           <p style="color:#888;font-size:12px;">If you didn't make this change, please contact support immediately.</p>`,
        ),
      });
      break;
    }

    // ── Support reply ────────────────────────────────────────────────
    case "support_reply": {
      const { email, reply_message, original_message } = payload as any;
      emails.push({
        to: [email],
        subject: "📩 You got a reply from UpStar Support",
        html: wrapEmail(
          "📩 Support Reply",
          `<p>We've responded to your message:</p>
           <div style="background:#1a1a1a;padding:12px;border-radius:6px;margin-bottom:14px;">
             <p style="color:#888;font-size:12px;margin:0 0 4px;">Your message:</p>
             <p style="margin:0;font-size:13px;">${original_message || "(no message)"}</p>
           </div>
           <div style="background:#1a1a1a;border-left:3px solid #EAB308;padding:12px;border-radius:6px;">
             <p style="color:#EAB308;font-size:12px;margin:0 0 4px;">Our reply:</p>
             <p style="margin:0;font-size:14px;">${reply_message}</p>
           </div>`,
          siteUrl,
          "Visit UpStar",
        ),
      });
      break;
    }
  }

  return emails;
}

// ── Main handler ──────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed } = await checkRateLimit(clientIp, "send-notification", 20, 60);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      logStep("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const resend = new Resend(resendKey);
    const payload: NotificationPayload = await req.json();
    logStep("Payload received", { type: payload.type });

    const emailsToSend = await buildEmails(payload, supabase);
    logStep("Emails built", { count: emailsToSend.length });

    let sentCount = 0;
    for (const email of emailsToSend) {
      try {
        await resend.emails.send({
          from: "UpStar <noreply@upstar.gg>",
          to: email.to,
          subject: email.subject,
          html: email.html,
        });
        sentCount++;
        logStep("Email sent", { to: email.to, subject: email.subject });
      } catch (emailError) {
        logStep("Email send failed", { to: email.to, error: String(emailError) });
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
