import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (prefix: string, step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${prefix}] ${step}${detailsStr}`);
};

/**
 * Auto-create a user account from a Stripe checkout email and send a magic link.
 * If the user already exists, this is a no-op.
 * Uses the service role client to bypass RLS.
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
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Search by email using the admin API
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
      email_confirm: true, // Auto-confirm since they paid via Stripe
    });

    if (createError) {
      logStep('AUTO-ACCOUNT', 'Failed to create user', { error: createError.message });
      return { userId: null, created: false };
    }

    logStep('AUTO-ACCOUNT', 'User created', { userId: newUser.user.id, email });

    // Send magic link for login
    const { error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${siteUrl}/my-dashboard`,
      },
    });

    if (magicLinkError) {
      logStep('AUTO-ACCOUNT', 'Magic link generation failed', { error: magicLinkError.message });
      // User was still created — they can request a magic link later
    } else {
      logStep('AUTO-ACCOUNT', 'Magic link sent', { email });
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
