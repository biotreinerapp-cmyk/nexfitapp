-- 1) Add optional reviewed receipt path to pagamentos
ALTER TABLE public.pagamentos
ADD COLUMN IF NOT EXISTS reviewed_receipt_path text NULL;

-- 2) Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity_table text NOT NULL DEFAULT 'pagamentos',
  entity_id uuid NOT NULL,
  target_user_id uuid NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Admin/master can read audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_actions' AND policyname='Admin audit - read'
  ) THEN
    CREATE POLICY "Admin audit - read"
    ON public.admin_actions
    FOR SELECT
    USING (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_actions' AND policyname='Admin audit - insert'
  ) THEN
    CREATE POLICY "Admin audit - insert"
    ON public.admin_actions
    FOR INSERT
    WITH CHECK (
      (actor_id = auth.uid())
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR ((auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      )
    );
  END IF;
END $$;

-- 3) Storage: allow admins/master to view/upload reviewed receipts (same bucket payment_receipts)
-- Note: bucket already exists; we only add policies on storage.objects.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Payment receipts - admin read'
  ) THEN
    CREATE POLICY "Payment receipts - admin read"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'payment_receipts'
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR ((auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Payment receipts - admin insert'
  ) THEN
    CREATE POLICY "Payment receipts - admin insert"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'payment_receipts'
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR ((auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Payment receipts - admin update'
  ) THEN
    CREATE POLICY "Payment receipts - admin update"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'payment_receipts'
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR ((auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      )
    )
    WITH CHECK (
      bucket_id = 'payment_receipts'
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR ((auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
      )
    );
  END IF;
END $$;