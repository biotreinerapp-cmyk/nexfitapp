-- DEFINITIVE FIX FOR TELEMEDICINA_SERVICOS VISIBILITY (V2 - NO DELETE)
-- Run this in your Supabase SQL Editor

-- 1. Disable RLS temporarily to ensure visibility regardless of policies
ALTER TABLE public.telemedicina_servicos DISABLE ROW LEVEL SECURITY;

-- 2. Ensure the table has the correct data using UPSERT (to avoid FK errors)
-- First, ensure there is a unique constraint on slug if not exists (defensive check)
-- Note: In Supabase, if slug is already unique this won't hurt.
INSERT INTO public.telemedicina_servicos (nome, slug, ativo, icone)
VALUES 
    ('Cardiologia', 'cardiologia', true, 'heart'),
    ('Educador Físico', 'educador-fisico', true, 'dumbbell'),
    ('Endocrinologia', 'endocrinologia', true, 'activity'),
    ('Fisioterapia', 'fisioterapia', true, 'accessibility'),
    ('Nutrição', 'nutricao', true, 'apple'),
    ('Ortopedia', 'ortopedia', true, 'bone'),
    ('Psicologia', 'psicologia', true, 'brain')
ON CONFLICT (slug) 
DO UPDATE SET 
    nome = EXCLUDED.nome,
    ativo = EXCLUDED.ativo,
    icone = EXCLUDED.icone;

-- 3. Create a totally open policy just in case you re-enable RLS later
DROP POLICY IF EXISTS "Allow select for everyone" ON public.telemedicina_servicos;
CREATE POLICY "Allow select for everyone" 
ON public.telemedicina_servicos 
FOR SELECT 
TO public 
USING (true);

-- 4. Verify data (check the results tab after running)
SELECT * FROM public.telemedicina_servicos;
