-- Create stream_config table for managing homepage stream settings
CREATE TABLE public.stream_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_type TEXT NOT NULL DEFAULT 'none',
  stream_url TEXT,
  video_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stream_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage stream config
CREATE POLICY "Admins can manage stream config"
ON public.stream_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active stream config
CREATE POLICY "Anyone can view stream config"
ON public.stream_config
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_stream_config_updated_at
BEFORE UPDATE ON public.stream_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default row
INSERT INTO public.stream_config (stream_type, is_active)
VALUES ('none', true);