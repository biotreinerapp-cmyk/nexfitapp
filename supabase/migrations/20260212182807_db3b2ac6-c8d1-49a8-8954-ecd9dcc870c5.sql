-- Create marketplace_stores entry for NEXFIT STORE user
INSERT INTO marketplace_stores (id, nome, owner_user_id, store_type, status, descricao)
VALUES (
  '0d38e3b5-9eb7-4cd5-bc6b-367ef8fde854',
  'NEXFIT STORE',
  '2da46694-8e6e-41df-875c-57d8aa3ac97f',
  'artigos',
  'aprovado',
  'VOCÊ NO TOPO!'
);

-- Fix the profile role to store_owner
UPDATE profiles SET role = 'store_owner' WHERE id = '2da46694-8e6e-41df-875c-57d8aa3ac97f';
