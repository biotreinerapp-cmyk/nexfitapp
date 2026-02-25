-- ============================================================
-- Migration: estrutura para treinos automáticos no Nexfit
-- 2026-02-25: adiciona type + is_verified em exercises,
-- cria workouts e workout_exercises
-- ============================================================

-- ① Enum para diferenciar exercícios de dicas de bem-estar
DO $$ BEGIN
  CREATE TYPE exercise_content_type AS ENUM ('exercise', 'wellness_tip');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS type exercise_content_type NOT NULL DEFAULT 'exercise',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- Registros sem músculo-alvo provavelmente são wellness tips
UPDATE exercises
  SET type = 'wellness_tip'
  WHERE target_muscle IS NULL OR target_muscle = '';

-- ② Enum para nível de dificuldade do treino
DO $$ BEGIN
  CREATE TYPE workout_difficulty AS ENUM ('iniciante', 'intermediario', 'avancado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ③ Tabela principal de treinos
CREATE TABLE IF NOT EXISTS workouts (
  id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT              NOT NULL,
  description      TEXT,
  difficulty_level workout_difficulty NOT NULL DEFAULT 'iniciante',
  duration_minutes INT,
  goal             TEXT,
  is_active        BOOLEAN           NOT NULL DEFAULT true,
  is_public        BOOLEAN           NOT NULL DEFAULT false,
  created_by       UUID              REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workouts_updated_at ON workouts;
CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ④ Tabela intermediária: workout_exercises (M-N)
CREATE TABLE IF NOT EXISTS workout_exercises (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id       UUID NOT NULL REFERENCES workouts(id)  ON DELETE CASCADE,
  exercise_id      UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  "order"          INT  NOT NULL DEFAULT 1,
  sets             INT  NOT NULL DEFAULT 3,
  reps             INT,               -- NULL = por tempo
  duration_seconds INT,               -- alternativo a reps
  rest_seconds     INT  DEFAULT 60,
  notes            TEXT,
  UNIQUE (workout_id, "order")
);

-- ⑤ RLS
ALTER TABLE workouts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workouts_select" ON workouts;
CREATE POLICY "workouts_select" ON workouts
  FOR SELECT USING (
    is_public = true
    OR auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "workouts_write" ON workouts;
CREATE POLICY "workouts_write" ON workouts
  FOR ALL USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "workout_exercises_select" ON workout_exercises;
CREATE POLICY "workout_exercises_select" ON workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_id
        AND (w.is_public = true OR w.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "workout_exercises_write" ON workout_exercises;
CREATE POLICY "workout_exercises_write" ON workout_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_id
        AND (
          w.created_by = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
  );

-- ⑥ Índices
CREATE INDEX IF NOT EXISTS idx_exercises_type        ON exercises (type);
CREATE INDEX IF NOT EXISTS idx_exercises_is_verified ON exercises (is_verified);
CREATE INDEX IF NOT EXISTS idx_exercises_target      ON exercises (target_muscle);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_wid ON workout_exercises (workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_eid ON workout_exercises (exercise_id);
CREATE INDEX IF NOT EXISTS idx_workouts_difficulty   ON workouts (difficulty_level);
CREATE INDEX IF NOT EXISTS idx_workouts_created_by   ON workouts (created_by);
