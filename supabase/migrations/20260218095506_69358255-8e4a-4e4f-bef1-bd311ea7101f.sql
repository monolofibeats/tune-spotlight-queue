-- Allow team editors and admins to update the streamer profile
CREATE POLICY "Team editors and admins can update streamer profile"
ON public.streamers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.streamer_team_members stm
    WHERE stm.streamer_id = streamers.id
      AND stm.user_id = auth.uid()
      AND stm.role = ANY (ARRAY['editor'::team_role, 'admin'::team_role])
      AND stm.invitation_status = 'accepted'
  )
);

-- Allow team members to log content changes
CREATE POLICY "Team members can log content changes"
ON public.streamer_content_changes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.streamer_team_members stm
    WHERE stm.streamer_id = streamer_content_changes.streamer_id
      AND stm.user_id = auth.uid()
      AND stm.role = ANY (ARRAY['editor'::team_role, 'admin'::team_role])
      AND stm.invitation_status = 'accepted'
  )
);