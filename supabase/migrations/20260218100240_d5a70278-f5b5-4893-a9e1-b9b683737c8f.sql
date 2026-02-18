-- Allow team editors and admins to manage streamer form fields
CREATE POLICY "Team editors and admins can manage form fields"
ON public.streamer_form_fields
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.streamer_team_members stm
    WHERE stm.streamer_id = streamer_form_fields.streamer_id
      AND stm.user_id = auth.uid()
      AND stm.role = ANY (ARRAY['editor'::team_role, 'admin'::team_role])
      AND stm.invitation_status = 'accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.streamer_team_members stm
    WHERE stm.streamer_id = streamer_form_fields.streamer_id
      AND stm.user_id = auth.uid()
      AND stm.role = ANY (ARRAY['editor'::team_role, 'admin'::team_role])
      AND stm.invitation_status = 'accepted'
  )
);