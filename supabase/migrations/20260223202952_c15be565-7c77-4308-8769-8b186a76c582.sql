
-- Add stripe_session_id to submissions for idempotency
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Unique constraint prevents duplicate paid submissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_stripe_session_id
ON public.submissions (stripe_session_id)
WHERE stripe_session_id IS NOT NULL;
