
-- Add offline customization fields to streamers
ALTER TABLE public.streamers 
  ADD COLUMN IF NOT EXISTS offline_message text DEFAULT 'When the stream is active you can submit your songs here for review',
  ADD COLUMN IF NOT EXISTS next_stream_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_offline_signup boolean DEFAULT true;

-- Create streamer_subscribers table for email notifications
CREATE TABLE public.streamer_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id uuid NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(streamer_id, email)
);

-- Enable RLS
ALTER TABLE public.streamer_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe to streamer notifications"
  ON public.streamer_subscribers FOR INSERT
  WITH CHECK (true);

-- Subscribers can unsubscribe (delete their own)
CREATE POLICY "Anyone can unsubscribe by email"
  ON public.streamer_subscribers FOR DELETE
  USING (true);

-- Streamers and admins can view subscribers
CREATE POLICY "Streamers can view their subscribers"
  ON public.streamer_subscribers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.streamers s
      WHERE s.id = streamer_subscribers.streamer_id AND s.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
  );

-- Streamers can manage subscribers
CREATE POLICY "Streamers can manage their subscribers"
  ON public.streamer_subscribers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.streamers s
      WHERE s.id = streamer_subscribers.streamer_id AND s.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
  );
