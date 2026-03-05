-- ============================================================
-- Migration: Fix professional_chat_rooms RLS policies
-- Date: 2026-03-05
-- Purpose: Ensure students can read/access their chat rooms
--          and professionals can read company rooms.
--          Also grant INSERT rights for the free-hire flow.
-- ============================================================

-- Enable RLS (in case it wasn't enabled)
ALTER TABLE public.professional_chat_rooms ENABLE ROW LEVEL SECURITY;

-- ── Students ── 
-- Allow students to SELECT their rooms
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_chat_rooms'
          AND policyname = 'Students can view their chat rooms'
    ) THEN
        CREATE POLICY "Students can view their chat rooms"
            ON public.professional_chat_rooms
            FOR SELECT
            TO authenticated
            USING (auth.uid() = student_id);
    END IF;
END $$;

-- Allow students to INSERT a chat room (required during free-hire flow)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_chat_rooms'
          AND policyname = 'Students can create chat rooms'
    ) THEN
        CREATE POLICY "Students can create chat rooms"
            ON public.professional_chat_rooms
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;

-- Allow students to UPDATE room (update last_message_at)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_chat_rooms'
          AND policyname = 'Students can update their chat rooms'
    ) THEN
        CREATE POLICY "Students can update their chat rooms"
            ON public.professional_chat_rooms
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = student_id)
            WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;

-- ── Professionals ──
-- Allow professionals to SELECT rooms linked to them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_chat_rooms'
          AND policyname = 'Professionals can view their chat rooms'
    ) THEN
        CREATE POLICY "Professionals can view their chat rooms"
            ON public.professional_chat_rooms
            FOR SELECT
            TO authenticated
            USING (
                auth.uid() IN (
                    SELECT user_id FROM public.professionals WHERE id = professional_id
                )
            );
    END IF;
END $$;

-- Allow professionals to UPDATE rooms (update last_message_at)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_chat_rooms'
          AND policyname = 'Professionals can update their chat rooms'
    ) THEN
        CREATE POLICY "Professionals can update their chat rooms"
            ON public.professional_chat_rooms
            FOR UPDATE
            TO authenticated
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
    END IF;
END $$;

-- ── Chat Messages ──
-- Ensure RLS allows both parties in a room to read/write messages
ALTER TABLE public.professional_chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_chat_messages'
          AND policyname = 'Chat participants can view messages'
    ) THEN
        CREATE POLICY "Chat participants can view messages"
            ON public.professional_chat_messages
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.professional_chat_rooms r
                    WHERE r.id = room_id
                      AND (r.student_id = auth.uid()
                           OR auth.uid() IN (
                               SELECT user_id FROM public.professionals WHERE id = r.professional_id
                           ))
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_chat_messages'
          AND policyname = 'Chat participants can send messages'
    ) THEN
        CREATE POLICY "Chat participants can send messages"
            ON public.professional_chat_messages
            FOR INSERT
            TO authenticated
            WITH CHECK (
                auth.uid() = sender_id
                AND EXISTS (
                    SELECT 1 FROM public.professional_chat_rooms r
                    WHERE r.id = room_id
                      AND (r.student_id = auth.uid()
                           OR auth.uid() IN (
                               SELECT user_id FROM public.professionals WHERE id = r.professional_id
                           ))
                )
            );
    END IF;
END $$;

-- ── professional_student_bindings ──
-- Allow students to INSERT their own binding (required during free-hire flow)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'professional_student_bindings'
          AND policyname = 'Students can create their bindings'
    ) THEN
        CREATE POLICY "Students can create their bindings"
            ON public.professional_student_bindings
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;
