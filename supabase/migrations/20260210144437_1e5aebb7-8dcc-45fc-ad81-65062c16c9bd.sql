
-- Add image_urls array column to marketplace_products for multi-image support
ALTER TABLE public.marketplace_products ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Migrate existing image_url to image_urls array
UPDATE public.marketplace_products 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Create marketplace_coupons table for plan-based coupons
CREATE TABLE public.marketplace_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_at_issue text NOT NULL,
  discount_percent numeric NOT NULL,
  free_shipping boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  order_id UUID,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.marketplace_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coupons" ON public.marketplace_coupons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own coupons" ON public.marketplace_coupons
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to generate coupons when user upgrades plan (called manually or via trigger)
CREATE OR REPLACE FUNCTION public.generate_plan_coupons(p_user_id UUID, p_plan text)
RETURNS void AS $$
DECLARE
  discount numeric;
  free_ship boolean;
  coupon_count int := 10;
BEGIN
  IF p_plan = 'ADVANCE' THEN
    discount := 5;
    free_ship := false;
  ELSIF p_plan = 'ELITE' THEN
    discount := 10;
    free_ship := true;
  ELSE
    RETURN;
  END IF;

  -- Only generate if user has fewer than 10 unused coupons for current plan
  IF (SELECT count(*) FROM public.marketplace_coupons WHERE user_id = p_user_id AND plan_at_issue = p_plan AND used_at IS NULL) >= 10 THEN
    RETURN;
  END IF;

  INSERT INTO public.marketplace_coupons (user_id, plan_at_issue, discount_percent, free_shipping)
  SELECT p_user_id, p_plan, discount, free_ship
  FROM generate_series(1, coupon_count - (SELECT count(*) FROM public.marketplace_coupons WHERE user_id = p_user_id AND plan_at_issue = p_plan AND used_at IS NULL));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
