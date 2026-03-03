-- Fix RLS for telemedicina_servicos to ensure professionals can see categories during onboarding
DROP POLICY IF EXISTS "Telemed - alunos veem serviços ativos" ON public.telemedicina_servicos;
DROP POLICY IF EXISTS "Telemed - allow select for all authenticated"
ON public.telemedicina_servicos;

CREATE POLICY "Telemed - allow select for all authenticated"
ON public.telemedicina_servicos
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.telemedicina_servicos ENABLE ROW LEVEL SECURITY;
