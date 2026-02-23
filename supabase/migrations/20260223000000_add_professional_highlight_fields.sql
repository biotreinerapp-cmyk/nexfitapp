-- Migration to add highligh fields to professionals table for Nexfit ADS
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS highlight_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS highlight_clicks INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS highlight_sales INTEGER NOT NULL DEFAULT 0;
