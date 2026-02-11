-- Coluna auxiliar para armazenar o nome do profissional no momento do agendamento
ALTER TABLE public.telemedicina_agendamentos
  ADD COLUMN IF NOT EXISTS profissional_nome text;

-- Permitir que alunos vejam apenas serviços de telemedicina ativos
CREATE POLICY "Telemed - alunos veem serviços ativos"
  ON public.telemedicina_servicos
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (ativo IS TRUE);

-- Permitir que alunos vejam apenas profissionais disponíveis
CREATE POLICY "Telemed - alunos veem profissionais disponiveis"
  ON public.telemedicina_profissionais
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (disponivel IS TRUE);