-- Migration to fix RLS for exercises table
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to manage all exercises
DROP POLICY IF EXISTS "Admins podem gerenciar tudo" ON public.exercises;
CREATE POLICY "Admins podem gerenciar tudo"
ON public.exercises FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy to allow all authenticated users to view exercises
DROP POLICY IF EXISTS "Todos podem visualizar exercícios" ON public.exercises;
CREATE POLICY "Todos podem visualizar exercícios"
ON public.exercises FOR SELECT
TO authenticated
USING (true);
