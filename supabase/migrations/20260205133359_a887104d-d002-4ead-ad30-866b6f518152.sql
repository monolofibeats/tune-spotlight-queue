-- Create streamer status enum
CREATE TYPE public.streamer_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Create streamers table with full customization
CREATE TABLE public.streamers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Profile info
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  
  -- Social links
  twitch_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  
  -- Customization - Text
  hero_title TEXT DEFAULT 'Submit Your Music',
  hero_subtitle TEXT DEFAULT 'Get your tracks reviewed live on stream',
  welcome_message TEXT,
  
  -- Customization - Colors (HSL format)
  primary_color TEXT DEFAULT '142 76% 36%',
  accent_color TEXT DEFAULT '142 76% 36%',
  background_style TEXT DEFAULT 'default',
  
  -- Customization - Layout
  show_how_it_works BOOLEAN DEFAULT true,
  show_stream_embed BOOLEAN DEFAULT true,
  custom_css TEXT,
  
  -- Status & timestamps
  status streamer_status NOT NULL DEFAULT 'pending',
  is_live BOOLEAN DEFAULT false,
  application_message TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add streamer_id to existing tables
ALTER TABLE public.submissions ADD COLUMN streamer_id UUID REFERENCES public.streamers(id);
ALTER TABLE public.stream_sessions ADD COLUMN streamer_id UUID REFERENCES public.streamers(id);
ALTER TABLE public.stream_config ADD COLUMN streamer_id UUID REFERENCES public.streamers(id);
ALTER TABLE public.special_events ADD COLUMN streamer_id UUID REFERENCES public.streamers(id);
ALTER TABLE public.pre_stream_spots ADD COLUMN streamer_id UUID REFERENCES public.streamers(id);
ALTER TABLE public.pricing_config ADD COLUMN streamer_id UUID REFERENCES public.streamers(id);

-- Create streamer applications table
CREATE TABLE public.streamer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  desired_slug TEXT NOT NULL,
  twitch_url TEXT,
  youtube_url TEXT,
  application_message TEXT,
  status streamer_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_streamers_slug ON public.streamers(slug);
CREATE INDEX idx_streamers_status ON public.streamers(status);
CREATE INDEX idx_streamers_is_live ON public.streamers(is_live);
CREATE INDEX idx_submissions_streamer ON public.submissions(streamer_id);
CREATE INDEX idx_stream_sessions_streamer ON public.stream_sessions(streamer_id);

-- Enable RLS
ALTER TABLE public.streamers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streamer_applications ENABLE ROW LEVEL SECURITY;

-- RLS for streamers table
CREATE POLICY "Anyone can view approved streamers"
  ON public.streamers FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Streamers can view their own profile"
  ON public.streamers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Streamers can update their own profile"
  ON public.streamers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all streamers"
  ON public.streamers FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS for applications
CREATE POLICY "Anyone can submit applications"
  ON public.streamer_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all applications"
  ON public.streamer_applications FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage applications"
  ON public.streamer_applications FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add 'streamer' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'streamer';

-- Trigger for updated_at
CREATE TRIGGER update_streamers_updated_at
  BEFORE UPDATE ON public.streamers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update public_submissions_queue view to include streamer_id
DROP VIEW IF EXISTS public.public_submissions_queue;
CREATE VIEW public.public_submissions_queue AS
  SELECT 
    id,
    streamer_id,
    artist_name,
    song_title,
    platform,
    is_priority,
    amount_paid,
    boost_amount,
    status,
    created_at
  FROM public.submissions
  WHERE status = 'pending';