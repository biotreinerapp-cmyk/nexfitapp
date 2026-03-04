-- ============================================================
-- Fix: Educador Físico duplicado em telemedicina_servicos
-- ============================================================

-- 1. Ver o que existe no banco (diagnóstico)
SELECT id, nome, slug, ativo FROM public.telemedicina_servicos ORDER BY nome;

-- 2. Manter apenas UM registro por nome (o mais antigo, com slug canônico)
--    Deleta todos os "Educador Físico" exceto o com slug = 'educador-fisico'
DELETE FROM public.telemedicina_servicos
WHERE nome ILIKE '%educador%'
  AND slug <> 'educador-fisico';

-- Se por acaso não existir 'educador-fisico', mantém o mais antigo e padroniza
-- (corre apenas se o DELETE acima não resolver — seguro rodar mesmo assim)
UPDATE public.telemedicina_servicos
SET slug = 'educador-fisico',
    nome = 'Educador Físico'
WHERE nome ILIKE '%educador%';

-- 3. Garantir que não aconteça mais: adicionar unique constraint no nome
ALTER TABLE public.telemedicina_servicos
    DROP CONSTRAINT IF EXISTS telemedicina_servicos_nome_unique;

ALTER TABLE public.telemedicina_servicos
    ADD CONSTRAINT telemedicina_servicos_nome_unique UNIQUE (nome);

-- 4. Verificação final
SELECT id, nome, slug, ativo FROM public.telemedicina_servicos ORDER BY nome;
