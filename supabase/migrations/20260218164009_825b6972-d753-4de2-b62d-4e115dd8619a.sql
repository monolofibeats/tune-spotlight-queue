
-- Fix RLS policies to strictly enforce team role permissions

-- SUBMISSIONS: Viewers can only SELECT, not update/delete
-- The existing "Streamers and team can update/delete submissions" already requires editor/admin
-- But let's make it explicit and clean

-- Drop the overly broad "Streamers and team can view submissions" which allows all team members to see
-- and recreate it correctly (it already works for SELECT, that's fine for viewers)

-- The real problem: "Streamers and team can update submissions" already gates on editor/admin
-- But let's verify streamer_team_members viewer-only for other tables too

-- STREAMER_FORM_FIELDS: Viewers should NOT be able to manage
DROP POLICY IF EXISTS "Streamers can manage their own form fields" ON public.streamer_form_fields;
CREATE POLICY "Streamers can manage their own form fields"
ON public.streamer_form_fields FOR ALL
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM public.streamers WHERE streamers.id = streamer_form_fields.streamer_id AND streamers.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.streamers WHERE streamers.id = streamer_form_fields.streamer_id AND streamers.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- STREAMER_PRESETS: Viewers should NOT manage presets - already gated to editor/admin in existing policy
-- "Streamers and team can manage presets" already checks editor/admin - good.

-- STREAM_CONFIG: Viewers should NOT manage stream config - already gated to editor/admin - good.

-- STREAM_SESSIONS: Viewers should NOT create/update sessions - already gated to editor/admin - good.

-- STREAMER_TEAM_MEMBERS: Viewers should NOT be able to manage team
-- The existing policies gate management to streamer owner + team admins - good.

-- PAYOUT_PREFERENCES & PAYOUT_REQUESTS: Only streamer owner can manage - already done - good.

-- Make the "Streamers and team can update submissions" policy explicitly require editor/admin (it already does)
-- But double-check: the current policy already has role = ANY (ARRAY['editor', 'admin']) - correct.

-- PRICING_CONFIG: Viewers should NOT manage pricing - already gated to editor/admin - good.

-- Summary: the DB-level RLS is mostly correct.
-- The main fix needed is in the UI (StreamerDashboard) to check team role client-side.
-- We add a DB function to safely get the current user's team role for a given streamer.

CREATE OR REPLACE FUNCTION public.get_team_role(_streamer_id uuid, _user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.streamer_team_members
  WHERE streamer_id = _streamer_id
    AND user_id = _user_id
    AND invitation_status = 'accepted'
  LIMIT 1;
$$;
