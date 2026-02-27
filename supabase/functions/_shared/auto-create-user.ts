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
    // Try to create the user directly — handle "already exists" gracefully
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
    });

    if (createError) {
      // User already exists — look them up
      if (createError.message?.includes('already') || createError.message?.includes('duplicate')) {
        logStep('AUTO-ACCOUNT', 'User already exists', { email });

        // Primary lookup: profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('display_email', email.toLowerCase())
          .maybeSingle();
        
        if (profileData?.user_id) {
          return { userId: profileData.user_id, created: false };
        }

        // Secondary lookup: user_roles table (all paying users get a role)
        const { data: roleUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .limit(500);

        if (roleUsers?.length) {
          // Check each user_id against auth — but more efficient: use admin API with email filter
          // The admin.listUsers doesn't support email filter, so we use generateLink as a probe
          const { data: probeData } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: { redirectTo: siteUrl },
          });
          if (probeData?.user?.id) {
            return { userId: probeData.user.id, created: false };
          }
        }

        return { userId: null, created: false };
      }
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
