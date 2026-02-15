
-- Fix: Make team member SELECT policies PERMISSIVE so at least one can grant access

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Team members can view own membership" ON streamer_team_members;

-- Recreate as PERMISSIVE
CREATE POLICY "Team members can view own membership"
ON streamer_team_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Also make the streamer owner SELECT permissive (currently covered by ALL which is restrictive)
-- We need a permissive SELECT for owners too
CREATE POLICY "Streamers can view their team members"
ON streamer_team_members
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM streamers s
  WHERE s.id = streamer_team_members.streamer_id AND s.user_id = auth.uid()
));

-- And admins need permissive SELECT
CREATE POLICY "Admins can view all team members"
ON streamer_team_members
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
