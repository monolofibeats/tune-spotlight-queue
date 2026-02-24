-- Fix the rate limit function to not share a single bucket for ALL anonymous users.
-- Instead, only limit per-IP which is already handled by edge function rate limiting.
-- For the DB-level check, we raise the anonymous limit significantly so it doesn't
-- block unrelated anonymous users from submitting.

CREATE OR REPLACE FUNCTION public.check_submission_rate_limit(_streamer_id uuid, _user_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pending_count integer;
  max_allowed integer;
BEGIN
  IF _user_id IS NOT NULL THEN
    -- Authenticated users: max 4 pending per streamer in 10 min window
    max_allowed := 4;
    SELECT count(*) INTO pending_count
    FROM public.submissions
    WHERE streamer_id = _streamer_id
      AND user_id = _user_id
      AND status = 'pending'
      AND created_at > now() - interval '10 minutes';
  ELSE
    -- Anonymous users: we can't distinguish individual guests at the DB level,
    -- so use a generous limit. Real abuse prevention happens at the edge function
    -- rate limiter (IP-based). This just prevents extreme flooding.
    max_allowed := 50;
    SELECT count(*) INTO pending_count
    FROM public.submissions
    WHERE streamer_id = _streamer_id
      AND user_id IS NULL
      AND status = 'pending'
      AND created_at > now() - interval '10 minutes';
  END IF;

  RETURN pending_count < max_allowed;
END;
$function$;