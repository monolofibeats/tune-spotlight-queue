-- Create a function that assigns the 'streamer' role when a user signs up
-- and their email matches an approved streamer profile
CREATE OR REPLACE FUNCTION public.link_user_to_streamer()
RETURNS TRIGGER AS $$
DECLARE
  v_streamer_id UUID;
BEGIN
  -- Check if there's an approved streamer with this email that has a placeholder user_id
  SELECT id INTO v_streamer_id
  FROM public.streamers
  WHERE email = NEW.email
    AND status = 'approved'
    AND user_id != NEW.id
  LIMIT 1;

  IF v_streamer_id IS NOT NULL THEN
    -- Update the streamer profile to link to this user
    UPDATE public.streamers
    SET user_id = NEW.id
    WHERE id = v_streamer_id;

    -- Add the streamer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'streamer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a trigger that runs after a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_link_streamer ON auth.users;
CREATE TRIGGER on_auth_user_created_link_streamer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_user_to_streamer();

-- Also create a function to manually assign streamer role when admin approves
-- and there's already a user with that email
CREATE OR REPLACE FUNCTION public.assign_streamer_role_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Only run when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Check if there's a user with this email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      -- Update the streamer to link to this user
      NEW.user_id := v_user_id;

      -- Add the streamer role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'streamer')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a trigger on streamers table
DROP TRIGGER IF EXISTS on_streamer_approved ON public.streamers;
CREATE TRIGGER on_streamer_approved
  BEFORE INSERT OR UPDATE ON public.streamers
  FOR EACH ROW EXECUTE FUNCTION public.assign_streamer_role_on_approval();