-- Fix security linter findings

-- 1) club_posts: policies exist but RLS disabled
alter table public.club_posts enable row level security;

-- Policies: membros ativos do clube (ou admin) podem ver; autor pode gerenciar
create policy "club_posts_select_members"
on public.club_posts
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or exists (
    select 1
    from public.running_club_members m
    where m.club_id = club_posts.club_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy "club_posts_insert_author"
on public.club_posts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1
      from public.running_club_members m
      where m.club_id = club_posts.club_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

create policy "club_posts_update_author"
on public.club_posts
for update
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or user_id = auth.uid()
)
with check (
  public.has_role(auth.uid(), 'admin')
  or user_id = auth.uid()
);

create policy "club_posts_delete_author"
on public.club_posts
for delete
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or user_id = auth.uid()
);

-- 2) blacklist_cnpj: RLS enabled but no policies
-- (admin-only access)
create policy "blacklist_cnpj_admin_select"
on public.blacklist_cnpj
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "blacklist_cnpj_admin_insert"
on public.blacklist_cnpj
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "blacklist_cnpj_admin_update"
on public.blacklist_cnpj
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "blacklist_cnpj_admin_delete"
on public.blacklist_cnpj
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));
