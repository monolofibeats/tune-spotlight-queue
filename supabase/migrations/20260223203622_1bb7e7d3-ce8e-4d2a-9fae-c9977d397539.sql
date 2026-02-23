
-- Drop the permissive public policy on the base table
DROP POLICY IF EXISTS "Anyone can view bid totals via view" ON public.submission_bids;

-- Create a restricted public policy that only allows viewing non-sensitive data
-- Anonymous users can only see bid totals for pending submissions
CREATE POLICY "Anon can view bid summary"
ON public.submission_bids FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.id = submission_bids.submission_id
      AND s.status = 'pending'
  )
);
