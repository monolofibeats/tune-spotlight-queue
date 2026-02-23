
-- Tighten the site_feedback INSERT policy to require non-empty message and limit length
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.site_feedback;

CREATE POLICY "Anyone can submit feedback"
ON public.site_feedback
FOR INSERT
WITH CHECK (
  char_length(message) > 0 AND char_length(message) <= 2000
  AND (contact_info IS NULL OR char_length(contact_info) <= 500)
);
