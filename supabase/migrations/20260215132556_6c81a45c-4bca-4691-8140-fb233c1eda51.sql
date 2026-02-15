
-- Create enum for team member roles
CREATE TYPE public.team_role AS ENUM ('viewer', 'editor', 'admin');

-- Create streamer team members table
CREATE TABLE public.streamer_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'viewer',
  invitation_status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(streamer_id, email)
);

-- Enable RLS
ALTER TABLE public.streamer_team_members ENABLE ROW LEVEL SECURITY;

-- Streamers can manage their own team
CREATE POLICY "Streamers can manage their team"
ON public.streamer_team_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM streamers s
    WHERE s.id = streamer_team_members.streamer_id
    AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM streamers s
    WHERE s.id = streamer_team_members.streamer_id
    AND s.user_id = auth.uid()
  )
);

-- Team admins can manage team (except themselves)
CREATE POLICY "Team admins can manage members"
ON public.streamer_team_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM streamer_team_members stm
    WHERE stm.streamer_id = streamer_team_members.streamer_id
    AND stm.user_id = auth.uid()
    AND stm.role = 'admin'
    AND stm.invitation_status = 'accepted'
  )
);

-- Team members can view their own membership
CREATE POLICY "Team members can view own membership"
ON public.streamer_team_members
FOR SELECT
USING (auth.uid() = user_id);

-- Team members can update their own invitation (accept/decline)
CREATE POLICY "Team members can accept invitations"
ON public.streamer_team_members
FOR UPDATE
USING (auth.uid() = user_id AND invitation_status = 'pending');

-- Admins can manage all
CREATE POLICY "Admins can manage all team members"
ON public.streamer_team_members
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_streamer_team_members_updated_at
BEFORE UPDATE ON public.streamer_team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
