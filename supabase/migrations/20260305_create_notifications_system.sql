-- Criação do Sistema Centralizado de Notificações
-- 2026-03-05

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL se for broadcast
  segment text, -- Ex: 'ALL' para enviar para todos
  title text NOT NULL,
  body text NOT NULL,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id OR segment = 'ALL');

CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- TRIGGER 1: professional_hires (Nova solicitação de contratação)
CREATE OR REPLACE FUNCTION public.handle_new_hire_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_prof_user_id uuid;
  v_student_name text;
BEGIN
  SELECT user_id INTO v_prof_user_id FROM public.professionals WHERE id = NEW.professional_id;
  SELECT COALESCE(display_name, nome, 'Um aluno') INTO v_student_name FROM public.profiles WHERE id = NEW.student_id;

  IF v_prof_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      v_prof_user_id,
      'Nova solicitação de contratação! 🎉',
      v_student_name || ' acabou de solicitar seus serviços. Vá até o painel para aceitar.',
      '/professional/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_professional_hire ON public.professional_hires;
CREATE TRIGGER on_new_professional_hire
AFTER INSERT ON public.professional_hires
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_hire_notification();

-- TRIGGER 2: professional_chat_messages (Mensagens do chat)
CREATE OR REPLACE FUNCTION public.handle_new_chat_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id uuid;
  v_prof_id uuid;
  v_prof_user_id uuid;
  v_sender_name text;
  v_receiver_id uuid;
  v_link text;
BEGIN
  SELECT student_id, professional_id INTO v_student_id, v_prof_id 
  FROM public.professional_chat_rooms WHERE id = NEW.room_id;

  SELECT user_id INTO v_prof_user_id FROM public.professionals WHERE id = v_prof_id;

  IF NEW.sender_id = v_student_id THEN
    -- Aluno enviou
    v_receiver_id := v_prof_user_id;
    v_link := '/professional/chat';
    SELECT COALESCE(display_name, nome, 'Aluno') INTO v_sender_name FROM public.profiles WHERE id = v_student_id;
  ELSE
    -- Profissional enviou
    v_receiver_id := v_student_id;
    v_link := '/aluno/profissionais';
    SELECT COALESCE(nome, 'Profissional') INTO v_sender_name FROM public.profiles WHERE id = v_prof_user_id;
  END IF;

  IF v_receiver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      v_receiver_id,
      'Nova mensagem de ' || COALESCE(v_sender_name, 'Alguém'),
      NEW.content,
      v_link
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_chat_message ON public.professional_chat_messages;
CREATE TRIGGER on_new_chat_message
AFTER INSERT ON public.professional_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_chat_message_notification();

-- TRIGGER 3: telemedicina_agendamentos (Consultas)
CREATE OR REPLACE FUNCTION public.handle_new_agendamento_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_prof_user_id uuid;
  v_student_name text;
BEGIN
  SELECT COALESCE(display_name, nome, 'Aluno') INTO v_student_name FROM public.profiles WHERE id = NEW.aluno_id;
  
  -- Profissionais ids match between 'professionals' and 'telemedicina_profissionais' in this schema
  SELECT p.user_id INTO v_prof_user_id 
  FROM public.professionals p 
  WHERE p.id = NEW.profissional_id;

  IF v_prof_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      v_prof_user_id,
      'Novo agendamento! 🗓️',
      'Você tem uma nova consulta agendada com ' || v_student_name || '.',
      '/professional/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_agendamento ON public.telemedicina_agendamentos;
CREATE TRIGGER on_new_agendamento
AFTER INSERT ON public.telemedicina_agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_agendamento_notification();

-- TRIGGER 4: stores (Nova Loja no App) - Broadcast
CREATE OR REPLACE FUNCTION public.handle_new_store_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, segment, title, body, link)
  VALUES (
    NULL,
    'ALL',
    'Nova Loja no Marketplace! 🛍️',
    NEW.name || ' acabou de chegar ao parceiros Nexfit!',
    '/aluno/marketplace'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tratamento se a tabela stores existir
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stores') THEN
    DROP TRIGGER IF EXISTS on_new_store ON public.stores;
    CREATE TRIGGER on_new_store
    AFTER INSERT ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_store_notification();
  END IF;
END $$;

-- TRIGGER 5: professionals (Novo Profissional na Telemedicina) - Broadcast
CREATE OR REPLACE FUNCTION public.handle_new_professional_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, segment, title, body, link)
  VALUES (
    NULL,
    'ALL',
    'Novo Profissional na Área! 👨‍⚕️',
    'Confira os novos profissionais disponíveis para te ajudar na sua jornada.',
    '/aluno/profissionais/descobrir'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_professional ON public.professionals;
CREATE TRIGGER on_new_professional
AFTER INSERT ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_professional_notification();

-- TRIGGER 6: manual_routines (Novo treino raiz)
CREATE OR REPLACE FUNCTION public.handle_new_manual_routine_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Identifica o estudante do manual_routines (user_id column is used)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      NEW.user_id,
      'Novo Treino Disponível! 🏋️',
      'Seu treinador enviou uma nova rotina para você destruir no modo raiz.',
      '/aluno/treino/modo-raiz'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tratamento se a tabela manual_routines existir
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'manual_routines') THEN
    DROP TRIGGER IF EXISTS on_new_manual_routine ON public.manual_routines;
    CREATE TRIGGER on_new_manual_routine
    AFTER INSERT ON public.manual_routines
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_manual_routine_notification();
  END IF;
END $$;

-- TRIGGER 7: running_club_posts (Notify only members)
CREATE OR REPLACE FUNCTION public.handle_new_club_post_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert one notification per club member
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT user_id, 'Nova Atividade no Club 🏃', 'Tem publicação nova no seu Running Club!', '/aluno/running-club'
  FROM public.running_club_members
  WHERE club_id = NEW.club_id AND user_id != NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tratamento se as tabelas de running_club existirem
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'running_club_posts') AND
     EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'running_club_members') THEN
    DROP TRIGGER IF EXISTS on_new_club_post ON public.running_club_posts;
    CREATE TRIGGER on_new_club_post
    AFTER INSERT ON public.running_club_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_club_post_notification();
  END IF;
END $$;
