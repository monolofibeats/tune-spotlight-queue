-- Fix song-files storage policies to allow guest uploads and admin playback

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can upload song files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own song files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own song files" ON storage.objects;

-- Allow anyone to upload song files (for guest submissions)
CREATE POLICY "Anyone can upload song files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'song-files');

-- Allow admins to read all song files for review
CREATE POLICY "Admins can read song files"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow uploaders to read their own files (based on owner field for authenticated users)
CREATE POLICY "Owners can read their song files"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-files' AND auth.uid() = owner);

-- Allow admins to delete any song files
CREATE POLICY "Admins can delete song files"
ON storage.objects FOR DELETE
USING (bucket_id = 'song-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));