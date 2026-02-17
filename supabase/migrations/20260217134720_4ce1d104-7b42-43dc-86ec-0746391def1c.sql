-- Allow team editors/admins to manage presets too
DROP POLICY IF EXISTS "Streamers can manage their own presets" ON public.streamer_presets;

CREATE POLICY "Streamers and team can manage presets"
ON public.streamer_presets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM streamers s
    WHERE s.id = streamer_presets.streamer_id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM streamer_team_members stm
    WHERE stm.streamer_id = streamer_presets.streamer_id
      AND stm.user_id = auth.uid()
      AND stm.role IN ('editor', 'admin')
      AND stm.invitation_status = 'accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM streamers s
    WHERE s.id = streamer_presets.streamer_id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM streamer_team_members stm
    WHERE stm.streamer_id = streamer_presets.streamer_id
      AND stm.user_id = auth.uid()
      AND stm.role IN ('editor', 'admin')
      AND stm.invitation_status = 'accepted'
  )
);