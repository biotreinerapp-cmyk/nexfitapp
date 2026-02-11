-- Add extra Pix config fields
ALTER TABLE public.pix_configs
ADD COLUMN IF NOT EXISTS receiver_name text,
ADD COLUMN IF NOT EXISTS bank_name text;

-- Ensure updated_at exists and defaults
ALTER TABLE public.pix_configs
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- If updated_at existed but nullable, keep as-is (no-op in most cases)

-- Enable RLS if not already enabled
ALTER TABLE public.pix_configs ENABLE ROW LEVEL SECURITY;