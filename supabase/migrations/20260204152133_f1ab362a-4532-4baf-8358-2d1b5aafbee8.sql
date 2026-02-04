-- Fix 1: Make song-files bucket private and update policies
UPDATE storage.buckets SET public = false WHERE id = 'song-files';

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can upload song files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read song files" ON storage.objects;

-- Create secure policies for song-files bucket
CREATE POLICY "Authenticated users can upload song files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'song-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can read their own song files"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-files' AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "Users can delete their own song files"
ON storage.objects FOR DELETE
USING (bucket_id = 'song-files' AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'::public.app_role)));

-- Fix 2: Add user_id to bid_notifications for proper access control
ALTER TABLE public.bid_notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop existing notification policies that use email for access control
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.bid_notifications;
DROP POLICY IF EXISTS "Users can mark their notifications as read" ON public.bid_notifications;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.bid_notifications;

-- Create secure policies using user_id instead of email
CREATE POLICY "Users can view their own notifications"
ON public.bid_notifications FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can mark their notifications as read"
ON public.bid_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Only allow inserts via service role (edge functions) to prevent email harvesting
CREATE POLICY "Service role can insert notifications"
ON public.bid_notifications FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));