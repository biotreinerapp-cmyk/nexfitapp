-- Fix admin_list_users: profiles.phone column doesn't exist in this DB, so return NULL for phone.
-- Keep signature stable.

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  display_name text,
  email text,
  phone text,
  subscription_plan public.subscription_plan,
  plan_expires_at timestamptz,
  created_at timestamptz,
  ativo boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  master_email text := 'biotreinerapp@gmail.com';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR (auth.jwt() ->> 'email') = master_email) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    u.email,
    NULL::text AS phone,
    p.subscription_plan,
    p.plan_expires_at,
    u.created_at,
    p.ativo
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.id
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;