-- Seed default telemedicine services
INSERT INTO public.telemedicina_servicos (nome, slug, ativo)
VALUES 
    ('Cardiologia', 'cardiologia', true),
    ('Educador Físico', 'educador-fisico', true),
    ('Endocrinologia', 'endocrinologia', true),
    ('Fisioterapia', 'fisioterapia', true),
    ('Nutrição', 'nutricao', true),
    ('Ortopedia', 'ortopedia', true),
    ('Psicologia', 'psicologia', true)
ON CONFLICT (slug) DO UPDATE SET 
    nome = EXCLUDED.nome,
    ativo = EXCLUDED.ativo;
