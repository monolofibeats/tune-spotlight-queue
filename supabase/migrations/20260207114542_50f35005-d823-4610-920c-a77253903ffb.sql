-- Fix the overly permissive INSERT policy on streamer_content_changes
-- Drop the existing policy and create a proper one
DROP POLICY IF EXISTS "System can insert content changes" ON public.streamer_content_changes;

-- Create proper INSERT policy - only streamers can log changes to their own profile
CREATE POLICY "Streamers can log their own content changes"
ON public.streamer_content_changes FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.streamers WHERE id = streamer_id AND user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);