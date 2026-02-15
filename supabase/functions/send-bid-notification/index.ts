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
          artist_name
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
        const offerAmount = notification.offer_amount_cents 
          ? `€${(notification.offer_amount_cents / 100).toFixed(2)}` 
          : 'a new amount';

        let subject = '';
        let htmlContent = '';

        if (notification.notification_type === 'outbid') {
          subject = `Someone outbid you on "${songTitle}"! 📈`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">You've Been Outbid!</h1>
              <p>Hi there,</p>
              <p>Someone has placed a higher bid on your submission "<strong>${songTitle}</strong>" by ${artistName}.</p>
              <p>To reclaim your position in the queue, you can place a new bid of <strong>${offerAmount}</strong> or more.</p>
              <div style="margin: 30px 0;">
                <a href="https://tune-spotlight-queue.lovable.app/my-songs" 
                   style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Place New Bid
                </a>
              </div>
              <p style="color: #666;">Higher bids get reviewed first. Don't miss your chance!</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">You received this email because you have a pending submission on UpStar.</p>
            </div>
          `;
        } else if (notification.notification_type === 'reviewing') {
          subject = `Your song "${songTitle}" is being reviewed! 🎵`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">Your Song Is Being Reviewed!</h1>
              <p>Hi there,</p>
              <p>Great news! Your submission "<strong>${songTitle}</strong>" by ${artistName} is now being reviewed.</p>
              <p>You'll receive another notification once the review is complete.</p>
              <div style="margin: 30px 0;">
                <a href="https://tune-spotlight-queue.lovable.app/my-songs" 
                   style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  View Your Songs
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">You received this email because you have a submission on UpStar.</p>
            </div>
          `;
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
