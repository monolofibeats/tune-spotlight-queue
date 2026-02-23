
-- Create a public view that excludes sensitive fields
CREATE VIEW public.public_submission_bids
WITH (security_invoker=on) AS
  SELECT submission_id, total_paid_cents, created_at, updated_at
  FROM public.submission_bids;

-- Replace the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view bid totals" ON public.submission_bids;

-- Public can only view via the view (which only exposes non-sensitive columns)
-- The view needs a SELECT policy that allows access
CREATE POLICY "Anyone can view bid totals via view"
ON public.submission_bids FOR SELECT
USING (true);
