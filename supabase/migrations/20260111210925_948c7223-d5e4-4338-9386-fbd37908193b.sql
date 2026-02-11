-- Add profile fields and user preference settings to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS language_pref text NOT NULL DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS measurement_system text NOT NULL DEFAULT 'metric',
  ADD COLUMN IF NOT EXISTS gps_auto_pause boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS activity_privacy_default text NOT NULL DEFAULT 'public';
