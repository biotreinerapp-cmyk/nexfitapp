-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table to store roles separately from profiles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Function to safely check roles inside RLS without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- RLS policies for user_roles: users can read their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow service owner / admins to manage roles via SQL console or service role
-- (No broad INSERT/UPDATE policy for regular authenticated users)

-- Allow admins to fully manage marketplace_stores
ALTER TABLE public.marketplace_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketplace - admins manage stores"
ON public.marketplace_stores
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Keep existing select policy for approved stores as-is

-- Allow admins to fully manage marketplace_products
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketplace - admins manage products"
ON public.marketplace_products
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Existing select policy for approved products remains

-- Enable RLS and restrict telemed tables to admins only for now
ALTER TABLE public.telemedicina_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemedicina_profissionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Telemed - admins manage services"
ON public.telemedicina_servicos
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Telemed - admins manage professionals"
ON public.telemedicina_profissionais
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
