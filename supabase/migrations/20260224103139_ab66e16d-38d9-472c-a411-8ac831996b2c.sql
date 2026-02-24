
-- Drop the restrictive ALL policy that blocks non-admin inserts
DROP POLICY IF EXISTS "Admins can manage all referral codes" ON public.referral_codes;

-- Recreate as PERMISSIVE so it doesn't block other users
CREATE POLICY "Admins can manage all referral codes"
ON public.referral_codes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
