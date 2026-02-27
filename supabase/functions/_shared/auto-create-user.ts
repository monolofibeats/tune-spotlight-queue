import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";
import { wrapEmail } from "./email-wrapper.ts";

const logStep = (prefix: string, step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${prefix}] ${step}${detailsStr}`);
};

/**
 * Auto-create a user account from a Stripe checkout email and send a magic link.
 * If the user already exists, this is a no-op.
 */
export async function autoCreateUserFromPayment(
  email: string | null | undefined,
  siteUrl: string,
  redirectPath?: string,
): Promise<{ userId: string | null; created: boolean; actionLink: string | null; hashedToken: string | null }> {
  if (!email) {
    logStep('AUTO-ACCOUNT', 'No email provided, skipping');
    return { userId: null, created: false, actionLink: null, hashedToken: null };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    // Try to create the user directly — handle "already exists" gracefully
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
    });

    if (createError) {
      // User already exists — look them up and generate a magic link for auto-login
      if (createError.message?.includes('already') || createError.message?.includes('duplicate')) {
        logStep('AUTO-ACCOUNT', 'User already exists, generating login link', { email });

        const { data: probeData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: `${siteUrl}${redirectPath || '/user/dashboard'}` },
        });
        if (probeData?.user?.id) {
          return {
            userId: probeData.user.id,
            created: false,
            actionLink: probeData.properties?.action_link || null,
            hashedToken: probeData.properties?.hashed_token || null,
          };
        }

        return { userId: null, created: false, actionLink: null, hashedToken: null };
      }
      logStep('AUTO-ACCOUNT', 'Failed to create user', { error: createError.message });
      return { userId: null, created: false, actionLink: null, hashedToken: null };
    }

    logStep('AUTO-ACCOUNT', 'User created', { userId: newUser.user.id, email });

    // Generate magic link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${siteUrl}${redirectPath || '/user/dashboard'}`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      logStep('AUTO-ACCOUNT', 'Magic link generation failed', { error: linkError?.message });
    } else {
      // Send the magic link via Resend using the branded template
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        try {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: "UpStar <noreply@upstar.gg>",
            to: [email],
            subject: "Your song was submitted! Log in to track it 🎵",
            html: wrapEmail(
              "🎶 Your Submission Is In!",
              `<p>Thanks for your submission! We've created an account for you so you can track your song's progress.</p>
               <p style="color:#888;font-size:12px;">This link expires in 24 hours. You can always request a new one from the login page.</p>`,
              linkData.properties.action_link,
              "Log in to your dashboard →",
            ),
          });
          logStep('AUTO-ACCOUNT', 'Magic link email sent', { email });
        } catch (emailErr) {
          logStep('AUTO-ACCOUNT', 'Failed to send email', { error: String(emailErr) });
        }
      } else {
        logStep('AUTO-ACCOUNT', 'RESEND_API_KEY not set, skipping email');
      }
    }

    // Add the 'user' role
    await supabase.from('user_roles').insert({
      user_id: newUser.user.id,
      role: 'user',
    });

    return { userId: newUser.user.id, created: true, actionLink: linkData?.properties?.action_link || null, hashedToken: linkData?.properties?.hashed_token || null };
  } catch (err) {
    logStep('AUTO-ACCOUNT', 'Error in auto-create', { error: String(err) });
    return { userId: null, created: false, actionLink: null, hashedToken: null };
  }
}
