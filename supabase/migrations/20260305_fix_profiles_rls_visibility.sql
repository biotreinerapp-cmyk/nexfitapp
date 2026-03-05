-- Permitir que usuários autenticados possam ver os perfis uns dos outros.
-- Isso é necessário para que os profissionais possam ver o nome (nome, display_name) e a foto (avatar_url) dos alunos,
-- e vice-versa no chat, dashboard e evolução.

CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');
