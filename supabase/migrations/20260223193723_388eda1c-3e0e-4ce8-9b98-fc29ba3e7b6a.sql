
-- Create sales inquiries table
CREATE TABLE public.sales_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry
CREATE POLICY "Anyone can submit sales inquiry"
ON public.sales_inquiries
FOR INSERT
WITH CHECK (status = 'pending' AND processed_by IS NULL AND processed_at IS NULL);

-- Admins can view all inquiries
CREATE POLICY "Admins can view all sales inquiries"
ON public.sales_inquiries
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update inquiries
CREATE POLICY "Admins can update sales inquiries"
ON public.sales_inquiries
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete inquiries
CREATE POLICY "Admins can delete sales inquiries"
ON public.sales_inquiries
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_sales_inquiries_updated_at
BEFORE UPDATE ON public.sales_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
