-- Tabela de configurações gerais do sistema
CREATE TABLE public.configuracoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Política: Admin master tem acesso total
CREATE POLICY "Admin master total configuracoes"
ON public.configuracoes_sistema
FOR ALL
USING ((auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com');

-- Política: Admins gerenciam configurações
CREATE POLICY "Admins gerenciam configuracoes"
ON public.configuracoes_sistema
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para manter updated_at
CREATE TRIGGER set_configuracoes_updated_at
BEFORE UPDATE ON public.configuracoes_sistema
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();