
DROP FUNCTION IF EXISTS public.generate_streamer_referral_codes(uuid);

CREATE FUNCTION public.generate_streamer_referral_codes(_streamer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id uuid;
  _is_platform_admin boolean;
  _is_team_member boolean;
  _month_start timestamptz;
  _month_end timestamptz;
  _existing_count int;
  _remaining int;
  _monthly_limit int := 5;
  _new_code text;
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  _is_platform_admin := has_role(auth.uid(), 'admin');

  SELECT user_id INTO _owner_id FROM streamers WHERE id = _streamer_id AND status = 'approved';

  SELECT EXISTS(
    SELECT 1 FROM streamer_team_members
    WHERE streamer_id = _streamer_id
      AND user_id = auth.uid()
      AND role IN ('editor', 'admin')
      AND invitation_status = 'accepted'
  ) INTO _is_team_member;

  IF _owner_id IS NULL OR (_owner_id != auth.uid() AND NOT _is_platform_admin AND NOT _is_team_member) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  _month_start := date_trunc('month', now());
  _month_end := (date_trunc('month', now()) + interval '1 month' - interval '1 second');

  SELECT count(*) INTO _existing_count
  FROM referral_codes
  WHERE streamer_id = _streamer_id AND source = 'streamer' AND created_at >= _month_start;

  _remaining := _monthly_limit - _existing_count;
  IF _remaining <= 0 THEN
    RAISE EXCEPTION 'Monthly limit reached';
  END IF;

  FOR i IN 1.._remaining LOOP
    _new_code := 'UP-';
    FOR j IN 1..6 LOOP
      _new_code := _new_code || substr(_chars, floor(random() * length(_chars) + 1)::int, 1);
    END LOOP;
    INSERT INTO referral_codes (code, discount_percent, source, streamer_id, is_used, expires_at)
    VALUES (_new_code, 10, 'streamer', _streamer_id, false, _month_end);
  END LOOP;
END;
$$;
