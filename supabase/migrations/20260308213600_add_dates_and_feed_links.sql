-- Adicionando link_url aos posts do feed para suportar cliques
ALTER TABLE public.club_posts ADD COLUMN IF NOT EXISTS link_url text null;

-- Adicionando start_date e renomeando/reconfigurando event_date para end_date nas corridas
ALTER TABLE public.running_club_races ADD COLUMN IF NOT EXISTS start_date timestamp with time zone not null default timezone('utc'::text, now());
ALTER TABLE public.running_club_races RENAME COLUMN event_date TO end_date;
