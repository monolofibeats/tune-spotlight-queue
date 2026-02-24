
-- Drop the restrictive INSERT policies
DROP POLICY IF EXISTS "Anyone can create homepage referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Streamers can create own referral codes" ON public.referral_codes;

-- Recreate as PERMISSIVE
CREATE POLICY "Anyone can create homepage referral codes"
ON public.referral_codes
FOR INSERT
TO public
WITH CHECK (source = 'homepage');

CREATE POLICY "Streamers can create own referral codes"
ON public.referral_codes
FOR INSERT
TO authenticated
WITH CHECK (
  source = 'streamer'
  AND EXISTS (
    SELECT 1 FROM streamers s
    WHERE s.id = referral_codes.streamer_id
      AND s.user_id = auth.uid()
  )
);
