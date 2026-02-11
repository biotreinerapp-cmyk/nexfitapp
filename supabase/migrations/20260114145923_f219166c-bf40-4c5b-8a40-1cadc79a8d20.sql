-- Relax RLS for config_ai_agents to allow master admin e-mail while keeping admin role requirement
DROP POLICY IF EXISTS "Admins can manage AI agent config" ON public.config_ai_agents;

CREATE POLICY "Admins and master email manage AI agent config"
ON public.config_ai_agents
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR auth.jwt() ->> 'email' = 'biotreinerapp@gmail.com'
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR auth.jwt() ->> 'email' = 'biotreinerapp@gmail.com'
);
