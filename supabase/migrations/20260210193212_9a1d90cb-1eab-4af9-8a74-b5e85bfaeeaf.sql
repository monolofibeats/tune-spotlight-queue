
-- Allow streamers to read song files for submissions assigned to them
CREATE POLICY "Streamers can read song files for their submissions"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'song-files'
  AND EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.streamers st ON s.streamer_id = st.id
    WHERE s.audio_file_url = objects.name
      AND st.user_id = auth.uid()
      AND st.status = 'approved'::streamer_status
  )
);
