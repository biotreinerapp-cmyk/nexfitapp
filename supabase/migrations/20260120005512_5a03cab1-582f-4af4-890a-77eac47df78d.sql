-- Fix: public.has_role signature is (user_id uuid, role app_role)

-- Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('dashboard_outdoors', 'dashboard_outdoors', true)
on conflict (id) do update set public = excluded.public;

-- Ensure RLS on dashboard_outdoors table
alter table public.dashboard_outdoors enable row level security;

-- Recreate policies for dashboard_outdoors
DROP POLICY IF EXISTS dashboard_outdoors_select_authenticated ON public.dashboard_outdoors;
DROP POLICY IF EXISTS dashboard_outdoors_insert_admin ON public.dashboard_outdoors;
DROP POLICY IF EXISTS dashboard_outdoors_update_admin ON public.dashboard_outdoors;
DROP POLICY IF EXISTS dashboard_outdoors_delete_admin ON public.dashboard_outdoors;

CREATE POLICY dashboard_outdoors_select_authenticated
ON public.dashboard_outdoors
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY dashboard_outdoors_insert_admin
ON public.dashboard_outdoors
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY dashboard_outdoors_update_admin
ON public.dashboard_outdoors
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY dashboard_outdoors_delete_admin
ON public.dashboard_outdoors
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::public.app_role));

-- Storage policies for public read + admin write
DROP POLICY IF EXISTS dashboard_outdoors_public_read ON storage.objects;
DROP POLICY IF EXISTS dashboard_outdoors_admin_insert ON storage.objects;
DROP POLICY IF EXISTS dashboard_outdoors_admin_update ON storage.objects;
DROP POLICY IF EXISTS dashboard_outdoors_admin_delete ON storage.objects;

CREATE POLICY dashboard_outdoors_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'dashboard_outdoors');

CREATE POLICY dashboard_outdoors_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dashboard_outdoors' AND has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY dashboard_outdoors_admin_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'dashboard_outdoors' AND has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'dashboard_outdoors' AND has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY dashboard_outdoors_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'dashboard_outdoors' AND has_role(auth.uid(), 'admin'::public.app_role));
