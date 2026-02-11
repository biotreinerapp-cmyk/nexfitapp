-- Add training_level to profiles for onboarding consistency
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS training_level text;

-- Optional index for filtering/analytics
CREATE INDEX IF NOT EXISTS idx_profiles_training_level ON public.profiles (training_level);