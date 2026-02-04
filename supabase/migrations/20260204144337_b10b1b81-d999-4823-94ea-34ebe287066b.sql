-- Drop and recreate the public_submissions_queue view to include amount_paid for sorting
DROP VIEW IF EXISTS public_submissions_queue;

CREATE VIEW public_submissions_queue AS
SELECT 
  id,
  song_title,
  artist_name,
  platform,
  is_priority,
  status,
  created_at,
  amount_paid,
  boost_amount
FROM submissions
WHERE status IN ('pending', 'reviewing');

-- Grant select to authenticated and anon users
GRANT SELECT ON public_submissions_queue TO authenticated;
GRANT SELECT ON public_submissions_queue TO anon;