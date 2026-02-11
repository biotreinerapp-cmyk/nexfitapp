-- Create enum for subscription plans (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_plan') THEN
    CREATE TYPE public.app_plan AS ENUM ('BASICO', 'SAUDE', 'SAUDE_PRO');
  END IF;
END $$;

-- Add plan column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'plano'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN plano public.app_plan NOT NULL DEFAULT 'BASICO';
  END IF;
END $$;

-- Create marketplace_stores table
CREATE TABLE IF NOT EXISTS public.marketplace_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  cover_image_url text,
  store_type text NOT NULL CHECK (store_type IN ('suplementos', 'roupas', 'artigos')),
  desconto_percent integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on marketplace_stores
ALTER TABLE public.marketplace_stores ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view only approved stores
CREATE POLICY "Marketplace - view approved stores"
ON public.marketplace_stores
FOR SELECT
TO authenticated
USING (status = 'aprovado');

-- Create marketplace_products table
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  image_url text,
  preco_original numeric(10,2) NOT NULL,
  preco_desconto numeric(10,2) NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on marketplace_products
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view products from approved stores
CREATE POLICY "Marketplace - view products from approved stores"
ON public.marketplace_products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.marketplace_stores s
    WHERE s.id = marketplace_products.store_id
      AND s.status = 'aprovado'
  )
);

-- Add updated_at trigger to marketplace_stores
CREATE TRIGGER update_marketplace_stores_updated_at
BEFORE UPDATE ON public.marketplace_stores
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Add updated_at trigger to marketplace_products
CREATE TRIGGER update_marketplace_products_updated_at
BEFORE UPDATE ON public.marketplace_products
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();
