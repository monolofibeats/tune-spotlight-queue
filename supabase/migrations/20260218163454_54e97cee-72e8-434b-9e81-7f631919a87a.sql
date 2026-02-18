
-- Drop the broken policies
DROP POLICY IF EXISTS "Users can upload their own avatar to stream-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar in stream-media" ON storage.objects;

-- Recreate with correct UUID matching using LIKE
CREATE POLICY "Users can upload their own avatar to stream-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'stream-media'
  AND name LIKE 'avatars/' || auth.uid()::text || '%'
);

CREATE POLICY "Users can update their own avatar in stream-media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'stream-media'
  AND name LIKE 'avatars/' || auth.uid()::text || '%'
);
