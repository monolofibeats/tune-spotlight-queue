-- Create a rate limiting table for edge function abuse prevention
CREATE TABLE public.rate_limit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limit_lookup ON public.rate_limit_entries (identifier, endpoint, created_at DESC);

-- Auto-cleanup: delete entries older than 5 minutes via a scheduled approach
-- For now, we clean up in the helper function itself

-- RLS: No direct client access needed, only service role from edge functions
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- No policies = no client access. Only service role (edge functions) can read/write.
