
-- Drop the existing authenticated-only upload policy
DROP POLICY IF EXISTS "Authenticated users can upload song files" ON storage.objects;

-- Create a new policy that allows anyone (including anonymous) to upload to song-files
CREATE POLICY "Anyone can upload song files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'song-files');
