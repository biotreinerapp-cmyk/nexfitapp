-- Fix pix_configs: drop PK, add id, make store_id nullable

-- 1) Drop existing PK
ALTER TABLE public.pix_configs DROP CONSTRAINT IF EXISTS pix_configs_pkey;

-- 2) Add id column as new PK
ALTER TABLE public.pix_configs ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
UPDATE public.pix_configs SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE public.pix_configs ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.pix_configs ADD PRIMARY KEY (id);

-- 3) Make store_id nullable
ALTER TABLE public.pix_configs ALTER COLUMN store_id DROP NOT NULL;

-- 4) Storage bucket for Pix QR codes (admin uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('pix_qr_codes', 'pix_qr_codes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view QR codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'pix_qr_codes_public_read'
  ) THEN
    CREATE POLICY "pix_qr_codes_public_read"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'pix_qr_codes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'pix_qr_codes_admin_write'
  ) THEN
    CREATE POLICY "pix_qr_codes_admin_write"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'pix_qr_codes'
        AND (has_role(auth.uid(), 'admin'::public.app_role) OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'pix_qr_codes_admin_update'
  ) THEN
    CREATE POLICY "pix_qr_codes_admin_update"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'pix_qr_codes'
        AND (has_role(auth.uid(), 'admin'::public.app_role) OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      )
      WITH CHECK (
        bucket_id = 'pix_qr_codes'
        AND (has_role(auth.uid(), 'admin'::public.app_role) OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'pix_qr_codes_admin_delete'
  ) THEN
    CREATE POLICY "pix_qr_codes_admin_delete"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'pix_qr_codes'
        AND (has_role(auth.uid(), 'admin'::public.app_role) OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      );
  END IF;
END $$;

-- 5) Plan configs table
CREATE TABLE IF NOT EXISTS public.plan_configs (
  plan public.subscription_plan PRIMARY KEY,
  price_cents integer NOT NULL DEFAULT 0,
  features text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_plan_configs_updated_at'
  ) THEN
    CREATE TRIGGER trg_plan_configs_updated_at
    BEFORE UPDATE ON public.plan_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plan_configs'
      AND policyname = 'Plan configs - admins manage'
  ) THEN
    CREATE POLICY "Plan configs - admins manage"
      ON public.plan_configs
      FOR ALL
      USING (has_role(auth.uid(), 'admin'::public.app_role) OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role) OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com');
  END IF;
END $$;

-- Seed rows (idempotent)
INSERT INTO public.plan_configs (plan, price_cents, features)
VALUES
  ('FREE', 0, ARRAY[]::text[]),
  ('ADVANCE', 0, ARRAY[]::text[]),
  ('ELITE', 0, ARRAY[]::text[])
ON CONFLICT (plan) DO NOTHING;

-- 6) Feature catalog for future management
CREATE TABLE IF NOT EXISTS public.plan_feature_catalog (
  key text PRIMARY KEY,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_feature_catalog ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plan_feature_catalog'
      AND policyname = 'Plan feature catalog - admins manage'
  ) THEN
    CREATE POLICY "Plan feature catalog - admins manage"
      ON public.plan_feature_catalog
      FOR ALL
      USING (has_role(auth.uid(), 'admin'::public.app_role) OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role) OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com');
  END IF;
END $$;

INSERT INTO public.plan_feature_catalog (key, label)
VALUES
  ('treinos', 'Treinos e histórico'),
  ('monitoramento', 'Monitoramento cardio'),
  ('nutricao', 'Nutricionista virtual'),
  ('telemedicina', 'Telemedicina'),
  ('insights', 'Insights IA avançados'),
  ('suporte_prioritario', 'Suporte prioritário')
ON CONFLICT (key) DO NOTHING;