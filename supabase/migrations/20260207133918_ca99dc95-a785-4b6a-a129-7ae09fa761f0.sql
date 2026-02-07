-- Ensure streamer_form_fields is readable on public streamer pages and editable by the owning streamer
ALTER TABLE public.streamer_form_fields ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Public can read enabled streamer form fields"
  ON public.streamer_form_fields
  FOR SELECT
  TO public
  USING (
    (is_enabled IS TRUE) AND
    EXISTS (
      SELECT 1 FROM public.streamers s
      WHERE s.id = streamer_form_fields.streamer_id
        AND s.status = 'approved'
    )
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Streamers can manage their form fields"
  ON public.streamer_form_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.streamers s
      WHERE s.id = streamer_form_fields.streamer_id
        AND s.user_id = auth.uid()
        AND s.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.streamers s
      WHERE s.id = streamer_form_fields.streamer_id
        AND s.user_id = auth.uid()
        AND s.status = 'approved'
    )
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Enable realtime updates for streamer pages (safe if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.streamers;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.streamer_form_fields;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
