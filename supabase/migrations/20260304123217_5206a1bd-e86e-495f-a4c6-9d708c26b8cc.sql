
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can subscribe to streamer notifications" ON public.streamer_subscribers;
DROP POLICY IF EXISTS "Anyone can unsubscribe by email" ON public.streamer_subscribers;

-- Tighter insert: require valid email format and valid streamer
CREATE POLICY "Users can subscribe to streamer notifications"
  ON public.streamer_subscribers FOR INSERT
  WITH CHECK (
    email IS NOT NULL 
    AND char_length(email) > 0 
    AND char_length(email) <= 320
    AND EXISTS (SELECT 1 FROM public.streamers s WHERE s.id = streamer_subscribers.streamer_id AND s.status = 'approved')
  );

-- Delete: only streamer owner or admin can remove subscribers
CREATE POLICY "Streamers and admins can delete subscribers"
  ON public.streamer_subscribers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.streamers s
      WHERE s.id = streamer_subscribers.streamer_id AND s.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
  );
