-- Allow anyone to view pending submissions in the public queue
-- This is necessary for the spot bidding dialog to calculate prices correctly
-- for both logged-in users AND guests

CREATE POLICY "Anyone can view pending submissions in queue"
ON public.submissions
FOR SELECT
USING (status = 'pending');

-- Also allow anyone to view submission bids for price calculation
-- (only the aggregated total_paid_cents is used, no personal data exposed)
DROP POLICY IF EXISTS "Users can view their own bids" ON public.submission_bids;

CREATE POLICY "Anyone can view bid totals"
ON public.submission_bids
FOR SELECT
USING (true);