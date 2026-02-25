-- Migration: add instrucoes (execution guide) to exercises table
-- Each element = one numbered instruction step (array of strings)

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS instrucoes text[] DEFAULT '{}';

COMMENT ON COLUMN exercises.instrucoes IS 'Passo a passo de execução do exercício (array de strings)';
