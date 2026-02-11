-- Create table for AI agent configuration
CREATE TABLE IF NOT EXISTS public.config_ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL UNIQUE,
  provider text NOT NULL CHECK (provider IN ('api_ninjas_nutrition', 'openai_vision', 'custom_endpoint')),
  api_key text,
  base_url text NOT NULL DEFAULT 'https://api.api-ninjas.com/v1/nutrition?query=',
  system_context text,
  instructions_layer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one row for Dr. Bio agent by convention
INSERT INTO public.config_ai_agents (agent_key, provider)
VALUES ('dr_bio', 'api_ninjas_nutrition')
ON CONFLICT (agent_key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.config_ai_agents ENABLE ROW LEVEL SECURITY;

-- RLS: only admins can manage this table
CREATE POLICY "Admins can manage AI agent config"
ON public.config_ai_agents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger function already exists as set_current_timestamp_updated_at; attach it
DROP TRIGGER IF EXISTS set_timestamp_on_config_ai_agents ON public.config_ai_agents;
CREATE TRIGGER set_timestamp_on_config_ai_agents
BEFORE UPDATE ON public.config_ai_agents
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();