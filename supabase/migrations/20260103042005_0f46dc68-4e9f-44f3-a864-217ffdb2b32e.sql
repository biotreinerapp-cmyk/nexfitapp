-- Habilitar (ou garantir) RLS na tabela de agenda de treinos
ALTER TABLE public.agenda_treinos ENABLE ROW LEVEL SECURITY;

-- Permitir que o aluno insira sua própria agenda
CREATE POLICY "Alunos inserem propria agenda"
ON public.agenda_treinos
FOR INSERT
WITH CHECK (auth.uid() = aluno_id);

-- Permitir que o aluno atualize apenas os próprios registros
CREATE POLICY "Alunos atualizam propria agenda"
ON public.agenda_treinos
FOR UPDATE
USING (auth.uid() = aluno_id)
WITH CHECK (auth.uid() = aluno_id);

-- Permitir que o aluno delete apenas os próprios registros
CREATE POLICY "Alunos removem propria agenda"
ON public.agenda_treinos
FOR DELETE
USING (auth.uid() = aluno_id);
