-- Create workout_sessions table for strength/muscle workouts
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  club_id uuid NULL,
  exercise_name text NOT NULL,
  target_muscles text[] NULL,
  series integer NULL,
  repetitions integer NULL,
  total_reps integer NULL,
  status text NOT NULL DEFAULT 'em_andamento',
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz NULL,
  bpm_medio integer NULL,
  calorias_estimadas numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_sessions_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.running_clubs (id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: users manage their own workout sessions
CREATE POLICY "WorkoutSessions - manage own" 
ON public.workout_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
