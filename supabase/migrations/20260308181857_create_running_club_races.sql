create table public.running_club_races (
  id uuid not null default gen_random_uuid(),
  club_id uuid not null references public.running_clubs (id) on delete cascade,
  title text not null,
  description text null,
  event_date timestamp with time zone not null,
  location text null,
  registration_link text null,
  price numeric null,
  active boolean not null default true,
  created_by uuid not null references auth.users (id),
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint running_club_races_pkey primary key (id)
);

alter table public.running_club_races enable row level security;

create policy "Membros podem ver corridas do seu clube" on public.running_club_races
  for select
  using (
    exists (
      select 1 from public.running_club_members
      where running_club_members.club_id = running_club_races.club_id
      and running_club_members.user_id = auth.uid()
      and running_club_members.status = 'active'
    )
  );

create policy "Admins podem criar corridas" on public.running_club_races
  for insert
  with check (
    exists (
      select 1 from public.running_club_members
      where running_club_members.club_id = running_club_races.club_id
      and running_club_members.user_id = auth.uid()
      and running_club_members.role = 'admin'
    )
  );

create policy "Admins podem atualizar corridas" on public.running_club_races
  for update
  using (
    exists (
      select 1 from public.running_club_members
      where running_club_members.club_id = running_club_races.club_id
      and running_club_members.user_id = auth.uid()
      and running_club_members.role = 'admin'
    )
  );

create policy "Admins podem deletar corridas" on public.running_club_races
  for delete
  using (
    exists (
      select 1 from public.running_club_members
      where running_club_members.club_id = running_club_races.club_id
      and running_club_members.user_id = auth.uid()
      and running_club_members.role = 'admin'
    )
  );
