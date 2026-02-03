-- Add submissions_open config to control whether submissions are accepted at all
INSERT INTO public.pricing_config (config_type, min_amount_cents, max_amount_cents, step_cents, is_active)
VALUES ('submissions_open', 0, 0, 0, true)
ON CONFLICT (config_type) DO NOTHING;