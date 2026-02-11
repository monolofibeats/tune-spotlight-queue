
-- Table to record each individual earning from a payment
CREATE TABLE public.streamer_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
  stripe_session_id TEXT NOT NULL,
  gross_amount_cents INTEGER NOT NULL,
  stripe_fee_cents INTEGER NOT NULL DEFAULT 0,
  net_amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  streamer_share_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  payment_type TEXT NOT NULL DEFAULT 'submission',
  customer_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate processing of the same Stripe session
CREATE UNIQUE INDEX idx_streamer_earnings_stripe_session ON public.streamer_earnings(stripe_session_id);

-- Index for fast streamer lookups
CREATE INDEX idx_streamer_earnings_streamer ON public.streamer_earnings(streamer_id);

-- Enable RLS
ALTER TABLE public.streamer_earnings ENABLE ROW LEVEL SECURITY;

-- Streamers can view their own earnings
CREATE POLICY "Streamers can view own earnings"
  ON public.streamer_earnings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.streamers s
      WHERE s.id = streamer_id AND s.user_id = auth.uid()
    )
  );

-- Admins can view all earnings
CREATE POLICY "Admins can view all earnings"
  ON public.streamer_earnings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only service role inserts (from edge functions)

-- Payout requests table
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending',
  payout_method TEXT NOT NULL,
  payout_details JSONB NOT NULL DEFAULT '{}',
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payout_requests_streamer ON public.payout_requests(streamer_id);
CREATE INDEX idx_payout_requests_status ON public.payout_requests(status);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Streamers can view their own payout requests
CREATE POLICY "Streamers can view own payout requests"
  ON public.payout_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.streamers s
      WHERE s.id = streamer_id AND s.user_id = auth.uid()
    )
  );

-- Streamers can create payout requests
CREATE POLICY "Streamers can create payout requests"
  ON public.payout_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.streamers s
      WHERE s.id = streamer_id AND s.user_id = auth.uid()
    )
  );

-- Admins can view all payout requests
CREATE POLICY "Admins can view all payout requests"
  ON public.payout_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update payout requests (approve/reject)
CREATE POLICY "Admins can update payout requests"
  ON public.payout_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
