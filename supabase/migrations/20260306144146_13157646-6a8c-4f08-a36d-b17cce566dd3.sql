CREATE POLICY "Anyone can view top song submissions"
ON public.submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.streamer_top_songs ts
    WHERE ts.submission_id = submissions.id
      AND ts.is_active = true
  )
);