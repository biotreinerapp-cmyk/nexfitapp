-- Allow marketplace store owners to manage their own products
CREATE POLICY "Marketplace - store owners manage own products"
ON public.marketplace_products
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.marketplace_stores s
    WHERE s.id = marketplace_products.store_id
      AND s.owner_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.marketplace_stores s
    WHERE s.id = marketplace_products.store_id
      AND s.owner_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);
