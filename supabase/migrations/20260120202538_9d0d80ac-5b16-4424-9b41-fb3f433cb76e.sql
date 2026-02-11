-- Fix: Postgres doesn't support CREATE POLICY IF NOT EXISTS.

-- 1) Enums for new billing system
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE public.subscription_plan AS ENUM ('FREE','ADVANCE','ELITE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM ('pending','approved','rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
    CREATE TYPE public.payment_provider AS ENUM ('pix');
  END IF;
END $$;

-- 2) Profiles: add unit/store mapping + subscription fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_id uuid NULL,
  ADD COLUMN IF NOT EXISTS subscription_plan public.subscription_plan NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS plan_expiry_notified_at timestamptz NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_store_id_fkey') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_store_id_fkey
      FOREIGN KEY (store_id) REFERENCES public.stores(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON public.profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires_at ON public.profiles(plan_expires_at);

-- 3) Pix config per unit/store
CREATE TABLE IF NOT EXISTS public.pix_configs (
  store_id uuid PRIMARY KEY,
  pix_key text,
  qr_image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pix_configs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE
);

ALTER TABLE public.pix_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pix_configs' AND policyname='Pix config readable by authenticated'
  ) THEN
    CREATE POLICY "Pix config readable by authenticated"
    ON public.pix_configs
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pix_configs' AND policyname='Pix config managed by admins'
  ) THEN
    CREATE POLICY "Pix config managed by admins"
    ON public.pix_configs
    FOR ALL
    USING (
      has_role(auth.uid(), 'admin'::app_role)
      OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
    )
    WITH CHECK (
      has_role(auth.uid(), 'admin'::app_role)
      OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
    );
  END IF;
END $$;

-- 4) Payments table
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NULL,
  provider public.payment_provider NOT NULL DEFAULT 'pix',
  desired_plan public.subscription_plan NOT NULL,
  receipt_path text NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  processed_by uuid NULL,
  rejection_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT pagamentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT pagamentos_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON public.pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_requested_at ON public.pagamentos(requested_at DESC);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pagamentos' AND policyname='Pagamentos - user can view own'
  ) THEN
    CREATE POLICY "Pagamentos - user can view own"
    ON public.pagamentos
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pagamentos' AND policyname='Pagamentos - user can create own'
  ) THEN
    CREATE POLICY "Pagamentos - user can create own"
    ON public.pagamentos
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pagamentos' AND policyname='Pagamentos - admins manage'
  ) THEN
    CREATE POLICY "Pagamentos - admins manage"
    ON public.pagamentos
    FOR ALL
    USING (
      has_role(auth.uid(), 'admin'::app_role)
      OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
    )
    WITH CHECK (
      has_role(auth.uid(), 'admin'::app_role)
      OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
    );
  END IF;
END $$;

-- 5) Private storage buckets for receipts + Pix QR images
INSERT INTO storage.buckets (id, name, public)
SELECT 'payment_receipts', 'payment_receipts', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'payment_receipts');

INSERT INTO storage.buckets (id, name, public)
SELECT 'pix_qr_codes', 'pix_qr_codes', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pix_qr_codes');

DO $$ BEGIN
  -- Receipts: select own or admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='payment_receipts_select_own_or_admin'
  ) THEN
    CREATE POLICY "payment_receipts_select_own_or_admin"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'payment_receipts'
      AND (
        (auth.uid()::text = (storage.foldername(name))[1])
        OR has_role(auth.uid(), 'admin'::app_role)
        OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
      )
    );
  END IF;

  -- Receipts: insert own
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='payment_receipts_insert_own'
  ) THEN
    CREATE POLICY "payment_receipts_insert_own"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'payment_receipts'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Pix QR: select authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='pix_qr_codes_select_authenticated'
  ) THEN
    CREATE POLICY "pix_qr_codes_select_authenticated"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'pix_qr_codes'
      AND auth.uid() IS NOT NULL
    );
  END IF;

  -- Pix QR: admin insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='pix_qr_codes_admin_write'
  ) THEN
    CREATE POLICY "pix_qr_codes_admin_write"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'pix_qr_codes'
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
      )
    );
  END IF;

  -- Pix QR: admin update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='pix_qr_codes_admin_update'
  ) THEN
    CREATE POLICY "pix_qr_codes_admin_update"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'pix_qr_codes'
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
      )
    )
    WITH CHECK (
      bucket_id = 'pix_qr_codes'
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
      )
    );
  END IF;
END $$;

-- 6) updated_at trigger for pix_configs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_pix_configs_updated_at') THEN
    CREATE TRIGGER set_pix_configs_updated_at
    BEFORE UPDATE ON public.pix_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END $$;
