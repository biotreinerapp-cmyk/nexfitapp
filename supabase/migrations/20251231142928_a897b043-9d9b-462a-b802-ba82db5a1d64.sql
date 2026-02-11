-- Adiciona coluna de email aos perfis para exibição no Admin Master
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

-- Opcionalmente, você pode depois popular esse campo manualmente via painel ou scripts
-- As políticas RLS existentes continuam válidas, pois não dependem da coluna email.