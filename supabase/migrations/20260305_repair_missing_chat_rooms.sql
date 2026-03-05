-- ============================================================
-- Reparo: Criar chat rooms para bindings existentes sem sala
-- Data: 2026-03-05
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Cria professional_chat_rooms para todo binding ativo
--    que ainda não tem uma sala de chat correspondente
INSERT INTO public.professional_chat_rooms (professional_id, student_id, last_message_at)
SELECT
    b.professional_id,
    b.student_id,
    NOW()
FROM public.professional_student_bindings b
WHERE b.status = 'active'
  AND NOT EXISTS (
      SELECT 1
      FROM public.professional_chat_rooms r
      WHERE r.professional_id = b.professional_id
        AND r.student_id = b.student_id
  );

-- 2. Garante o mesmo para hires aceitos sem sala nem binding
--    (caso o binding ainda não tenha sido criado)
INSERT INTO public.professional_student_bindings (professional_id, student_id, hire_id, status)
SELECT DISTINCT
    h.professional_id,
    h.student_id,
    h.id,
    'active'
FROM public.professional_hires h
WHERE h.status = 'accepted'
  AND NOT EXISTS (
      SELECT 1
      FROM public.professional_student_bindings b
      WHERE b.professional_id = h.professional_id
        AND b.student_id = h.student_id
  )
ON CONFLICT (professional_id, student_id) DO NOTHING;

-- 3. De novo, para qualquer hire aceito que ainda não tem sala
INSERT INTO public.professional_chat_rooms (professional_id, student_id, last_message_at)
SELECT DISTINCT
    h.professional_id,
    h.student_id,
    NOW()
FROM public.professional_hires h
WHERE h.status = 'accepted'
  AND NOT EXISTS (
      SELECT 1
      FROM public.professional_chat_rooms r
      WHERE r.professional_id = h.professional_id
        AND r.student_id = h.student_id
  )
ON CONFLICT DO NOTHING;

-- Verificação final: quantas salas foram criadas
SELECT 
    'professional_chat_rooms' AS tabela, 
    COUNT(*) AS total
FROM public.professional_chat_rooms
UNION ALL
SELECT 
    'professional_student_bindings', 
    COUNT(*)
FROM public.professional_student_bindings
WHERE status = 'active';
