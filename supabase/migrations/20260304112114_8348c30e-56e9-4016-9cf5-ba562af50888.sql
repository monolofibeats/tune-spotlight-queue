
DROP POLICY "Authenticated users can insert scores" ON public.star_trail_scores;

CREATE POLICY "Streamers can insert own scores"
  ON public.star_trail_scores FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.streamers s
      WHERE s.id = star_trail_scores.streamer_id
        AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.streamer_team_members stm
      WHERE stm.streamer_id = star_trail_scores.streamer_id
        AND stm.user_id = auth.uid()
        AND stm.invitation_status = 'accepted'
    )
  );
