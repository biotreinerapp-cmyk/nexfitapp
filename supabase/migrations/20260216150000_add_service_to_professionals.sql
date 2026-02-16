-- Add telemedicina_servico_id to professionals
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS telemedicina_servico_id UUID REFERENCES public.telemedicina_servicos(id) ON DELETE SET NULL;

-- Add is_available to professionals
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;

-- Function to sync professionals to telemedicina_profissionais
CREATE OR REPLACE FUNCTION public.sync_to_telemedicina_profissionais()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or Update telemedicina_profissionais
  INSERT INTO public.telemedicina_profissionais (
    id, -- Using the professional.id as telemedicina_profissionais.id if possible, or keeping it linked
    nome,
    crm_crp,
    preco_base,
    bio,
    foto_url,
    servico_id,
    disponivel
  )
  SELECT 
    NEW.id,
    NEW.name,
    NEW.crm_crp,
    NEW.base_price,
    NEW.bio,
    NEW.profile_image_url,
    NEW.telemedicina_servico_id,
    NEW.is_available
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

-- Trigger to call sync function
DROP TRIGGER IF EXISTS trigger_sync_to_telemedicina_profissionais ON public.professionals;
CREATE TRIGGER trigger_sync_to_telemedicina_profissionais
AFTER INSERT OR UPDATE ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.sync_to_telemedicina_profissionais();

-- Backfill existing professionals if any
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
SELECT 
    id,
    name,
    crm_crp,
    base_price,
    bio,
    profile_image_url,
    telemedicina_servico_id,
    is_available
FROM public.professionals
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    crm_crp = EXCLUDED.crm_crp,
    preco_base = EXCLUDED.preco_base,
    bio = EXCLUDED.bio,
    foto_url = EXCLUDED.foto_url,
    servico_id = EXCLUDED.servico_id,
    disponivel = EXCLUDED.disponivel;
