-- ============================================================
-- Migration: Fix Professional Binding & Telemedicina Issues
-- Date: 2026-03-04
-- ============================================================

-- -----------------------------------------------------------------
-- 1. RLS UPDATE policy so professionals can accept/reject hire requests
-- -----------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_hires'
          AND policyname = 'Professionals can update their hires'
    ) THEN
        CREATE POLICY "Professionals can update their hires"
            ON public.professional_hires
            FOR UPDATE
            TO authenticated
            USING (
                auth.uid() IN (
                    SELECT user_id FROM public.professionals WHERE id = professional_id
                )
            )
            WITH CHECK (
                auth.uid() IN (
                    SELECT user_id FROM public.professionals WHERE id = professional_id
                )
            );
    END IF;
END $$;

-- Also ensure students can update their own hires (e.g. payment_status)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_hires'
          AND policyname = 'Students can update their own hires'
    ) THEN
        CREATE POLICY "Students can update their own hires"
            ON public.professional_hires
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = student_id)
            WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;

-- -----------------------------------------------------------------
-- 2. Partial unique index: only ONE active request per (student, professional)
--    Prevents duplicates when student retries payment
-- -----------------------------------------------------------------
DROP INDEX IF EXISTS professional_hires_active_unique;
CREATE UNIQUE INDEX professional_hires_active_unique
    ON public.professional_hires (professional_id, student_id)
    WHERE status IN ('pending', 'awaiting_verification', 'accepted');

-- -----------------------------------------------------------------
-- 3. Table: professional_student_bindings
--    Formal binding record created when professional accepts a hire
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_student_bindings (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id uuid        NOT NULL REFERENCES public.professionals(id)  ON DELETE CASCADE,
    student_id      uuid        NOT NULL REFERENCES auth.users(id)            ON DELETE CASCADE,
    hire_id         uuid        REFERENCES public.professional_hires(id)      ON DELETE SET NULL,
    status          text        NOT NULL DEFAULT 'active',  -- active | paused | ended
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (professional_id, student_id)
);

-- Enable RLS
ALTER TABLE public.professional_student_bindings ENABLE ROW LEVEL SECURITY;

-- Professionals see and manage their bindings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_student_bindings'
          AND policyname = 'Professionals manage bindings'
    ) THEN
        CREATE POLICY "Professionals manage bindings"
            ON public.professional_student_bindings
            FOR ALL
            TO authenticated
            USING (
                auth.uid() IN (
                    SELECT user_id FROM public.professionals WHERE id = professional_id
                )
            )
            WITH CHECK (
                auth.uid() IN (
                    SELECT user_id FROM public.professionals WHERE id = professional_id
                )
            );
    END IF;
END $$;

-- Students see their own bindings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_student_bindings'
          AND policyname = 'Students see their bindings'
    ) THEN
        CREATE POLICY "Students see their bindings"
            ON public.professional_student_bindings
            FOR SELECT
            TO authenticated
            USING (auth.uid() = student_id);
    END IF;
END $$;

-- -----------------------------------------------------------------
-- 4. Trigger to auto-update updated_at on professional_student_bindings
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_bindings_updated_at ON public.professional_student_bindings;
CREATE TRIGGER set_bindings_updated_at
    BEFORE UPDATE ON public.professional_student_bindings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
