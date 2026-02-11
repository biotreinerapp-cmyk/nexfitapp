-- Corrigir recursão infinita nas políticas da tabela profiles usando has_role

-- Remover políticas antigas baseadas em subselect na própria tabela profiles
DROP POLICY IF EXISTS "Acesso total para Admins" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem excluir perfis" ON public.profiles;
DROP POLICY IF EXISTS "Leitura total Admin" ON public.profiles;

-- Recriar políticas usando a função has_role e a tabela user_roles (sem recursão)
CREATE POLICY "Acesso total para Admins"
ON public.profiles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem excluir perfis"
ON public.profiles
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Leitura total Admin"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
