
-- Marketplace Orders table (replaces store_orders for marketplace flow)
CREATE TABLE public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id),
  status TEXT NOT NULL DEFAULT 'cart',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  coupon_id UUID REFERENCES public.marketplace_coupons(id),
  delivery_address TEXT,
  delivery_city TEXT,
  payment_method TEXT DEFAULT 'pix',
  pix_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketplace Order Items
CREATE TABLE public.marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id),
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add city to marketplace_stores for free shipping calculation
ALTER TABLE public.marketplace_stores ADD COLUMN IF NOT EXISTS city TEXT;

-- Add city to pix_configs for receiver city in pix payload
ALTER TABLE public.pix_configs ADD COLUMN IF NOT EXISTS marketplace_store_id UUID REFERENCES public.marketplace_stores(id);

-- Enable RLS
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

-- RLS for marketplace_orders
CREATE POLICY "Users can view own orders" ON public.marketplace_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Store owners can view orders" ON public.marketplace_orders
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.marketplace_stores ms WHERE ms.id = store_id AND ms.owner_user_id = auth.uid()
  ));

CREATE POLICY "Users can create own orders" ON public.marketplace_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart orders" ON public.marketplace_orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Store owners can update orders" ON public.marketplace_orders
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.marketplace_stores ms WHERE ms.id = store_id AND ms.owner_user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own cart" ON public.marketplace_orders
  FOR DELETE USING (auth.uid() = user_id AND status = 'cart');

-- RLS for marketplace_order_items
CREATE POLICY "Users can view own order items" ON public.marketplace_order_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.marketplace_stores ms WHERE ms.id = o.store_id AND ms.owner_user_id = auth.uid()
    ))
  ));

CREATE POLICY "Users can insert order items" ON public.marketplace_order_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND o.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own order items" ON public.marketplace_order_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND o.user_id = auth.uid() AND o.status = 'cart'
  ));

CREATE POLICY "Users can delete own cart items" ON public.marketplace_order_items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND o.user_id = auth.uid() AND o.status = 'cart'
  ));

-- Triggers for updated_at
CREATE TRIGGER update_marketplace_orders_updated_at
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin access
CREATE POLICY "Admins can view all orders" ON public.marketplace_orders
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all order items" ON public.marketplace_order_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND has_role(auth.uid(), 'admin')
  ));
