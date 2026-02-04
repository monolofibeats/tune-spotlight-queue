-- Table to track bids on submissions for queue position
CREATE TABLE public.submission_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  bid_amount_cents INTEGER NOT NULL DEFAULT 0,
  total_paid_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(submission_id)
);

-- Table for bid offer notifications
CREATE TABLE public.bid_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  offer_amount_cents INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.submission_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for submission_bids
CREATE POLICY "Users can view their own bids"
ON public.submission_bids
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create bids for their submissions"
ON public.submission_bids
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own bids"
ON public.submission_bids
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all bids"
ON public.submission_bids
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for bid_notifications
CREATE POLICY "Users can view their own notifications"
ON public.bid_notifications
FOR SELECT
USING (email IN (SELECT email FROM auth.users WHERE id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can mark their notifications as read"
ON public.bid_notifications
FOR UPDATE
USING (email IN (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage all notifications"
ON public.bid_notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow insert for authenticated users"
ON public.bid_notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.bid_notifications;

-- Trigger to update updated_at on submission_bids
CREATE TRIGGER update_submission_bids_updated_at
BEFORE UPDATE ON public.submission_bids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();