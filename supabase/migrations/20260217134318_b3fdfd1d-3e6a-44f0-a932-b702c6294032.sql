-- Drop and recreate the streamer preset policy as PERMISSIVE so it works independently of the admin policy
DROP POLICY IF EXISTS "Streamers can manage their own presets" ON public.streamer_presets;

CREATE POLICY "Streamers can manage their own presets"
ON public.streamer_presets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM streamers s
    WHERE s.id = streamer_presets.streamer_id
      AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM streamers s
    WHERE s.id = streamer_presets.streamer_id
      AND s.user_id = auth.uid()
  )
);

-- Also make admin policy permissive for consistency
DROP POLICY IF EXISTS "Admins can manage all presets" ON public.streamer_presets;

CREATE POLICY "Admins can manage all presets"
ON public.streamer_presets
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));