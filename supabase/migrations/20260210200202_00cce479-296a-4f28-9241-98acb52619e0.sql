
-- Create payout preferences table for streamers
CREATE TABLE public.payout_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  payout_method TEXT NOT NULL DEFAULT 'bank_transfer',
  currency TEXT NOT NULL DEFAULT 'EUR',
  bank_iban TEXT,
  bank_bic TEXT,
  bank_account_holder TEXT,
  paypal_email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payout_preferences ENABLE ROW LEVEL SECURITY;

-- Streamers can view their own payout preferences
CREATE POLICY "Streamers can view own payout preferences"
ON public.payout_preferences FOR SELECT
USING (
  streamer_id IN (
    SELECT id FROM public.streamers WHERE user_id = auth.uid()
  )
);

-- Streamers can insert their own payout preferences
CREATE POLICY "Streamers can insert own payout preferences"
ON public.payout_preferences FOR INSERT
WITH CHECK (
  streamer_id IN (
    SELECT id FROM public.streamers WHERE user_id = auth.uid()
  )
);

-- Streamers can update their own payout preferences
CREATE POLICY "Streamers can update own payout preferences"
ON public.payout_preferences FOR UPDATE
USING (
  streamer_id IN (
    SELECT id FROM public.streamers WHERE user_id = auth.uid()
  )
);

-- Streamers can delete their own payout preferences
CREATE POLICY "Streamers can delete own payout preferences"
ON public.payout_preferences FOR DELETE
USING (
  streamer_id IN (
    SELECT id FROM public.streamers WHERE user_id = auth.uid()
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all payout preferences"
ON public.payout_preferences FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_payout_preferences_updated_at
BEFORE UPDATE ON public.payout_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
