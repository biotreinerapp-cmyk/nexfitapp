-- Create platform pricing configurations table
CREATE TABLE IF NOT EXISTS public.platform_pricing_configs (
  key text PRIMARY KEY,
  value_cents integer,
  value_percent numeric(5,2),
  config_type text NOT NULL CHECK (config_type IN ('fixed', 'percentage')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_pricing_configs ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Platform pricing - admins manage"
  ON public.platform_pricing_configs
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
  );

-- Authenticated users can read (for displaying prices)
CREATE POLICY "Platform pricing - authenticated read"
  ON public.platform_pricing_configs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_platform_pricing_configs_updated_at
  BEFORE UPDATE ON public.platform_pricing_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial values
INSERT INTO public.platform_pricing_configs (key, value_cents, value_percent, config_type, description) VALUES
  ('lp_activation_price', 0, NULL, 'fixed', 'Preço para ativar Landing Page profissional (em centavos)'),
  ('platform_fee_percent', NULL, 15.00, 'percentage', 'Taxa da plataforma sobre consultas profissionais'),
  ('withdrawal_15d_fee', NULL, 8.00, 'percentage', 'Taxa de saque com ciclo de 15 dias'),
  ('withdrawal_30d_fee', NULL, 5.00, 'percentage', 'Taxa de saque com ciclo de 30 dias')
ON CONFLICT (key) DO NOTHING;
