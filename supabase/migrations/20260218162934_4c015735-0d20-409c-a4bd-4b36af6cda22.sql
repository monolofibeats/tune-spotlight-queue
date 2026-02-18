-- Drop the broken INSERT policy
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

-- Recreate it without the incorrect foldername check
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = split_part(name, '-', 1)
);