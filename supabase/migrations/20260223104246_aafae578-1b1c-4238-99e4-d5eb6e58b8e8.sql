
CREATE POLICY "Team admins can create payout requests"
ON public.payout_requests FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.streamer_team_members stm
  WHERE stm.streamer_id = payout_requests.streamer_id
    AND stm.user_id = auth.uid()
    AND stm.role = 'admin'::team_role
    AND stm.invitation_status = 'accepted'
));

CREATE POLICY "Team admins can view payout requests"
ON public.payout_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.streamer_team_members stm
  WHERE stm.streamer_id = payout_requests.streamer_id
    AND stm.user_id = auth.uid()
    AND stm.role = 'admin'::team_role
    AND stm.invitation_status = 'accepted'
));
