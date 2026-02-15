
-- Drop the recursive policy that causes infinite recursion
DROP POLICY IF EXISTS "Team admins can manage members" ON streamer_team_members;

-- Recreate it using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_team_admin(_streamer_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.streamer_team_members
    WHERE streamer_id = _streamer_id
      AND user_id = _user_id
      AND role = 'admin'::team_role
      AND invitation_status = 'accepted'
  )
$$;

-- Recreate the policy using the function
CREATE POLICY "Team admins can manage members"
ON streamer_team_members
FOR ALL
USING (public.is_team_admin(streamer_team_members.streamer_id, auth.uid()));
