
-- Grant table-level privileges so RLS policies can actually work
GRANT SELECT, INSERT, UPDATE ON public.referral_codes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.referral_codes TO authenticated;
