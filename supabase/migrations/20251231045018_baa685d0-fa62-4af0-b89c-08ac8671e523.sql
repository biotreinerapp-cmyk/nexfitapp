-- Tabela de agendamentos de telemedicina
CREATE TABLE IF NOT EXISTS public.telemedicina_agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL,
  profissional_id uuid NOT NULL,
  data_hora timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  consulta_link text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FKs para profiles e telemedicina_profissionais
ALTER TABLE public.telemedicina_agendamentos
  ADD CONSTRAINT telemedicina_agendamentos_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.telemedicina_agendamentos
  ADD CONSTRAINT telemedicina_agendamentos_profissional_id_fkey
  FOREIGN KEY (profissional_id) REFERENCES public.telemedicina_profissionais(id) ON DELETE CASCADE;

-- Habilita RLS
ALTER TABLE public.telemedicina_agendamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de alunos (gerenciam seus próprios agendamentos)
CREATE POLICY "Alunos gerenciam seus próprios agendamentos"
  ON public.telemedicina_agendamentos
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

-- Políticas de admin (gerencia todos agendamentos)
CREATE POLICY "Admins gerenciam todos agendamentos"
  ON public.telemedicina_agendamentos
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));