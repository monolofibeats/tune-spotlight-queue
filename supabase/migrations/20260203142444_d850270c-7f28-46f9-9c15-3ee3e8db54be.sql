-- Fix: Update "Anyone can create submissions" policy to be more restrictive
-- Since submissions can be made with or without authentication, we allow both
-- but ensure that if user_id is provided, it must match the authenticated user
DROP POLICY IF EXISTS "Anyone can create submissions" ON public.submissions;

-- Allow authenticated users to create submissions (user_id must match)
CREATE POLICY "Authenticated users can create submissions"
ON public.submissions
FOR INSERT
WITH CHECK (
  -- Either user is authenticated and user_id matches their ID (or is null for anonymous submission by logged-in user)
  (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
  OR
  -- Or user is not authenticated and user_id must be null
  (auth.uid() IS NULL AND user_id IS NULL)
);