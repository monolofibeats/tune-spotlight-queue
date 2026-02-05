-- Fix the view security issue by using security_invoker
DROP VIEW IF EXISTS public.public_submissions_queue;
CREATE VIEW public.public_submissions_queue 
WITH (security_invoker = on) AS
  SELECT 
    id,
    streamer_id,
    artist_name,
    song_title,
    platform,
    is_priority,
    amount_paid,
    boost_amount,
    status,
    created_at
  FROM public.submissions
  WHERE status = 'pending';

-- Fix the permissive INSERT policy on streamer_applications
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.streamer_applications;
CREATE POLICY "Anyone can submit applications"
  ON public.streamer_applications FOR INSERT
  WITH CHECK (
    status = 'pending' 
    AND reviewed_by IS NULL 
    AND reviewed_at IS NULL
  );