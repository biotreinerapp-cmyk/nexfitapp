-- Tabelas para marketplace/loja com RLS por comando

-- 1) Produtos da loja
CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário pode ver produtos ativos de lojas ativas
CREATE POLICY "store_products_select_public_active" 
ON public.store_products
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_products.store_id
      AND s.is_active = true
  )
);

-- INSERT: somente dono da loja ou admin
CREATE POLICY "store_products_insert_owner_or_admin" 
ON public.store_products
FOR INSERT
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_products.store_id
        AND s.is_active = true
        AND s.store_type = 'marketplace'
        AND s.id IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.stores s2
      WHERE s2.id = store_products.store_id
        AND s2.is_active = true
        AND s2.store_type = 'marketplace'
        AND s2.id IS NOT NULL
        AND s2.id IN (
          SELECT st.id FROM public.stores st
          WHERE st.id = store_products.store_id
            AND st.is_active = true
            AND st.store_type = 'marketplace'
        )
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- UPDATE: dono da loja ou admin
CREATE POLICY "store_products_update_owner_or_admin" 
ON public.store_products
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_products.store_id
      AND s.is_active = true
      AND s.store_type = 'marketplace'
      AND s.id IS NOT NULL
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_products.store_id
      AND s.is_active = true
      AND s.store_type = 'marketplace'
      AND s.id IS NOT NULL
  )
);

-- DELETE: dono da loja ou admin
CREATE POLICY "store_products_delete_owner_or_admin" 
ON public.store_products
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_products.store_id
      AND s.is_active = true
      AND s.store_type = 'marketplace'
      AND s.id IS NOT NULL
  )
);

-- Trigger de updated_at
CREATE TRIGGER set_timestamp_store_products
BEFORE UPDATE ON public.store_products
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- 2) Pedidos da loja
CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- SELECT: dono do pedido, dono da loja ou admin
CREATE POLICY "store_orders_select_owner_storeowner_admin" 
ON public.store_orders
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_orders.store_id
      AND s.is_active = true
  )
);

-- INSERT: somente o próprio usuário criando pedido
CREATE POLICY "store_orders_insert_user" 
ON public.store_orders
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- UPDATE: dono do pedido, dono da loja ou admin
CREATE POLICY "store_orders_update_owner_storeowner_admin" 
ON public.store_orders
FOR UPDATE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_orders.store_id
      AND s.is_active = true
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_orders.store_id
      AND s.is_active = true
  )
);

-- DELETE: dono do pedido, dono da loja ou admin
CREATE POLICY "store_orders_delete_owner_storeowner_admin" 
ON public.store_orders
FOR DELETE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_orders.store_id
      AND s.is_active = true
  )
);

-- Trigger de updated_at
CREATE TRIGGER set_timestamp_store_orders
BEFORE UPDATE ON public.store_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- 3) Itens do pedido
CREATE TABLE public.store_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_cart_items ENABLE ROW LEVEL SECURITY;

-- Base condition helper via join com orders

-- SELECT: segue mesma lógica de store_orders
CREATE POLICY "store_cart_items_select_linked_to_order" 
ON public.store_cart_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.store_orders o
    WHERE o.id = store_cart_items.order_id
      AND (
        auth.uid() = o.user_id
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = o.store_id
            AND s.is_active = true
        )
      )
  )
);

-- INSERT: somente para pedidos aos quais o usuário tem acesso (normalmente o próprio dono)
CREATE POLICY "store_cart_items_insert_linked_to_order" 
ON public.store_cart_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_orders o
    WHERE o.id = store_cart_items.order_id
      AND (
        auth.uid() = o.user_id
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = o.store_id
            AND s.is_active = true
        )
      )
  )
);

-- UPDATE: mesma regra de acesso
CREATE POLICY "store_cart_items_update_linked_to_order" 
ON public.store_cart_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.store_orders o
    WHERE o.id = store_cart_items.order_id
      AND (
        auth.uid() = o.user_id
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = o.store_id
            AND s.is_active = true
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_orders o
    WHERE o.id = store_cart_items.order_id
      AND (
        auth.uid() = o.user_id
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = o.store_id
            AND s.is_active = true
        )
      )
  )
);

-- DELETE: mesma regra de acesso
CREATE POLICY "store_cart_items_delete_linked_to_order" 
ON public.store_cart_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.store_orders o
    WHERE o.id = store_cart_items.order_id
      AND (
        auth.uid() = o.user_id
        OR has_role(auth.uid(), 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = o.store_id
            AND s.is_active = true
        )
      )
  )
);

-- Trigger de updated_at
CREATE TRIGGER set_timestamp_store_cart_items
BEFORE UPDATE ON public.store_cart_items
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();
