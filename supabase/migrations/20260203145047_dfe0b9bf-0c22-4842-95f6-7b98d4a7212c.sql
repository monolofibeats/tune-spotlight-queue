-- Add submission pricing config
INSERT INTO public.pricing_config (config_type, min_amount_cents, max_amount_cents, step_cents, is_active)
VALUES ('submission', 100, 2000, 50, false);
-- is_active = false means submissions are FREE by default