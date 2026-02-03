-- Create pre_stream_spots table for the 5 tiered priority spots
CREATE TABLE public.pre_stream_spots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    spot_number INTEGER NOT NULL CHECK (spot_number >= 1 AND spot_number <= 5),
    price_cents INTEGER NOT NULL,
    session_id UUID REFERENCES public.stream_sessions(id) ON DELETE SET NULL,
    submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
    purchased_by UUID REFERENCES auth.users(id),
    purchased_at TIMESTAMP WITH TIME ZONE,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(session_id, spot_number)
);

-- Enable RLS
ALTER TABLE public.pre_stream_spots ENABLE ROW LEVEL SECURITY;

-- Anyone can view spots
CREATE POLICY "Anyone can view pre-stream spots"
ON public.pre_stream_spots
FOR SELECT
USING (true);

-- Admins can manage spots
CREATE POLICY "Admins can manage pre-stream spots"
ON public.pre_stream_spots
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Users can update spots they're purchasing (handled via edge function)
CREATE POLICY "Users can purchase available spots"
ON public.pre_stream_spots
FOR UPDATE
USING (is_available = true AND auth.uid() IS NOT NULL);

-- Create stream_recordings table for archived streams
CREATE TABLE public.stream_recordings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.stream_sessions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    view_count INTEGER NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stream_recordings ENABLE ROW LEVEL SECURITY;

-- Anyone can view public recordings
CREATE POLICY "Anyone can view public recordings"
ON public.stream_recordings
FOR SELECT
USING (is_public = true);

-- Admins can manage recordings
CREATE POLICY "Admins can manage recordings"
ON public.stream_recordings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create stream_clips table for user-created clips
CREATE TABLE public.stream_clips (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    recording_id UUID REFERENCES public.stream_recordings(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    start_time_seconds INTEGER NOT NULL,
    end_time_seconds INTEGER NOT NULL,
    clip_url TEXT,
    thumbnail_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    view_count INTEGER NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CHECK (end_time_seconds > start_time_seconds)
);

-- Enable RLS
ALTER TABLE public.stream_clips ENABLE ROW LEVEL SECURITY;

-- Anyone can view public clips
CREATE POLICY "Anyone can view public clips"
ON public.stream_clips
FOR SELECT
USING (is_public = true);

-- Authenticated users can create clips
CREATE POLICY "Users can create clips"
ON public.stream_clips
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can manage their own clips
CREATE POLICY "Users can manage their own clips"
ON public.stream_clips
FOR ALL
USING (auth.uid() = created_by);

-- Admins can manage all clips
CREATE POLICY "Admins can manage all clips"
ON public.stream_clips
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for stream media
INSERT INTO storage.buckets (id, name, public) VALUES ('stream-media', 'stream-media', true);

-- Storage policies for stream media
CREATE POLICY "Anyone can view stream media"
ON storage.objects FOR SELECT
USING (bucket_id = 'stream-media');

CREATE POLICY "Admins can upload stream media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stream-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage stream media"
ON storage.objects FOR ALL
USING (bucket_id = 'stream-media' AND has_role(auth.uid(), 'admin'));

-- Enable realtime for spots
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_stream_spots;