
-- Allow store owners to view their own store regardless of status
CREATE POLICY "Store owners can view own store"
ON public.marketplace_stores
FOR SELECT
USING (auth.uid() = owner_user_id);

-- Allow store owners to update their own store
CREATE POLICY "Store owners can update own store"
ON public.marketplace_stores
FOR UPDATE
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);
