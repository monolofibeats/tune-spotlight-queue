
CREATE TABLE public.star_trail_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id uuid REFERENCES public.streamers(id) ON DELETE CASCADE NOT NULL,
  streamer_name text NOT NULL,
  score integer NOT NULL,
  accuracy integer NOT NULL,
  completion integer NOT NULL,
  shape text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.star_trail_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scores"
  ON public.star_trail_scores FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert scores"
  ON public.star_trail_scores FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_star_trail_scores_score ON public.star_trail_scores (score DESC);
