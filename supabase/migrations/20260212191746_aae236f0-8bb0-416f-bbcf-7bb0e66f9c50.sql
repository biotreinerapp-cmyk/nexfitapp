-- Drop old constraint and add updated one with all store types
ALTER TABLE marketplace_stores DROP CONSTRAINT marketplace_stores_store_type_check;
ALTER TABLE marketplace_stores ADD CONSTRAINT marketplace_stores_store_type_check 
  CHECK (store_type = ANY (ARRAY['suplementos','roupas_fitness','artigos_esportivos','comidas_fitness']));

-- Fix Nexfit Store type
UPDATE marketplace_stores SET store_type = 'artigos_esportivos' WHERE id = '0d38e3b5-9eb7-4cd5-bc6b-367ef8fde854';
