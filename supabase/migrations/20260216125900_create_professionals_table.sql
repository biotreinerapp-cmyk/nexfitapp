-- Create professionals table to store professional profile data
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crm_crp TEXT,
  specialty TEXT NOT NULL,
  base_price NUMERIC,
  bio TEXT,
  phone TEXT,
  email TEXT NOT NULL,
  instagram TEXT,
  profile_image_url TEXT,
  cover_image_url TEXT,
  lp_unlocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON public.professionals(user_id);

-- Enable RLS
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- Professionals can view and update their own profile
CREATE POLICY "Professionals can view own profile"
  ON public.professionals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Professionals can update own profile"
  ON public.professionals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Professionals can insert own profile"
  ON public.professionals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all professionals
CREATE POLICY "Admins can manage professionals"
  ON public.professionals FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
  );

-- Public can view professionals (for marketplace)
CREATE POLICY "Public can view professionals"
  ON public.professionals FOR SELECT
  USING (true);

-- Create storage bucket for professional images
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-images', 'professional-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for professional-images
CREATE POLICY "Public can view professional images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'professional-images');

CREATE POLICY "Authenticated users can upload professional images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'professional-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own professional images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'professional-images'
    AND auth.uid() IS NOT NULL
  );

-- Trigger for updated_at
CREATE TRIGGER update_professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
