-- Migration para adicionar campos do Nexfit ADS

-- Alterando a tabela `highlight_offers`
ALTER TABLE public.highlight_offers
ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- Alterando a tabela `marketplace_stores` para controle de destaque/ADS
ALTER TABLE public.marketplace_stores
ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS highlight_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS highlight_clicks INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS highlight_sales INTEGER NOT NULL DEFAULT 0;
