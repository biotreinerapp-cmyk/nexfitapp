
-- Table for user manual routines (Modo Raiz)
CREATE TABLE public.manual_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- days JSONB structure:
-- [
--   {
--     "id": "uuid",
--     "name": "Dia A - Peito/Tríceps",
--     "exercises": [
--       {
--         "id": "uuid",
--         "name": "Supino reto",
--         "sets": 4,
--         "reps": 12,
--         "load": "40kg",
--         "rest_seconds": 60,
--         "notes": ""
--       }
--     ]
--   }
-- ]

CREATE INDEX idx_manual_routines_user ON public.manual_routines(user_id);

ALTER TABLE public.manual_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routines"
  ON public.manual_routines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own routines"
  ON public.manual_routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines"
  ON public.manual_routines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines"
  ON public.manual_routines FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_manual_routines_updated_at
  BEFORE UPDATE ON public.manual_routines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
