
-- Create referral_codes table
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  source TEXT NOT NULL DEFAULT 'homepage', -- 'homepage' or 'streamer'
  streamer_id UUID REFERENCES public.streamers(id) ON DELETE CASCADE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by_email TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  used_on_session_id TEXT, -- stripe session id
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast code lookups
CREATE UNIQUE INDEX idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX idx_referral_codes_streamer_month ON public.referral_codes(streamer_id, created_at);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read codes (to validate them in the submission form)
CREATE POLICY "Anyone can validate referral codes"
ON public.referral_codes
FOR SELECT
USING (true);

-- Streamers can view their own codes
CREATE POLICY "Streamers can view own referral codes"
ON public.referral_codes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.streamers s
    WHERE s.id = referral_codes.streamer_id AND s.user_id = auth.uid()
  )
);

-- Anyone can insert homepage codes (anonymous)
CREATE POLICY "Anyone can create homepage referral codes"
ON public.referral_codes
FOR INSERT
WITH CHECK (source = 'homepage');

-- Streamers can create their own codes
CREATE POLICY "Streamers can create own referral codes"
ON public.referral_codes
FOR INSERT
WITH CHECK (
  source = 'streamer' AND
  EXISTS (
    SELECT 1 FROM public.streamers s
    WHERE s.id = referral_codes.streamer_id AND s.user_id = auth.uid()
  )
);

-- Admins can manage all codes
CREATE POLICY "Admins can manage all referral codes"
ON public.referral_codes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions (service role) can update codes when redeemed
-- This is handled by service role key, no policy needed

-- Allow edge functions to mark codes as used
CREATE POLICY "Anyone can mark codes as used"
ON public.referral_codes
FOR UPDATE
USING (is_used = false)
WITH CHECK (is_used = true);
