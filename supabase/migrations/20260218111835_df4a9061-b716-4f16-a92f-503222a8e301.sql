
-- Drop and recreate stream_sessions policies with explicit INSERT policies
DROP POLICY IF EXISTS "Streamers can manage their own sessions" ON public.stream_sessions;
DROP POLICY IF EXISTS "Admins can manage stream sessions" ON public.stream_sessions;
DROP POLICY IF EXISTS "Anyone can view stream sessions" ON public.stream_sessions;

-- Recreate with explicit per-command policies
CREATE POLICY "Anyone can view stream sessions"
  ON public.stream_sessions FOR SELECT
  USING (true);

CREATE POLICY "Streamers can insert their own sessions"
  ON public.stream_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.streamers
      WHERE streamers.user_id = auth.uid()
        AND streamers.id = stream_sessions.streamer_id
    )
  );

CREATE POLICY "Streamers can update their own sessions"
  ON public.stream_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.streamers
      WHERE streamers.user_id = auth.uid()
        AND streamers.id = stream_sessions.streamer_id
    )
  );

CREATE POLICY "Streamers can delete their own sessions"
  ON public.stream_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.streamers
      WHERE streamers.user_id = auth.uid()
        AND streamers.id = stream_sessions.streamer_id
    )
  );

CREATE POLICY "Admins can manage stream sessions"
  ON public.stream_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Drop and recreate stream_config policies with explicit INSERT policies
DROP POLICY IF EXISTS "Streamers can manage their own stream config" ON public.stream_config;
DROP POLICY IF EXISTS "Admins can manage stream config" ON public.stream_config;
DROP POLICY IF EXISTS "Anyone can view stream config" ON public.stream_config;

-- Recreate with explicit per-command policies
CREATE POLICY "Anyone can view stream config"
  ON public.stream_config FOR SELECT
  USING (true);

CREATE POLICY "Streamers can insert their own stream config"
  ON public.stream_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.streamers
      WHERE streamers.user_id = auth.uid()
        AND streamers.id = stream_config.streamer_id
    )
  );

CREATE POLICY "Streamers can update their own stream config"
  ON public.stream_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.streamers
      WHERE streamers.user_id = auth.uid()
        AND streamers.id = stream_config.streamer_id
    )
  );

CREATE POLICY "Streamers can delete their own stream config"
  ON public.stream_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.streamers
      WHERE streamers.user_id = auth.uid()
        AND streamers.id = stream_config.streamer_id
    )
  );

CREATE POLICY "Admins can manage stream config"
  ON public.stream_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
