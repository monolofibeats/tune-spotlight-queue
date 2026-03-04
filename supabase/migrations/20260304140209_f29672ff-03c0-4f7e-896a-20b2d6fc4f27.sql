ALTER TABLE public.streamers 
ADD COLUMN IF NOT EXISTS offline_socials jsonb DEFAULT '["twitch","instagram","tiktok"]'::jsonb,
ADD COLUMN IF NOT EXISTS next_stream_platform text DEFAULT null;