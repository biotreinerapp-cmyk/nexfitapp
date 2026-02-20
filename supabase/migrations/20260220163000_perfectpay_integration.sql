-- Add external checkout link support
ALTER TABLE public.app_access_plans 
ADD COLUMN IF NOT EXISTS checkout_link TEXT;

ALTER TABLE public.plan_configs 
ADD COLUMN IF NOT EXISTS checkout_link TEXT;

-- Update existing plans with placeholder or null links
UPDATE public.app_access_plans SET checkout_link = NULL;
UPDATE public.plan_configs SET checkout_link = NULL;

-- Create placeholder for Perfect Pay integration configs if not exists
INSERT INTO public.integration_configs (key, value, is_secret, description)
VALUES 
  ('perfectpay_webhook_token', '', true, 'Token de segurança para postbacks da Perfect Pay')
ON CONFLICT (key) DO NOTHING;

-- Comment for documentation
COMMENT ON COLUMN public.app_access_plans.checkout_link IS 'URL externa para checkout na Perfect Pay ou similar';
COMMENT ON COLUMN public.plan_configs.checkout_link IS 'URL externa para checkout na Perfect Pay ou similar';
