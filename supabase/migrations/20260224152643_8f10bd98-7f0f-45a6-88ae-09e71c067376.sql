
-- Fix 1: Make song-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'song-files';

-- Remove the public read policy
DROP POLICY IF EXISTS "Anyone can read song files" ON storage.objects;

-- Add team member access policy for song files
CREATE POLICY "Team members can read song files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'song-files'
  AND (
    -- Admins
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    -- Streamer owners: check if file belongs to a submission for their streamer
    OR EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.streamers st ON st.id = s.streamer_id
      WHERE s.audio_file_url = name AND st.user_id = auth.uid()
    )
    -- Team members (editors/admins)
    OR EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.streamer_team_members stm ON stm.streamer_id = s.streamer_id
      WHERE s.audio_file_url = name
        AND stm.user_id = auth.uid()
        AND stm.invitation_status = 'accepted'
    )
  )
);

-- Fix 3: Replace public referral code SELECT with a validation RPC
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can validate referral codes" ON public.referral_codes;

-- Create a restrictive policy: only allow SELECT for specific code lookups by authenticated users or via service role
-- The homepage code creation still works via INSERT policy
-- Streamers can still view their own codes via existing policy
-- Admins can still manage via existing ALL policy

-- Create a secure validation function
CREATE OR REPLACE FUNCTION public.validate_discount_code(code_input TEXT)
RETURNS TABLE(is_valid BOOLEAN, discount_percent INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code_data RECORD;
BEGIN
  SELECT rc.discount_percent AS dp, rc.is_used, rc.expires_at
  INTO _code_data
  FROM public.referral_codes rc
  WHERE rc.code = upper(trim(code_input))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  IF _code_data.is_used THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  IF _code_data.expires_at IS NOT NULL AND _code_data.expires_at < now() THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, _code_data.dp::integer;
END;
$$;
