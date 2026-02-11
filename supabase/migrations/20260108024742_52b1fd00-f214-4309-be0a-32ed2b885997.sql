-- Bucket público para imagens de atividades de corrida
insert into storage.buckets (id, name, public)
values ('running_activities', 'running_activities', true)
on conflict (id) do nothing;

-- Policies para o bucket running_activities
create policy "Imagens de atividades públicas"
  on storage.objects
  for select
  using (bucket_id = 'running_activities');

create policy "Usuário pode fazer upload de suas imagens de atividade"
  on storage.objects
  for insert
  with check (
    bucket_id = 'running_activities'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Usuário pode atualizar suas imagens de atividade"
  on storage.objects
  for update
  using (
    bucket_id = 'running_activities'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Usuário pode remover suas imagens de atividade"
  on storage.objects
  for delete
  using (
    bucket_id = 'running_activities'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Coluna para armazenar URL da imagem gerada no feed do clube de corrida
alter table public.running_club_activities
  add column if not exists activity_image_url text;