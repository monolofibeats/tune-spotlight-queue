
-- Allow streamers to upload/update their own background images in stream-media bucket
CREATE POLICY "Streamers can upload their own background images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'stream-media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'streamers'
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM public.streamers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Streamers can update their own background images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'stream-media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'streamers'
  AND (storage.foldername(name))[2] IN (
    SELECT id::text FROM public.streamers WHERE user_id = auth.uid()
  )
);
