
-- Allow store owners to manage their own pix config via marketplace_store_id
CREATE POLICY "Store owners can manage own pix config"
  ON public.pix_configs
  FOR ALL
  USING (
    marketplace_store_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.marketplace_stores ms 
      WHERE ms.id = pix_configs.marketplace_store_id AND ms.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    marketplace_store_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.marketplace_stores ms 
      WHERE ms.id = pix_configs.marketplace_store_id AND ms.owner_user_id = auth.uid()
    )
  );
