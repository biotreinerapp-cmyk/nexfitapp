-- Remove permissive policies flagged by linter and replace with least-privilege

-- 1) club_posts: remove "permissao_total_membros_posts" (ALL true)
drop policy if exists "permissao_total_membros_posts" on public.club_posts;

-- 2) biblioteca_exercicios: make read public, write admin-only
alter table public.biblioteca_exercicios enable row level security;

drop policy if exists "Admin gerencia tudo" on public.biblioteca_exercicios;
drop policy if exists "Permitir tudo para autenticados" on public.biblioteca_exercicios;

-- Keep existing SELECT policies (they are fine). Add admin-only manage policy.
create policy "biblioteca_exercicios_admin_manage"
on public.biblioteca_exercicios
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
