-- Create stream_sessions table for managing livestream states
CREATE TABLE public.stream_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    title TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stream_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view sessions (needed for theme state)
CREATE POLICY "Anyone can view stream sessions"
ON public.stream_sessions
FOR SELECT
USING (true);

-- Only admins can manage sessions
CREATE POLICY "Admins can manage stream sessions"
ON public.stream_sessions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add user_id column to submissions for tracking user activity
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add boost_amount column for boosting functionality
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS boost_amount NUMERIC NOT NULL DEFAULT 0;

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);

-- Update RLS policy to allow users to view their own submissions
CREATE POLICY "Users can view their own submissions"
ON public.submissions
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Allow users to update their own submissions (for boosting)
CREATE POLICY "Users can update their own submissions"
ON public.submissions
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for stream_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_sessions;