import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, streamer_id } = await req.json();

    if (!email || !role || !streamer_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user owns this streamer profile
    const { data: streamer, error: streamerError } = await supabaseClient
      .from("streamers")
      .select("id, display_name, slug, user_id")
      .eq("id", streamer_id)
      .single();

    if (streamerError || !streamer) {
      return new Response(JSON.stringify({ error: "Streamer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is owner or team admin
    const isOwner = streamer.user_id === user.id;
    if (!isOwner) {
      const { data: callerMembership } = await supabaseClient
        .from("streamer_team_members")
        .select("role")
        .eq("streamer_id", streamer_id)
        .eq("user_id", user.id)
        .eq("invitation_status", "accepted")
        .single();

      if (!callerMembership || callerMembership.role !== "admin") {
        return new Response(JSON.stringify({ error: "Not authorized to invite team members" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if already invited
    const { data: existing } = await supabaseClient
      .from("streamer_team_members")
      .select("id, invitation_status")
      .eq("streamer_id", streamer_id)
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: "This email has already been invited" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if the invited email has a user account
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const invitedUser = existingUser?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    // If the invited user already has an account, auto-accept the invitation
    const autoAccept = !!invitedUser?.id;

    // Create the team member record
    const { data: member, error: insertError } = await supabaseClient
      .from("streamer_team_members")
      .insert({
        streamer_id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        user_id: invitedUser?.id || null,
        invitation_status: autoAccept ? "accepted" : "pending",
        accepted_at: autoAccept ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send invitation email via Resend
    if (resendApiKey) {
      const roleLabels: Record<string, string> = {
        viewer: "Viewer",
        editor: "Editor / Manager",
        admin: "Administrator",
      };

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "UpStar <noreply@upstar.gg>",
            to: [email],
            subject: `You've been invited to join ${streamer.display_name}'s team on UpStar`,
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #f5a623;">🌟 UpStar Team Invitation</h1>
                <p>Hey there!</p>
                <p><strong>${streamer.display_name}</strong> has invited you to join their team on UpStar as a <strong>${roleLabels[role] || role}</strong>.</p>
                <p>As a team member, you'll be able to help manage their streamer dashboard.</p>
                <div style="margin: 30px 0;">
                  <a href="https://tune-spotlight-queue.lovable.app/auth" 
                     style="background: #f5a623; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Accept Invitation
                  </a>
                </div>
                <p style="color: #888; font-size: 14px;">
                  Sign in or create an account with this email address (${email}) to accept the invitation.
                </p>
              </div>
            `,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Don't fail the invitation if email fails
      }
    }

    return new Response(JSON.stringify({ success: true, member }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
