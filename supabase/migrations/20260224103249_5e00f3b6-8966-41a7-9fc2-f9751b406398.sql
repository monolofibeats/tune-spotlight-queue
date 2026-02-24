
-- Drop ALL existing policies on referral_codes and recreate them all as PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage all referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Anyone can create homepage referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Anyone can mark codes as used" ON public.referral_codes;
DROP POLICY IF EXISTS "Anyone can validate referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Streamers can create own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Streamers can view own referral codes" ON public.referral_codes;

-- Recreate ALL as PERMISSIVE
CREATE POLICY "Admins can manage all referral codes"
ON public.referral_codes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can validate referral codes"
ON public.referral_codes FOR SELECT TO public
USING (true);

CREATE POLICY "Streamers can view own referral codes"
ON public.referral_codes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM streamers s
  WHERE s.id = referral_codes.streamer_id AND s.user_id = auth.uid()
));

CREATE POLICY "Anyone can create homepage referral codes"
ON public.referral_codes FOR INSERT TO public
WITH CHECK (source = 'homepage');

CREATE POLICY "Streamers can create own referral codes"
ON public.referral_codes FOR INSERT TO authenticated
WITH CHECK (
  source = 'streamer'
  AND EXISTS (
    SELECT 1 FROM streamers s
    WHERE s.id = referral_codes.streamer_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can mark codes as used"
ON public.referral_codes FOR UPDATE TO public
USING (is_used = false)
WITH CHECK (is_used = true);
