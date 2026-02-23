
ALTER TABLE public.submissions ADD CONSTRAINT no_banned_words
CHECK (
  artist_name NOT ILIKE '%nextup%'
  AND song_title NOT ILIKE '%nextup%'
  AND song_url NOT ILIKE '%nextup%'
);
