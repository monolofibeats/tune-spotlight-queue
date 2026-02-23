-- Fix: Remove overly permissive anonymous upload policy on song-files bucket
-- and replace with authenticated-only upload policy
DROP POLICY IF EXISTS "Anyone can upload song files" ON storage.objects;

CREATE POLICY "Authenticated users can upload song files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'song-files' AND auth.uid() IS NOT NULL);
