-- ============================================================
-- Fix: Educador Físico duplicado em telemedicina_servicos
-- Versão corrigida: migra referências FK antes de deletar
-- ============================================================

-- 1. Migrar referências de qualquer duplicata de 'educador'
--    para o registro canônico (slug = 'educador-fisico')

-- Na tabela telemedicina_profissionais
UPDATE public.telemedicina_profissionais
SET servico_id = (
    SELECT id FROM public.telemedicina_servicos
    WHERE slug = 'educador-fisico'
    LIMIT 1
)
WHERE servico_id IN (
    SELECT id FROM public.telemedicina_servicos
    WHERE nome ILIKE '%educador%'
      AND slug <> 'educador-fisico'
);

-- Na tabela professionals (coluna telemedicina_servico_id)
UPDATE public.professionals
SET telemedicina_servico_id = (
    SELECT id FROM public.telemedicina_servicos
    WHERE slug = 'educador-fisico'
    LIMIT 1
)
WHERE telemedicina_servico_id IN (
    SELECT id FROM public.telemedicina_servicos
    WHERE nome ILIKE '%educador%'
      AND slug <> 'educador-fisico'
);

-- 2. Agora é seguro deletar os duplicados
DELETE FROM public.telemedicina_servicos
WHERE nome ILIKE '%educador%'
  AND slug <> 'educador-fisico';

-- 3. Padroniza o registro canônico
UPDATE public.telemedicina_servicos
SET nome = 'Educador Físico',
    slug = 'educador-fisico'
WHERE nome ILIKE '%educador%';

-- 4. Adiciona UNIQUE constraint no nome (impede recorrência)
ALTER TABLE public.telemedicina_servicos
    DROP CONSTRAINT IF EXISTS telemedicina_servicos_nome_unique;
ALTER TABLE public.telemedicina_servicos
    ADD CONSTRAINT telemedicina_servicos_nome_unique UNIQUE (nome);

-- 5. Verificação final
SELECT nome, slug, ativo FROM public.telemedicina_servicos ORDER BY nome;
