-- Unify store type keys to canonical values
-- Valid values: 'suplementos', 'roupas', 'artigos', 'nutricao'

-- 1. Update 'stores' table
UPDATE public.stores 
SET store_type = 'artigos' 
WHERE store_type = 'artigos_esportivos';

UPDATE public.stores 
SET store_type = 'roupas' 
WHERE store_type = 'roupas_fitness';

UPDATE public.stores 
SET store_type = 'nutricao' 
WHERE store_type = 'comidas_fitness';

-- 2. Update 'marketplace_stores' table
UPDATE public.marketplace_stores 
SET store_type = 'artigos' 
WHERE store_type = 'artigos_esportivos';

UPDATE public.marketplace_stores 
SET store_type = 'roupas' 
WHERE store_type = 'roupas_fitness';

UPDATE public.marketplace_stores 
SET store_type = 'nutricao' 
WHERE store_type = 'comidas_fitness';
