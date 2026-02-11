-- Add city and state fields to running_clubs
ALTER TABLE public.running_clubs
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

-- No changes to RLS policies needed because they already reference created_by/visibility only.