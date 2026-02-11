INSERT INTO public.stores (id, name, store_type, description, is_active)
VALUES 
  ('de3701b3-fe1b-4619-a45d-b14053c7a949', 'NEXFIT STORE', 'suplementos', 'vc no topo!', true),
  ('fc788328-29b3-4690-9e8c-f85a348c0616', 'Vita Forge SJP', 'suplementos', 'testando o som', true)
ON CONFLICT (id) DO NOTHING;