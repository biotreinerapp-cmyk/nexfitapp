-- Conceder acesso total do usuário de implementação aos recursos de clubes de corrida
-- Usuário: contatomaydsonsv@gmail.com (id obtido de auth.users)

DO $$
DECLARE
  v_user_id uuid := '1faca6f4-86d9-47f6-a345-24853e7ffea8';
BEGIN
  -- Garantir que o usuário tenha role admin na tabela user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END
$$;

-- Políticas específicas para garantir que o usuário de implementação não tenha bloqueios

-- running_club_activities: permitir qualquer operação para o usuário de implementação
CREATE POLICY "running_club_activities_impl_full_access"
ON public.running_club_activities
AS PERMISSIVE
FOR ALL
TO public
USING (auth.uid() = '1faca6f4-86d9-47f6-a345-24853e7ffea8')
WITH CHECK (auth.uid() = '1faca6f4-86d9-47f6-a345-24853e7ffea8');

-- club_posts: permitir qualquer operação para o usuário de implementação
CREATE POLICY "club_posts_impl_full_access"
ON public.club_posts
AS PERMISSIVE
FOR ALL
TO public
USING (auth.uid() = '1faca6f4-86d9-47f6-a345-24853e7ffea8')
WITH CHECK (auth.uid() = '1faca6f4-86d9-47f6-a345-24853e7ffea8');

-- running_club_members: permitir leitura e gestão completa das memberships para o usuário de implementação
CREATE POLICY "running_club_members_impl_full_access"
ON public.running_club_members
AS PERMISSIVE
FOR ALL
TO public
USING (auth.uid() = '1faca6f4-86d9-47f6-a345-24853e7ffea8')
WITH CHECK (auth.uid() = '1faca6f4-86d9-47f6-a345-24853e7ffea8');

-- running_club_challenges: permitir gestão completa para o usuário de implementação
CREATE POLICY "running_club_challenges_impl_full_access"
ON public.running_club_challenges
AS PERMISSIVE
FOR ALL
TO public
USING (auth.uid() = '1faca6f4-86d9-47f6-a345-24853e7ffea8')
WITH CHECK (auth.uid() = '1faca6f4-86d9-47f6-a345-24853e7ffea8');

-- running_club_challenge_progress: permitir gestão completa para o usuário de implementação
CREATE POLICY "running_club_challenge_progress_impl_full_access"
ON public.running_club_challenge_progress
AS PERMISSIVE
FOR ALL
TO public
USING (auth.uid() = '1faca6f4-86d9-47f6-a345-24853e7ffea8')
WITH CHECK (auth.uid() = '1faca6f4-86d9-47f6-a345-24853e7ffea8');
