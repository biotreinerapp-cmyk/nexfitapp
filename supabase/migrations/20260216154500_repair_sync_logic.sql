-- Repair professionals table and sync logic
-- Add missing columns that might be causing RLS/select errors
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT;

-- Ensure telemedicina_profissionais has all necessary fields
ALTER TABLE public.telemedicina_profissionais
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS preco_base DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS crm_crp TEXT;

-- Robust Sync Function
CREATE OR REPLACE FUNCTION public.sync_to_telemedicina_profissionais()
RETURNS TRIGGER AS $$
BEGIN
  -- We use a single insert/update to keep the student view updated
  INSERT INTO public.telemedicina_profissionais (
    id,
    nome,
    crm_crp,
    preco_base,
    bio,
    foto_url,
    servico_id,
    disponivel
  )
  VALUES (
    NEW.id,
    NEW.name,
    NEW.crm_crp,
    NEW.base_price,
    NEW.bio,
    NEW.profile_image_url,
    COALESCE(NEW.telemedicina_servico_id, NEW.specialty),
    COALESCE(NEW.is_available, true)
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    crm_crp = EXCLUDED.crm_crp,
    preco_base = EXCLUDED.preco_base,
    bio = EXCLUDED.bio,
    foto_url = EXCLUDED.foto_url,
    servico_id = EXCLUDED.servico_id,
    disponivel = EXCLUDED.disponivel;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger
DROP TRIGGER IF EXISTS trigger_sync_to_telemedicina_profissionais ON public.professionals;
CREATE TRIGGER trigger_sync_to_telemedicina_profissionais
AFTER INSERT OR UPDATE ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.sync_to_telemedicina_profissionais();

-- Backfill/Repair existing data
INSERT INTO public.telemedicina_profissionais (
    id, nome, crm_crp, preco_base, bio, foto_url, servico_id, disponivel
)
SELECT 
    id, name, crm_crp, base_price, bio, profile_image_url, COALESCE(telemedicina_servico_id, specialty), COALESCE(is_available, true)
FROM public.professionals
WHERE (telemedicina_servico_id IS NOT NULL OR specialty IS NOT NULL)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    crm_crp = EXCLUDED.crm_crp,
    preco_base = EXCLUDED.preco_base,
    bio = EXCLUDED.bio,
    foto_url = EXCLUDED.foto_url,
    servico_id = EXCLUDED.servico_id,
    disponivel = EXCLUDED.disponivel;
