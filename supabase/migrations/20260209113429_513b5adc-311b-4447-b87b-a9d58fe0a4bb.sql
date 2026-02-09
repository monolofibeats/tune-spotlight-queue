
-- Streamer presets: stores multiple configurations per streamer for different platforms/occasions
CREATE TABLE public.streamer_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  platform_type TEXT NOT NULL DEFAULT 'custom',
  occasion_type TEXT NOT NULL DEFAULT 'custom',
  is_active BOOLEAN NOT NULL DEFAULT false,
  
  -- Theme config (mirrors streamer design fields)
  theme_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Dashboard layout config: which widgets are visible and their order
  dashboard_layout JSONB NOT NULL DEFAULT '{"widgets": ["stats", "queue", "now_playing"]}'::jsonb,
  
  -- Form field template reference (which template to use)
  form_template TEXT DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.streamer_presets ENABLE ROW LEVEL SECURITY;

-- Streamers can manage their own presets
CREATE POLICY "Streamers can manage their own presets"
ON public.streamer_presets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM streamers s
    WHERE s.id = streamer_presets.streamer_id
    AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM streamers s
    WHERE s.id = streamer_presets.streamer_id
    AND s.user_id = auth.uid()
  )
);

-- Admins can manage all presets
CREATE POLICY "Admins can manage all presets"
ON public.streamer_presets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_streamer_presets_updated_at
  BEFORE UPDATE ON public.streamer_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.streamer_presets;
