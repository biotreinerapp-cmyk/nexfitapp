-- Enable RLS and restrict access on lojas table to admins via has_role

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy for all operations on lojas
CREATE POLICY "Admin manages lojas"
ON public.lojas
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
