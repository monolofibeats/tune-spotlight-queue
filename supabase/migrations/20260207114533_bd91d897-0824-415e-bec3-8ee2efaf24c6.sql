-- Add comprehensive streamer customization fields to streamers table
ALTER TABLE public.streamers
ADD COLUMN IF NOT EXISTS page_language TEXT DEFAULT 'de',
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS button_style TEXT DEFAULT 'rounded',
ADD COLUMN IF NOT EXISTS background_type TEXT DEFAULT 'solid',
ADD COLUMN IF NOT EXISTS background_image_url TEXT,
ADD COLUMN IF NOT EXISTS background_gradient TEXT,
ADD COLUMN IF NOT EXISTS animation_style TEXT DEFAULT 'subtle',
ADD COLUMN IF NOT EXISTS card_style TEXT DEFAULT 'glass',
ADD COLUMN IF NOT EXISTS banner_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS banner_text TEXT,
ADD COLUMN IF NOT EXISTS banner_link TEXT,
ADD COLUMN IF NOT EXISTS banner_color TEXT DEFAULT '45 90% 50%',
ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'music';

-- Create table for custom form field configurations
CREATE TABLE IF NOT EXISTS public.streamer_form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  placeholder TEXT,
  is_required BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  field_order INTEGER DEFAULT 0,
  options JSONB,
  validation_regex TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on form fields
ALTER TABLE public.streamer_form_fields ENABLE ROW LEVEL SECURITY;

-- RLS policies for form fields
CREATE POLICY "Streamers can view their own form fields"
ON public.streamer_form_fields FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.streamers WHERE id = streamer_id AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Streamers can manage their own form fields"
ON public.streamer_form_fields FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.streamers WHERE id = streamer_id AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view form fields for approved streamers"
ON public.streamer_form_fields FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.streamers WHERE id = streamer_id AND status = 'approved')
);

-- Create table for tracking content changes (for admin notification)
CREATE TABLE IF NOT EXISTS public.streamer_content_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  is_reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on content changes
ALTER TABLE public.streamer_content_changes ENABLE ROW LEVEL SECURITY;

-- RLS policies for content changes
CREATE POLICY "Admins can view all content changes"
ON public.streamer_content_changes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert content changes"
ON public.streamer_content_changes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update content changes"
ON public.streamer_content_changes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add streamer-specific pricing config policy
CREATE POLICY "Streamers can manage their own pricing"
ON public.pricing_config FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.streamers WHERE id = streamer_id AND user_id = auth.uid())
);

-- Add trigger for updated_at on form fields
CREATE TRIGGER update_streamer_form_fields_updated_at
BEFORE UPDATE ON public.streamer_form_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();