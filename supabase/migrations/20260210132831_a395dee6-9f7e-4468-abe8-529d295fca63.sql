
-- Add profile and banner images to marketplace_stores
ALTER TABLE public.marketplace_stores
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- Add store_owner to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_owner';

-- Create storage bucket for marketplace store images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace_store_images', 'marketplace_store_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for marketplace_store_images
CREATE POLICY "Public can view store images"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace_store_images');

CREATE POLICY "Store owners can upload store images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marketplace_store_images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Store owners can update store images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'marketplace_store_images'
  AND auth.uid() IS NOT NULL
);
