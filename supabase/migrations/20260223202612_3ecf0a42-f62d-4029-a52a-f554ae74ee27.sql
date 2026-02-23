
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
    max_allowed := 4;
    SELECT count(*) INTO pending_count
    FROM public.submissions
    WHERE streamer_id = _streamer_id
      AND user_id = _user_id
      AND status = 'pending'
      AND created_at > now() - interval '10 minutes';
  ELSE
    max_allowed := 2;
    SELECT count(*) INTO pending_count
    FROM public.submissions
    WHERE streamer_id = _streamer_id
      AND user_id IS NULL
      AND status = 'pending'
      AND created_at > now() - interval '10 minutes';
  END IF;

  RETURN pending_count < max_allowed;
END;
$$;
