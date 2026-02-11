-- In-app notifications for payment approval/rejection

-- 1) Table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id_created_at
  ON public.user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id_unread
  ON public.user_notifications (user_id)
  WHERE read_at IS NULL;

-- 3) RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notifications'
      AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
      ON public.user_notifications
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notifications'
      AND policyname = 'Users can mark own notifications read'
  ) THEN
    CREATE POLICY "Users can mark own notifications read"
      ON public.user_notifications
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4) Trigger to create notification when payment status changes
CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only when status changes to approved/rejected
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    INSERT INTO public.user_notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'payment',
      CASE WHEN NEW.status = 'approved' THEN 'Pagamento aprovado' ELSE 'Pagamento rejeitado' END,
      CASE
        WHEN NEW.status = 'approved' THEN 'Seu upgrade foi aprovado e seu plano já está ativo.'
        ELSE COALESCE('Motivo: ' || NULLIF(NEW.rejection_reason, ''), 'Seu pagamento foi rejeitado. Verifique o motivo e tente novamente.')
      END,
      jsonb_build_object(
        'payment_id', NEW.id,
        'status', NEW.status,
        'desired_plan', NEW.desired_plan,
        'processed_at', NEW.processed_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_notify_payment_status_change'
  ) THEN
    CREATE TRIGGER trg_notify_payment_status_change
    AFTER UPDATE OF status, rejection_reason, processed_at
    ON public.pagamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_payment_status_change();
  END IF;
END $$;