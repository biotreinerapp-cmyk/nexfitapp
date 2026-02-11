-- Resolve linter warnings: add WITH CHECK to UPDATE policies in storage.objects

-- running_activities update policy
drop policy if exists "Usuário pode atualizar suas imagens de atividade" on storage.objects;
create policy "Usuário pode atualizar suas imagens de atividade"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'running_activities'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'running_activities'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- dashboard_outdoors update policy
drop policy if exists "dashboard_outdoors_admin_update" on storage.objects;
create policy "dashboard_outdoors_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'dashboard_outdoors'
  and public.has_role(auth.uid(), 'admin')
)
with check (
  bucket_id = 'dashboard_outdoors'
  and public.has_role(auth.uid(), 'admin')
);
