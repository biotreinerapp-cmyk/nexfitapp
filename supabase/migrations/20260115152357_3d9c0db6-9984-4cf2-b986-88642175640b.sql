-- 1) Helper trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2) Unified workout history table (offline sync target)
CREATE TABLE IF NOT EXISTS public.workout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,

  -- Core identity
  activity_type text NOT NULL, -- e.g. corrida, caminhada, musculacao
  source text NOT NULL DEFAULT 'app', -- app|import|manual
  privacy text NOT NULL DEFAULT 'public',

  -- Time
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds integer,

  -- Metrics
  distance_km numeric,
  calories integer,
  avg_hr integer,
  max_hr integer,
  pace_avg numeric,

  -- Route / GPS
  gps_polyline jsonb,
  gps_points jsonb,

  -- Detailed metadata
  intensity jsonb, -- zones, perceived exertion, etc.
  equipment text[], -- shoes, bike, etc.
  notes text,
  extras jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS workout_history_user_started_idx
ON public.workout_history (user_id, started_at DESC);

-- 4) Trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_workout_history_updated_at'
  ) THEN
    CREATE TRIGGER set_workout_history_updated_at
    BEFORE UPDATE ON public.workout_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5) RLS
ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_history'
      AND policyname = 'Users can view own workout_history'
  ) THEN
    CREATE POLICY "Users can view own workout_history"
    ON public.workout_history
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_history'
      AND policyname = 'Users can insert own workout_history'
  ) THEN
    CREATE POLICY "Users can insert own workout_history"
    ON public.workout_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_history'
      AND policyname = 'Users can update own workout_history'
  ) THEN
    CREATE POLICY "Users can update own workout_history"
    ON public.workout_history
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_history'
      AND policyname = 'Users can delete own workout_history'
  ) THEN
    CREATE POLICY "Users can delete own workout_history"
    ON public.workout_history
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;