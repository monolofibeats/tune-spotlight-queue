
-- Insert default built-in form fields for any approved streamer that has none
INSERT INTO public.streamer_form_fields (streamer_id, field_name, field_label, field_type, placeholder, is_required, is_enabled, field_order)
SELECT 
  s.id,
  v.field_name,
  v.field_label,
  v.field_type,
  v.placeholder,
  v.is_required,
  true,
  v.field_order
FROM public.streamers s
CROSS JOIN (VALUES
  ('song_url',    'Song Link',    'url',      'Paste your SoundCloud, Spotify, or other link', true,  0),
  ('artist_name', 'Artist Name',  'text',     'Your artist name',                              false, 1),
  ('song_title',  'Song Title',   'text',     'Title of your track',                           false, 2),
  ('email',       'Email',        'email',    'your@email.com',                                false, 3),
  ('message',     'Message',      'textarea', 'Anything you want the streamer to know?',       false, 4)
) AS v(field_name, field_label, field_type, placeholder, is_required, field_order)
WHERE s.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.streamer_form_fields f WHERE f.streamer_id = s.id
  );

-- Create a trigger function to auto-seed default fields when a new streamer is created/approved
CREATE OR REPLACE FUNCTION public.seed_default_form_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run when status becomes 'approved' for the first time and no fields exist yet
  IF NEW.status = 'approved' AND NOT EXISTS (
    SELECT 1 FROM public.streamer_form_fields WHERE streamer_id = NEW.id
  ) THEN
    INSERT INTO public.streamer_form_fields (streamer_id, field_name, field_label, field_type, placeholder, is_required, is_enabled, field_order)
    VALUES
      (NEW.id, 'song_url',    'Song Link',    'url',      'Paste your SoundCloud, Spotify, or other link', true,  true, 0),
      (NEW.id, 'artist_name', 'Artist Name',  'text',     'Your artist name',                              false, true, 1),
      (NEW.id, 'song_title',  'Song Title',   'text',     'Title of your track',                           false, true, 2),
      (NEW.id, 'email',       'Email',        'email',    'your@email.com',                                false, true, 3),
      (NEW.id, 'message',     'Message',      'textarea', 'Anything you want the streamer to know?',       false, true, 4);
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to streamers table (fires on INSERT and on status UPDATE)
DROP TRIGGER IF EXISTS trigger_seed_form_fields ON public.streamers;
CREATE TRIGGER trigger_seed_form_fields
  AFTER INSERT OR UPDATE OF status ON public.streamers
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_form_fields();
