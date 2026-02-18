
-- Drop the two narrow policies that only cover streamer owners
DROP POLICY IF EXISTS "Streamers can upload their own background images" ON storage.objects;
DROP POLICY IF EXISTS "Streamers can update their own background images" ON storage.objects;

-- Single unified INSERT policy: covers streamer owner AND accepted team members
CREATE POLICY "Streamers and team can upload to stream-media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'stream-media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'streamers'
  AND (storage.foldername(name))[2] IN (
    SELECT s.id::text FROM public.streamers s
    WHERE s.user_id = auth.uid()
    UNION
    SELECT stm.streamer_id::text FROM public.streamer_team_members stm
    WHERE stm.user_id = auth.uid()
      AND stm.invitation_status = 'accepted'
      AND stm.role IN ('editor', 'admin')
  )
);

-- Single unified UPDATE policy: covers streamer owner AND accepted team members
CREATE POLICY "Streamers and team can update stream-media objects"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'stream-media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'streamers'
  AND (storage.foldername(name))[2] IN (
    SELECT s.id::text FROM public.streamers s
    WHERE s.user_id = auth.uid()
    UNION
    SELECT stm.streamer_id::text FROM public.streamer_team_members stm
    WHERE stm.user_id = auth.uid()
      AND stm.invitation_status = 'accepted'
      AND stm.role IN ('editor', 'admin')
  )
);
