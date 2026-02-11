-- Add explicit confirmation flag for completed sessions
ALTER TABLE public.atividade_sessao
ADD COLUMN IF NOT EXISTS confirmado boolean NOT NULL DEFAULT false;

ALTER TABLE public.workout_sessions
ADD COLUMN IF NOT EXISTS confirmado boolean NOT NULL DEFAULT false;