
-- Add stripe_session_id column to submission_bids for idempotency
ALTER TABLE public.submission_bids
ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Add unique constraint to prevent replay attacks
ALTER TABLE public.submission_bids
ADD CONSTRAINT submission_bids_stripe_session_id_key UNIQUE (stripe_session_id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_submission_bids_stripe_session_id ON public.submission_bids (stripe_session_id);
