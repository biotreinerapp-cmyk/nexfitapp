-- ============================================================
-- Fix RLS: professional_chat_messages + professional side
-- Data: 2026-03-05
-- ============================================================

-- 1. Garante que RLS está ativo na tabela de mensagens
ALTER TABLE public.professional_chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas conflitantes se existirem, para recriar corretamente
DROP POLICY IF EXISTS "Chat participants can view messages" ON public.professional_chat_messages;
DROP POLICY IF EXISTS "Chat participants can send messages" ON public.professional_chat_messages;

-- 3. SELECT: qualquer participante da sala pode ler mensagens
CREATE POLICY "Chat participants can view messages"
ON public.professional_chat_messages
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.professional_chat_rooms r
        WHERE r.id = room_id
          AND (
              r.student_id = auth.uid()
              OR auth.uid() IN (
                  SELECT user_id FROM public.professionals WHERE id = r.professional_id
              )
          )
    )
);

-- 4. INSERT: qualquer participante da sala pode enviar mensagem
CREATE POLICY "Chat participants can send messages"
ON public.professional_chat_messages
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM public.professional_chat_rooms r
        WHERE r.id = room_id
          AND (
              r.student_id = auth.uid()
              OR auth.uid() IN (
                  SELECT user_id FROM public.professionals WHERE id = r.professional_id
              )
          )
    )
);

-- 5. Garante que profissional pode VER sua sala no chat (recriar para evitar conflito)
DROP POLICY IF EXISTS "Professionals can view their chat rooms" ON public.professional_chat_rooms;
CREATE POLICY "Professionals can view their chat rooms"
ON public.professional_chat_rooms
FOR SELECT TO authenticated
USING (
    auth.uid() IN (
        SELECT user_id FROM public.professionals WHERE id = professional_id
    )
);

-- 6. Profissional pode atualizar last_message_at
DROP POLICY IF EXISTS "Professionals can update their chat rooms" ON public.professional_chat_rooms;
CREATE POLICY "Professionals can update their chat rooms"
ON public.professional_chat_rooms
FOR UPDATE TO authenticated
USING (
    auth.uid() IN (
        SELECT user_id FROM public.professionals WHERE id = professional_id
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM public.professionals WHERE id = professional_id
    )
);

-- Verificação: exibe todas as policies das tabelas de chat
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('professional_chat_messages', 'professional_chat_rooms')
ORDER BY tablename, cmd;
