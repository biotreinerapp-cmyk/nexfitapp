-- Unificação da Criação e Tipos de Lojistas

-- 1. Redefinir constraints de store_type permitindo apenas 4 tipos oficiais.
-- (Verificando antes e atualizando possíveis tipos errados soltos no banco)

UPDATE public.marketplace_stores 
SET store_type = 'artigos' 
WHERE store_type NOT IN ('suplementos', 'roupas', 'artigos', 'nutricao');

UPDATE public.stores 
SET store_type = 'artigos' 
WHERE store_type NOT IN ('suplementos', 'roupas', 'artigos', 'nutricao');

-- Remove as constraints antigas se existirem
ALTER TABLE public.marketplace_stores DROP CONSTRAINT IF EXISTS marketplace_stores_store_type_check;
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_store_type_check;

-- Adiciona as novas constraints limitando aos 4 tipos
ALTER TABLE public.marketplace_stores 
ADD CONSTRAINT marketplace_stores_store_type_check 
CHECK (store_type IN ('suplementos', 'roupas', 'artigos', 'nutricao'));

ALTER TABLE public.stores 
ADD CONSTRAINT stores_store_type_check 
CHECK (store_type IN ('suplementos', 'roupas', 'artigos', 'nutricao'));


-- 2. Adicionar novas colunas na tabela marketplace_stores para suportar informações do Onboarding do Lojista
ALTER TABLE public.marketplace_stores
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS rua TEXT,
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS complemento TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT;
-- (A coluna 'city' já existe conforme migrações passadas)
