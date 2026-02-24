
-- Create a security definer function for streamer referral code generation
CREATE OR REPLACE FUNCTION public.generate_streamer_referral_codes(_streamer_id uuid)
RETURNS SETOF referral_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _month_start timestamptz;
  _month_end timestamptz;
  _existing_count int;
  _remaining int;
  _monthly_limit int := 5;
  _new_code text;
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _i int;
BEGIN
  -- Verify the caller owns this streamer
  SELECT user_id INTO _user_id FROM streamers WHERE id = _streamer_id AND status = 'approved';
  IF _user_id IS NULL OR _user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  _month_start := date_trunc('month', now());
  _month_end := (date_trunc('month', now()) + interval '1 month' - interval '1 second');

  -- Count existing codes this month
  SELECT count(*) INTO _existing_count
  FROM referral_codes
  WHERE streamer_id = _streamer_id
    AND source = 'streamer'
    AND created_at >= _month_start;

  _remaining := _monthly_limit - _existing_count;
  IF _remaining <= 0 THEN
    RAISE EXCEPTION 'Monthly limit reached';
  END IF;

  -- Generate codes
  FOR _i IN 1.._remaining LOOP
    _new_code := 'UP-';
    FOR j IN 1..6 LOOP
      _new_code := _new_code || substr(_chars, floor(random() * length(_chars) + 1)::int, 1);
    END LOOP;

    INSERT INTO referral_codes (code, discount_percent, source, streamer_id, is_used, expires_at)
    VALUES (_new_code, 10, 'streamer', _streamer_id, false, _month_end)
    RETURNING * INTO _new_code;
    
    RETURN QUERY
      SELECT * FROM referral_codes WHERE code = _new_code;
  END LOOP;

  RETURN;
END;
$$;
