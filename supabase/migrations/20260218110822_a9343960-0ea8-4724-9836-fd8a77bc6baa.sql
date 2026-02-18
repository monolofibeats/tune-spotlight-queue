
-- Allow streamers to manage their own stream sessions
CREATE POLICY "Streamers can manage their own sessions"
ON public.stream_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.streamers
    WHERE streamers.user_id = auth.uid()
    AND (
      streamers.id = stream_sessions.streamer_id
      OR stream_sessions.streamer_id IS NULL
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.streamers
    WHERE streamers.user_id = auth.uid()
    AND (
      streamers.id = stream_sessions.streamer_id
      OR stream_sessions.streamer_id IS NULL
    )
  )
);

-- Allow streamers to manage stream_config for their own streamer record
CREATE POLICY "Streamers can manage their own stream config"
ON public.stream_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.streamers
    WHERE streamers.user_id = auth.uid()
    AND (
      streamers.id = stream_config.streamer_id
      OR stream_config.streamer_id IS NULL
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.streamers
    WHERE streamers.user_id = auth.uid()
    AND (
      streamers.id = stream_config.streamer_id
      OR stream_config.streamer_id IS NULL
    )
  )
);
