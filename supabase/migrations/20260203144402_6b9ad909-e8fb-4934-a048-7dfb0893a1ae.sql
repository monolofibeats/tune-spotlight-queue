-- Create pricing configuration table for dynamic bid prices
CREATE TABLE public.pricing_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_type text NOT NULL UNIQUE, -- 'skip_line' for priority bidding
    min_amount_cents integer NOT NULL DEFAULT 50, -- €0.50 minimum
    max_amount_cents integer NOT NULL DEFAULT 10000, -- €100 maximum
    step_cents integer NOT NULL DEFAULT 50, -- €0.50 increments
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read pricing config (needed for frontend)
CREATE POLICY "Anyone can read pricing config"
ON public.pricing_config
FOR SELECT
USING (true);

-- Only admins can modify pricing config
CREATE POLICY "Admins can manage pricing config"
ON public.pricing_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default pricing config
INSERT INTO public.pricing_config (config_type, min_amount_cents, max_amount_cents, step_cents)
VALUES ('skip_line', 50, 10000, 50);

-- Create trigger for updated_at
CREATE TRIGGER update_pricing_config_updated_at
BEFORE UPDATE ON public.pricing_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for pricing changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_config;