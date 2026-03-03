-- Add PIX fields to professionals table
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS pix_key text,
ADD COLUMN IF NOT EXISTS pix_receiver_name text,
ADD COLUMN IF NOT EXISTS pix_bank_name text;
