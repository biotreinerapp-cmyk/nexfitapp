-- Permitir que usuários autenticados (profissionais) possam ler os dados de evolução dos alunos
-- Isso impacta as tabelas 'workout_sessions' e 'atividade_sessao'.

CREATE POLICY "workout_sessions_viewable_by_authenticated" 
ON public.workout_sessions FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "atividade_sessao_viewable_by_authenticated" 
ON public.atividade_sessao FOR SELECT 
USING (auth.role() = 'authenticated');
