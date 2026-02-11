-- Add new onboarding preference fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS training_days text[] NULL,
ADD COLUMN IF NOT EXISTS focus_group text NULL;

-- Optional: basic check constraint for focus_group values (kept permissive to avoid breaking existing rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_focus_group_allowed'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_focus_group_allowed
    CHECK (
      focus_group IS NULL OR focus_group IN (
        'Balanced','Chest','Back','Arms','Legs','Glutes','Abs'
      )
    );
  END IF;
END $$;

-- Optional: basic check constraint for training_days length (2-6) when provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_training_days_len'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_training_days_len
    CHECK (
      training_days IS NULL OR (cardinality(training_days) BETWEEN 2 AND 6)
    );
  END IF;
END $$;