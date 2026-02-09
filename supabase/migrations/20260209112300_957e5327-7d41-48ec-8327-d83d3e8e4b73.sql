
CREATE TABLE public.admin_streamer_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'streamer')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_streamer_chat ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all chat messages"
  ON public.admin_streamer_chat
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- Streamers can view messages for their own streamer profile
CREATE POLICY "Streamers can view their chat"
  ON public.admin_streamer_chat
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.streamers WHERE streamers.id = admin_streamer_chat.streamer_id AND streamers.user_id = auth.uid())
  );

-- Streamers can send messages in their own chat
CREATE POLICY "Streamers can send messages"
  ON public.admin_streamer_chat
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.streamers WHERE streamers.id = admin_streamer_chat.streamer_id AND streamers.user_id = auth.uid())
  );

-- Streamers can mark messages as read
CREATE POLICY "Streamers can mark messages read"
  ON public.admin_streamer_chat
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.streamers WHERE streamers.id = admin_streamer_chat.streamer_id AND streamers.user_id = auth.uid())
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_streamer_chat;
