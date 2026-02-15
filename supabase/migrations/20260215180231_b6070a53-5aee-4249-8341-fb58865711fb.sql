
-- Fix submissions RLS: allow team members (editor/admin) to update and delete
DROP POLICY IF EXISTS "Streamers can update their submissions" ON public.submissions;
CREATE POLICY "Streamers and team can update submissions"
  ON public.submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM streamers
      WHERE streamers.id = submissions.streamer_id
        AND streamers.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM streamer_team_members
      WHERE streamer_team_members.streamer_id = submissions.streamer_id
        AND streamer_team_members.user_id = auth.uid()
        AND streamer_team_members.role IN ('editor', 'admin')
        AND streamer_team_members.invitation_status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Streamers can delete their submissions" ON public.submissions;
CREATE POLICY "Streamers and team can delete submissions"
  ON public.submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM streamers
      WHERE streamers.id = submissions.streamer_id
        AND streamers.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM streamer_team_members
      WHERE streamer_team_members.streamer_id = submissions.streamer_id
        AND streamer_team_members.user_id = auth.uid()
        AND streamer_team_members.role IN ('editor', 'admin')
        AND streamer_team_members.invitation_status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Streamers can view their streamer submissions" ON public.submissions;
CREATE POLICY "Streamers and team can view submissions"
  ON public.submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM streamers
      WHERE streamers.id = submissions.streamer_id
        AND streamers.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM streamer_team_members
      WHERE streamer_team_members.streamer_id = submissions.streamer_id
        AND streamer_team_members.user_id = auth.uid()
        AND streamer_team_members.invitation_status = 'accepted'
    )
  );

-- Fix pricing_config RLS: allow team members and add WITH CHECK for streamers
DROP POLICY IF EXISTS "Streamers can manage their own pricing" ON public.pricing_config;
CREATE POLICY "Streamers and team can manage pricing"
  ON public.pricing_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM streamers
      WHERE streamers.id = pricing_config.streamer_id
        AND streamers.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM streamer_team_members
      WHERE streamer_team_members.streamer_id = pricing_config.streamer_id
        AND streamer_team_members.user_id = auth.uid()
        AND streamer_team_members.role IN ('editor', 'admin')
        AND streamer_team_members.invitation_status = 'accepted'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM streamers
      WHERE streamers.id = pricing_config.streamer_id
        AND streamers.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM streamer_team_members
      WHERE streamer_team_members.streamer_id = pricing_config.streamer_id
        AND streamer_team_members.user_id = auth.uid()
        AND streamer_team_members.role IN ('editor', 'admin')
        AND streamer_team_members.invitation_status = 'accepted'
    )
  );
