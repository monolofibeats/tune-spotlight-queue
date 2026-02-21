
-- Top songs pedestal for streamers
CREATE TABLE public.streamer_top_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 3),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(streamer_id, position, is_active)
);

-- Streamer setting for public visibility of top songs
ALTER TABLE public.streamers ADD COLUMN show_top_songs BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.streamer_top_songs ENABLE ROW LEVEL SECURITY;

-- Anyone can view active top songs for approved streamers (public pedestal)
CREATE POLICY "Anyone can view active top songs"
ON public.streamer_top_songs
FOR SELECT
USING (
  is_active = true AND EXISTS (
    SELECT 1 FROM public.streamers s
    WHERE s.id = streamer_top_songs.streamer_id
    AND s.status = 'approved'
  )
);

-- Streamers can manage their own top songs
CREATE POLICY "Streamers can manage own top songs"
ON public.streamer_top_songs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.streamers s
    WHERE s.id = streamer_top_songs.streamer_id AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.streamers s
    WHERE s.id = streamer_top_songs.streamer_id AND s.user_id = auth.uid()
  )
);

-- Team editors/admins can manage top songs
CREATE POLICY "Team can manage top songs"
ON public.streamer_top_songs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.streamer_team_members stm
    WHERE stm.streamer_id = streamer_top_songs.streamer_id
    AND stm.user_id = auth.uid()
    AND stm.role IN ('editor', 'admin')
    AND stm.invitation_status = 'accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.streamer_team_members stm
    WHERE stm.streamer_id = streamer_top_songs.streamer_id
    AND stm.user_id = auth.uid()
    AND stm.role IN ('editor', 'admin')
    AND stm.invitation_status = 'accepted'
  )
);

-- Admins can manage all
CREATE POLICY "Admins can manage all top songs"
ON public.streamer_top_songs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_streamer_top_songs_updated_at
BEFORE UPDATE ON public.streamer_top_songs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
