-- Add unique constraint on (streamer_id, config_type) to support proper upserts
-- First check if constraint already exists, then add if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pricing_config_streamer_id_config_type_key'
  ) THEN
    ALTER TABLE public.pricing_config 
    ADD CONSTRAINT pricing_config_streamer_id_config_type_key 
    UNIQUE (streamer_id, config_type);
  END IF;
END $$;