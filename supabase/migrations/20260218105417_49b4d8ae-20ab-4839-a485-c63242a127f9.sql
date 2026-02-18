-- Drop the old single-column unique constraint that prevents per-streamer pricing rows
ALTER TABLE public.pricing_config DROP CONSTRAINT IF EXISTS pricing_config_config_type_key;