-- Allow team members to read song files for submissions belonging to their streamer
CREATE POLICY "Team members can read song files for their streamer submissions"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'song-files'
  AND EXISTS (
    SELECT 1
    FROM submissions s
    JOIN streamers st ON s.streamer_id = st.id
    JOIN streamer_team_members tm ON tm.streamer_id = st.id
    WHERE s.audio_file_url = objects.name
      AND tm.user_id = auth.uid()
      AND tm.invitation_status = 'accepted'
  )
);