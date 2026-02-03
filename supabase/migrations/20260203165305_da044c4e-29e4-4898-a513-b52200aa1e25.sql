-- Create storage bucket for audio file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('song-files', 'song-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload files (with size/type restrictions handled in code)
CREATE POLICY "Anyone can upload song files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'song-files');

-- Allow anyone to read uploaded files
CREATE POLICY "Anyone can read song files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'song-files');

-- Add audio_file_url column to submissions table
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS audio_file_url TEXT;