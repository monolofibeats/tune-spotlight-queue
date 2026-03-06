CREATE POLICY "Team members can view earnings"
ON public.streamer_earnings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.streamer_team_members stm
    WHERE stm.streamer_id = streamer_earnings.streamer_id
      AND stm.user_id = auth.uid()
      AND stm.invitation_status = 'accepted'
  )
);