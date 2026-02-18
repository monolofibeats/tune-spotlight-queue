
-- Function to auto-accept pending team invitations when a user logs in
-- This links user_id and sets invitation_status to 'accepted' for matching email
CREATE OR REPLACE FUNCTION public.auto_accept_team_invitations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a new user is created, auto-accept any pending invitations for their email
  UPDATE public.streamer_team_members
  SET 
    user_id = NEW.id,
    invitation_status = 'accepted',
    accepted_at = now()
  WHERE 
    email = lower(NEW.email)
    AND invitation_status = 'pending'
    AND user_id IS NULL;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert (new signup)
CREATE OR REPLACE TRIGGER trigger_auto_accept_invitations
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_accept_team_invitations();
