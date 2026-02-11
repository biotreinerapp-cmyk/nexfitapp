-- Add author fields to running_club_activities for social feed display
ALTER TABLE public.running_club_activities
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS author_initials text;

-- No RLS changes needed: existing policies already control who can insert/select activities.
