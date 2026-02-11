-- Fix: explicit cast for enum column to avoid return-type mismatch in some Postgres contexts
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
    p.id::uuid,
    p.display_name::text,
    u.email::text,
    NULL::text AS phone,
    p.subscription_plan::public.subscription_plan,
    p.plan_expires_at::timestamptz,
    u.created_at::timestamptz,
    p.ativo::boolean
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.id
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;