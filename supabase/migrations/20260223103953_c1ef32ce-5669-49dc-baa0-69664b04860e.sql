
-- Allow team admins to manage payout preferences
CREATE POLICY "Team admins can view payout preferences"
ON public.payout_preferences FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.streamer_team_members stm
  WHERE stm.streamer_id = payout_preferences.streamer_id
    AND stm.user_id = auth.uid()
    AND stm.role = 'admin'::team_role
    AND stm.invitation_status = 'accepted'
));

CREATE POLICY "Team admins can insert payout preferences"
ON public.payout_preferences FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.streamer_team_members stm
  WHERE stm.streamer_id = payout_preferences.streamer_id
    AND stm.user_id = auth.uid()
    AND stm.role = 'admin'::team_role
    AND stm.invitation_status = 'accepted'
));

CREATE POLICY "Team admins can update payout preferences"
ON public.payout_preferences FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.streamer_team_members stm
  WHERE stm.streamer_id = payout_preferences.streamer_id
    AND stm.user_id = auth.uid()
    AND stm.role = 'admin'::team_role
    AND stm.invitation_status = 'accepted'
));

CREATE POLICY "Team admins can delete payout preferences"
ON public.payout_preferences FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.streamer_team_members stm
  WHERE stm.streamer_id = payout_preferences.streamer_id
    AND stm.user_id = auth.uid()
    AND stm.role = 'admin'::team_role
    AND stm.invitation_status = 'accepted'
));
