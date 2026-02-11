-- Running Club core tables

create table if not exists public.running_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  visibility text not null default 'public', -- 'public' | 'private'
  invite_code text not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.running_club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.running_clubs(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member', -- 'admin' | 'member'
  status text not null default 'active', -- 'active' | 'pending'
  joined_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table if not exists public.running_club_activities (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.running_clubs(id) on delete cascade,
  user_id uuid not null,
  distance_km numeric(6,2) not null,
  duration_minutes integer not null,
  recorded_at timestamptz not null default now()
);

create table if not exists public.running_club_challenges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.running_clubs(id) on delete cascade,
  title text not null,
  description text,
  target_distance_km numeric(7,2) not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  created_by uuid not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.running_club_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.running_club_challenges(id) on delete cascade,
  user_id uuid not null,
  total_distance_km numeric(7,2) not null default 0,
  last_updated timestamptz not null default now(),
  unique (challenge_id, user_id)
);

-- Updated_at triggers
create trigger set_running_clubs_updated_at
before update on public.running_clubs
for each row execute function public.set_current_timestamp_updated_at();

create trigger set_running_club_challenges_updated_at
before update on public.running_club_challenges
for each row execute function public.set_current_timestamp_updated_at();

-- Enable RLS
alter table public.running_clubs enable row level security;
alter table public.running_club_members enable row level security;
alter table public.running_club_activities enable row level security;
alter table public.running_club_challenges enable row level security;
alter table public.running_club_challenge_progress enable row level security;

-- RLS policies

-- Running clubs
create policy "RunningClub - view accessible clubs" on public.running_clubs
for select
using (
  visibility = 'public'
  or exists (
    select 1 from public.running_club_members m
    where m.club_id = id and m.user_id = auth.uid() and m.status = 'active'
  )
  or created_by = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

create policy "RunningClub - create club" on public.running_clubs
for insert
with check (
  auth.uid() is not null and created_by = auth.uid()
);

create policy "RunningClub - manage own club" on public.running_clubs
for update using (
  created_by = auth.uid() or public.has_role(auth.uid(), 'admin')
) with check (
  created_by = auth.uid() or public.has_role(auth.uid(), 'admin')
);

create policy "RunningClub - delete own club" on public.running_clubs
for delete using (
  created_by = auth.uid() or public.has_role(auth.uid(), 'admin')
);

-- Members
create policy "RunningClubMembers - view club members" on public.running_club_members
for select
using (
  exists (
    select 1 from public.running_club_members m2
    where m2.club_id = club_id and m2.user_id = auth.uid() and m2.status = 'active'
  )
  or exists (
    select 1 from public.running_clubs c
    where c.id = club_id and c.created_by = auth.uid()
  )
  or public.has_role(auth.uid(), 'admin')
);

create policy "RunningClubMembers - join or request" on public.running_club_members
for insert
with check (
  auth.uid() = user_id
);

create policy "RunningClubMembers - update self or admin" on public.running_club_members
for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.running_club_members m2
    where m2.club_id = club_id and m2.user_id = auth.uid() and m2.role = 'admin'
  )
  or public.has_role(auth.uid(), 'admin')
) with check (
  auth.uid() = user_id
  or exists (
    select 1 from public.running_club_members m2
    where m2.club_id = club_id and m2.user_id = auth.uid() and m2.role = 'admin'
  )
  or public.has_role(auth.uid(), 'admin')
);

create policy "RunningClubMembers - remove self or admin" on public.running_club_members
for delete
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.running_club_members m2
    where m2.club_id = club_id and m2.user_id = auth.uid() and m2.role = 'admin'
  )
  or public.has_role(auth.uid(), 'admin')
);

-- Activities
create policy "RunningClubActivities - manage own" on public.running_club_activities
for all
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.running_club_members m
    where m.club_id = club_id and m.user_id = auth.uid() and m.status = 'active'
  )
  or public.has_role(auth.uid(), 'admin')
) with check (
  auth.uid() = user_id
  or exists (
    select 1 from public.running_club_members m
    where m.club_id = club_id and m.user_id = auth.uid() and m.status = 'active'
  )
  or public.has_role(auth.uid(), 'admin')
);

-- Challenges
create policy "RunningClubChallenges - view" on public.running_club_challenges
for select
using (
  exists (
    select 1 from public.running_club_members m
    where m.club_id = club_id and m.user_id = auth.uid() and m.status = 'active'
  )
  or exists (
    select 1 from public.running_clubs c
    where c.id = club_id and c.created_by = auth.uid()
  )
  or public.has_role(auth.uid(), 'admin')
);

create policy "RunningClubChallenges - manage by club admin" on public.running_club_challenges
for all
using (
  exists (
    select 1 from public.running_club_members m
    where m.club_id = club_id and m.user_id = auth.uid() and m.role = 'admin'
  )
  or exists (
    select 1 from public.running_clubs c
    where c.id = club_id and c.created_by = auth.uid()
  )
  or public.has_role(auth.uid(), 'admin')
) with check (
  exists (
    select 1 from public.running_club_members m
    where m.club_id = club_id and m.user_id = auth.uid() and m.role = 'admin'
  )
  or exists (
    select 1 from public.running_clubs c
    where c.id = club_id and c.created_by = auth.uid()
  )
  or public.has_role(auth.uid(), 'admin')
);

-- Challenge progress
create policy "RunningClubChallengeProgress - view" on public.running_club_challenge_progress
for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.running_club_challenges ch
    join public.running_clubs c on c.id = ch.club_id
    join public.running_club_members m on m.club_id = c.id
    where ch.id = challenge_id and m.user_id = auth.uid() and m.status = 'active'
  )
  or public.has_role(auth.uid(), 'admin')
);

create policy "RunningClubChallengeProgress - manage own" on public.running_club_challenge_progress
for all
using (
  auth.uid() = user_id or public.has_role(auth.uid(), 'admin')
) with check (
  auth.uid() = user_id or public.has_role(auth.uid(), 'admin')
);
