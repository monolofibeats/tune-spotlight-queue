-- Fix stream_sessions INSERT policy to allow team members (editor/admin)
DROP POLICY IF EXISTS "Streamers can insert their own sessions" ON public.stream_sessions;

CREATE POLICY "Streamers and team can insert sessions"
  ON public.stream_sessions FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM public.streamers
      WHERE streamers.user_id = auth.uid()
        AND streamers.id = stream_sessions.streamer_id
    ))
    OR
    (EXISTS (
      SELECT 1 FROM public.streamer_team_members stm
      WHERE stm.streamer_id = stream_sessions.streamer_id
        AND stm.user_id = auth.uid()
        AND stm.role = ANY (ARRAY['editor'::team_role, 'admin'::team_role])
        AND stm.invitation_status = 'accepted'
    ))
  );

-- Fix stream_sessions UPDATE policy to allow team members
DROP POLICY IF EXISTS "Streamers can update their own sessions" ON public.stream_sessions;

CREATE POLICY "Streamers and team can update sessions"
  ON public.stream_sessions FOR UPDATE
  USING (
    (EXISTS (
      SELECT 1 FROM public.streamers
      WHERE streamers.user_id = auth.uid()
        AND streamers.id = stream_sessions.streamer_id
    ))
    OR
    (EXISTS (
      SELECT 1 FROM public.streamer_team_members stm
      WHERE stm.streamer_id = stream_sessions.streamer_id
        AND stm.user_id = auth.uid()
        AND stm.role = ANY (ARRAY['editor'::team_role, 'admin'::team_role])
        AND stm.invitation_status = 'accepted'
    ))
  );

-- Fix stream_config INSERT policy to allow team members
DROP POLICY IF EXISTS "Streamers can insert their own stream config" ON public.stream_config;

CREATE POLICY "Streamers and team can insert stream config"
  ON public.stream_config FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM public.streamers
      WHERE streamers.user_id = auth.uid()
        AND streamers.id = stream_config.streamer_id
    ))
    OR
    (EXISTS (
      SELECT 1 FROM public.streamer_team_members stm
      WHERE stm.streamer_id = stream_config.streamer_id
        AND stm.user_id = auth.uid()
        AND stm.role = ANY (ARRAY['editor'::team_role, 'admin'::team_role])
        AND stm.invitation_status = 'accepted'
    ))
  );

-- Fix stream_config UPDATE policy to allow team members
DROP POLICY IF EXISTS "Streamers can update their own stream config" ON public.stream_config;

CREATE POLICY "Streamers and team can update stream config"
  ON public.stream_config FOR UPDATE
  USING (
    (EXISTS (
      SELECT 1 FROM public.streamers
      WHERE streamers.user_id = auth.uid()
        AND streamers.id = stream_config.streamer_id
    ))
    OR
    (EXISTS (
      SELECT 1 FROM public.streamer_team_members stm
      WHERE stm.streamer_id = stream_config.streamer_id
        AND stm.user_id = auth.uid()
        AND stm.role = ANY (ARRAY['editor'::team_role, 'admin'::team_role])
        AND stm.invitation_status = 'accepted'
    ))
  );