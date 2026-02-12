
-- Table for admin-configurable highlight/promotion packages
CREATE TABLE public.highlight_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  duration_days integer NOT NULL DEFAULT 7,
  price_cents integer NOT NULL DEFAULT 0,
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  badge_label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.highlight_offers ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "highlight_offers_admin_manage"
ON public.highlight_offers
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
);

-- Authenticated users can view active offers
CREATE POLICY "highlight_offers_view_active"
ON public.highlight_offers
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_highlight_offers_updated_at
BEFORE UPDATE ON public.highlight_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
