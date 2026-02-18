
-- Allow authenticated users to upload their own avatars to stream-media/avatars/
CREATE POLICY "Users can upload their own avatar to stream-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'stream-media'
  AND name LIKE 'avatars/%'
  AND auth.uid()::text = split_part(split_part(name, '/', 2), '-', 1)
);

-- Allow authenticated users to update their own avatars in stream-media
CREATE POLICY "Users can update their own avatar in stream-media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'stream-media'
  AND name LIKE 'avatars/%'
  AND auth.uid()::text = split_part(split_part(name, '/', 2), '-', 1)
);
