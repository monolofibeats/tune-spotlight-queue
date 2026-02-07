-- Allow streamers to upload to their own folder in stream-media bucket
CREATE POLICY "Streamers can upload to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stream-media' AND
  (storage.foldername(name))[1] = 'streamers' AND
  EXISTS (
    SELECT 1 FROM public.streamers
    WHERE id::text = (storage.foldername(name))[2]
      AND user_id = auth.uid()
      AND status = 'approved'
  )
);

-- Allow streamers to update their own files
CREATE POLICY "Streamers can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stream-media' AND
  (storage.foldername(name))[1] = 'streamers' AND
  EXISTS (
    SELECT 1 FROM public.streamers
    WHERE id::text = (storage.foldername(name))[2]
      AND user_id = auth.uid()
      AND status = 'approved'
  )
);

-- Allow streamers to delete their own files
CREATE POLICY "Streamers can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'stream-media' AND
  (storage.foldername(name))[1] = 'streamers' AND
  EXISTS (
    SELECT 1 FROM public.streamers
    WHERE id::text = (storage.foldername(name))[2]
      AND user_id = auth.uid()
      AND status = 'approved'
  )
);

-- Public read access for stream-media (bucket is already public, but add explicit policy)
CREATE POLICY "Public read access for stream-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'stream-media');