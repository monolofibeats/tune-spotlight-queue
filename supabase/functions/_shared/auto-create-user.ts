import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

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
): Promise<{ userId: string | null; created: boolean }> {
  if (!email) {
    logStep('AUTO-ACCOUNT', 'No email provided, skipping');
    return { userId: null, created: false };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    // Check if user already exists by email
    const { data: userList } = await supabase.auth.admin.listUsers();
    const existingUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      logStep('AUTO-ACCOUNT', 'User already exists', { userId: existingUser.id, email });
      return { userId: existingUser.id, created: false };
    }

    // Create the user with a random password (magic link only)
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
    });

    if (createError) {
      logStep('AUTO-ACCOUNT', 'Failed to create user', { error: createError.message });
      return { userId: null, created: false };
    }

    logStep('AUTO-ACCOUNT', 'User created', { userId: newUser.user.id, email });

    // Generate magic link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${siteUrl}/my-dashboard`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      logStep('AUTO-ACCOUNT', 'Magic link generation failed', { error: linkError?.message });
    } else {
      // Send the magic link via Resend
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        try {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: "UpStar <noreply@upstar.gg>",
            to: [email],
            subject: "Your song was submitted! Log in to track it 🎵",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
                <h1 style="font-size: 24px; margin-bottom: 16px;">Your submission is in! 🎶</h1>
                <p style="color: #666; font-size: 16px; line-height: 1.5;">
                  Thanks for your submission. We've created an account for you so you can track your song's progress.
                </p>
                <p style="margin: 24px 0;">
                  <a href="${linkData.properties.action_link}" 
                     style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    Log in to your dashboard →
                  </a>
                </p>
                <p style="color: #999; font-size: 13px;">
                  This link expires in 24 hours. You can always request a new one from the login page.
                </p>
              </div>
            `,
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

    return { userId: newUser.user.id, created: true };
  } catch (err) {
    logStep('AUTO-ACCOUNT', 'Error in auto-create', { error: String(err) });
    return { userId: null, created: false };
  }
}
