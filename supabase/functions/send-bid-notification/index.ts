import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-BID-NOTIFICATION] ${step}${detailsStr}`);
};

const siteUrl = Deno.env.get("SITE_URL") || "https://upstargg.lovable.app";

function buildOutbidEmail(songTitle: string, artistName: string, offerAmount: string, ctaUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background-color: #000000; color: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="padding: 32px 24px 0 24px; text-align: center;">
        <div style="font-size: 28px; font-weight: 800; color: #EAB308; margin-bottom: 4px;">UpStar</div>
        <div style="font-size: 12px; color: #888; margin-bottom: 24px;">Song Review Platform</div>
      </div>
      <div style="padding: 0 24px 32px 24px;">
        <div style="background: linear-gradient(135deg, #1a1a1a, #111); border: 1px solid #333; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
          <div style="font-size: 13px; color: #EAB308; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">📈 You've Been Outbid</div>
          <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 12px 0;">Someone jumped ahead of you!</h2>
          <p style="color: #ccc; font-size: 14px; line-height: 1.6; margin: 0;">
            A higher bid was placed on your submission <strong style="color: #fff;">"${songTitle}"</strong> by <strong style="color: #fff;">${artistName}</strong>.
          </p>
        </div>

        <div style="background: #111; border: 1px solid #333; border-radius: 10px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Suggested counter-bid</div>
          <div style="font-size: 28px; font-weight: 800; color: #EAB308;">${offerAmount}</div>
          <div style="font-size: 12px; color: #888; margin-top: 4px;">to reclaim your spot</div>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${ctaUrl}" 
             style="display: inline-block; background: #EAB308; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
            Reclaim Your Spot →
          </a>
        </div>

        <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
          Higher bids get reviewed first. Don't miss your chance!
        </p>
      </div>
      <div style="border-top: 1px solid #222; padding: 16px 24px; text-align: center;">
        <p style="color: #555; font-size: 11px; margin: 0;">
          You received this email because you have a pending submission on UpStar.
        </p>
      </div>
    </div>
  `;
}

function buildReviewingEmail(songTitle: string, artistName: string, ctaUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background-color: #000000; color: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="padding: 32px 24px 0 24px; text-align: center;">
        <div style="font-size: 28px; font-weight: 800; color: #EAB308; margin-bottom: 4px;">UpStar</div>
        <div style="font-size: 12px; color: #888; margin-bottom: 24px;">Song Review Platform</div>
      </div>
      <div style="padding: 0 24px 32px 24px;">
        <div style="background: linear-gradient(135deg, #1a1a1a, #111); border: 1px solid #333; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
          <div style="font-size: 13px; color: #EAB308; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">🎵 Now Reviewing</div>
          <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 12px 0;">Your song is being reviewed!</h2>
          <p style="color: #ccc; font-size: 14px; line-height: 1.6; margin: 0;">
            Great news! <strong style="color: #fff;">"${songTitle}"</strong> by <strong style="color: #fff;">${artistName}</strong> is now being reviewed live.
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${ctaUrl}" 
             style="display: inline-block; background: #EAB308; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
            View Your Songs →
          </a>
        </div>
      </div>
      <div style="border-top: 1px solid #222; padding: 16px 24px; text-align: center;">
        <p style="color: #555; font-size: 11px; margin: 0;">
          You received this email because you have a submission on UpStar.
        </p>
      </div>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get unsent notifications
    const { data: notifications, error: fetchError } = await supabaseAdmin
      .from('bid_notifications')
      .select(`
        *,
        submissions (
          song_title,
          artist_name,
          streamer_id
        )
      `)
      .eq('is_email_sent', false)
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      logStep("No pending notifications");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found notifications to send", { count: notifications.length });

    let sentCount = 0;
    const errors: string[] = [];

    for (const notification of notifications) {
      try {
        const songTitle = notification.submissions?.song_title || 'Your song';
        const artistName = notification.submissions?.artist_name || 'Unknown';
        const streamerId = notification.submissions?.streamer_id;
        const offerAmount = notification.offer_amount_cents 
          ? `€${(notification.offer_amount_cents / 100).toFixed(2)}` 
          : 'a new amount';

        // Look up streamer slug for redirect
        let streamerSlug = '';
        if (streamerId) {
          const { data: streamer } = await supabaseAdmin
            .from('streamers')
            .select('slug')
            .eq('id', streamerId)
            .maybeSingle();
          streamerSlug = streamer?.slug || '';
        }

        // Generate magic link for the user
        let ctaUrl = `${siteUrl}/my-songs`;
        try {
          const redirectPath = notification.notification_type === 'outbid' && streamerSlug
            ? `${siteUrl}/${streamerSlug}/submit?outbid=${notification.submission_id}`
            : `${siteUrl}/user/dashboard`;

          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: notification.email,
            options: {
              redirectTo: redirectPath,
            },
          });

          if (!linkError && linkData?.properties?.action_link) {
            ctaUrl = linkData.properties.action_link;
            logStep("Magic link generated", { email: notification.email });
          } else {
            logStep("Magic link failed, using direct link", { error: linkError?.message });
          }
        } catch (mlErr) {
          logStep("Magic link error (non-fatal)", { error: String(mlErr) });
        }

        let subject = '';
        let htmlContent = '';

        if (notification.notification_type === 'outbid') {
          subject = `Someone outbid you on "${songTitle}"! 📈`;
          htmlContent = buildOutbidEmail(songTitle, artistName, offerAmount, ctaUrl);
        } else if (notification.notification_type === 'reviewing') {
          subject = `Your song "${songTitle}" is being reviewed! 🎵`;
          htmlContent = buildReviewingEmail(songTitle, artistName, ctaUrl);
        }

        if (subject && htmlContent) {
          const emailResponse = await resend.emails.send({
            from: "UpStar <noreply@upstar.gg>",
            to: [notification.email],
            subject,
            html: htmlContent,
          });

          logStep("Email sent", { email: notification.email, response: emailResponse });

          // Mark as sent
          await supabaseAdmin
            .from('bid_notifications')
            .update({ is_email_sent: true })
            .eq('id', notification.id);

          sentCount++;
        }
      } catch (emailError) {
        const errorMsg = emailError instanceof Error ? emailError.message : String(emailError);
        errors.push(`Failed to send to ${notification.email}: ${errorMsg}`);
        logStep("Email send failed", { email: notification.email, error: errorMsg });
      }
    }

    logStep("Completed", { sent: sentCount, errors: errors.length });

    return new Response(JSON.stringify({ 
      sent: sentCount, 
      errors: errors.length > 0 ? errors : undefined 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
