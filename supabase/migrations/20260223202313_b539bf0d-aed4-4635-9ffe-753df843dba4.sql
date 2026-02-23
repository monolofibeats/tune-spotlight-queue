
-- Create a function to check submission rate limits
-- Limits: authenticated users get 5 pending submissions per streamer, anonymous get 3
CREATE OR REPLACE FUNCTION public.check_submission_rate_limit(
  _streamer_id uuid,
  _user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count integer;
  max_allowed integer;
BEGIN
  IF _user_id IS NOT NULL THEN
    -- Authenticated user: max 5 pending per streamer
    max_allowed := 5;
    SELECT count(*) INTO pending_count
    FROM public.submissions
    WHERE streamer_id = _streamer_id
      AND user_id = _user_id
      AND status = 'pending';
  ELSE
    -- Anonymous user: max 3 pending per streamer (total anonymous)
    -- Since we can't identify anonymous users reliably, limit total anonymous pending submissions
    -- created in the last hour per streamer
    max_allowed := 3;
    SELECT count(*) INTO pending_count
    FROM public.submissions
    WHERE streamer_id = _streamer_id
      AND user_id IS NULL
      AND status = 'pending'
      AND created_at > now() - interval '1 hour';
  END IF;

  RETURN pending_count < max_allowed;
END;
$$;

-- Update the INSERT policy to include rate limit check
DROP POLICY IF EXISTS "Users can create free submissions only" ON public.submissions;

CREATE POLICY "Users can create free submissions only"
ON public.submissions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (is_priority = false)
    AND (amount_paid = (0)::numeric)
    AND (boost_amount = (0)::numeric)
    AND (
      (auth.uid() IS NOT NULL AND ((user_id IS NULL) OR (user_id = auth.uid())))
      OR (auth.uid() IS NULL AND user_id IS NULL)
    )
    AND check_submission_rate_limit(streamer_id, auth.uid())
  )
);
