-- Add ativo column to profiles to control active/inactive status
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- Optional: index for queries filtering by ativo
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles (ativo);