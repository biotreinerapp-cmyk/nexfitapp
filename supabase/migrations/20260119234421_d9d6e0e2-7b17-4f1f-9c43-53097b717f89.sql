-- Outdoor (banner) 360x120 no Dashboard do Aluno
-- 1) Bucket público para armazenar as artes
insert into storage.buckets (id, name, public)
values ('dashboard_outdoors', 'dashboard_outdoors', true)
on conflict (id) do nothing;

-- 2) Tabela de outdoors (histórico + agenda)
create table if not exists public.dashboard_outdoors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  starts_at timestamptz not null,
  ends_at timestamptz null,
  is_active boolean not null default true,
  image_url text not null,
  image_path text not null,
  link_url text null
);

create index if not exists idx_dashboard_outdoors_active_window
  on public.dashboard_outdoors (is_active, starts_at desc, ends_at);

-- Trigger updated_at
create trigger set_dashboard_outdoors_updated_at
before update on public.dashboard_outdoors
for each row execute function public.update_updated_at_column();

-- 3) RLS
alter table public.dashboard_outdoors enable row level security;

-- Leitura: qualquer usuário logado
create policy "dashboard_outdoors_select_authenticated"
on public.dashboard_outdoors
for select
to authenticated
using (true);

-- Escrita: apenas admins
create policy "dashboard_outdoors_insert_admin"
on public.dashboard_outdoors
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "dashboard_outdoors_update_admin"
on public.dashboard_outdoors
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "dashboard_outdoors_delete_admin"
on public.dashboard_outdoors
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- 4) Storage policies (bucket dashboard_outdoors)
-- Observação: mesmo bucket público precisa de políticas em storage.objects.
create policy "dashboard_outdoors_public_read"
on storage.objects
for select
to public
using (bucket_id = 'dashboard_outdoors');

create policy "dashboard_outdoors_admin_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dashboard_outdoors'
  and public.has_role(auth.uid(), 'admin')
);

create policy "dashboard_outdoors_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'dashboard_outdoors'
  and public.has_role(auth.uid(), 'admin')
);

create policy "dashboard_outdoors_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'dashboard_outdoors'
  and public.has_role(auth.uid(), 'admin')
);
