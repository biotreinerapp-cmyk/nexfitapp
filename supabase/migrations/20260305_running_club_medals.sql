-- Sistema de Medalhas Virtuais para Running Club
-- 2026-03-05

CREATE TABLE IF NOT EXISTS public.club_member_medals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.running_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  awarded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  medal_type text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_medal_type CHECK (medal_type IN ('first_run', 'top_runner', 'challenge_complete', 'consistency', 'custom'))
);

CREATE INDEX IF NOT EXISTS club_member_medals_club_id_idx ON public.club_member_medals(club_id);
CREATE INDEX IF NOT EXISTS club_member_medals_user_id_idx ON public.club_member_medals(user_id);

ALTER TABLE public.club_member_medals ENABLE ROW LEVEL SECURITY;

-- Membros do clube podem ver as medalhas do clube
CREATE POLICY "Club members can view medals"
ON public.club_member_medals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.running_club_members
    WHERE club_id = club_member_medals.club_id
    AND user_id = auth.uid()
    AND status = 'active'
  )
);

-- Apenas admins podem conceder medalhas
CREATE POLICY "Club admins can award medals"
ON public.club_member_medals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.running_club_members
    WHERE club_id = club_member_medals.club_id
    AND user_id = auth.uid()
    AND role = 'admin'
    AND status = 'active'
  )
);

-- Admins podem remover medalhas
CREATE POLICY "Club admins can delete medals"
ON public.club_member_medals FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.running_club_members
    WHERE club_id = club_member_medals.club_id
    AND user_id = auth.uid()
    AND role = 'admin'
    AND status = 'active'
  )
);
