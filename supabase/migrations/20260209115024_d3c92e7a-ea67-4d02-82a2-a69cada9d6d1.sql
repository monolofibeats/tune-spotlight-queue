-- Allow streamers to update and delete their own streamer's submissions
CREATE POLICY "Streamers can update their submissions"
ON public.submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM streamers
    WHERE streamers.id = submissions.streamer_id
    AND streamers.user_id = auth.uid()
  )
);

CREATE POLICY "Streamers can delete their submissions"
ON public.submissions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM streamers
    WHERE streamers.id = submissions.streamer_id
    AND streamers.user_id = auth.uid()
  )
);

-- Streamers should also see all their submissions (including non-pending)
CREATE POLICY "Streamers can view their streamer submissions"
ON public.submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM streamers
    WHERE streamers.id = submissions.streamer_id
    AND streamers.user_id = auth.uid()
  )
);

-- Migrate any existing "reviewing" status to "pending"
UPDATE public.submissions SET status = 'pending' WHERE status = 'reviewing';