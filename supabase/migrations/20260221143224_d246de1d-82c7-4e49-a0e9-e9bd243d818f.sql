-- Drop the broken unique constraint
ALTER TABLE public.streamer_top_songs DROP CONSTRAINT streamer_top_songs_streamer_id_position_is_active_key;

-- Add a partial unique index: only one active song per position per streamer
CREATE UNIQUE INDEX streamer_top_songs_active_position_unique 
ON public.streamer_top_songs (streamer_id, position) 
WHERE is_active = true;