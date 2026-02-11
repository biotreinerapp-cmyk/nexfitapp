-- Fix recursive / incorrect RLS policies for running clubs (simplified, non-recursive)

-- Drop existing policies on running_club_members and running_clubs
DROP POLICY IF EXISTS "RunningClubMembers - join or request" ON public.running_club_members;
DROP POLICY IF EXISTS "RunningClubMembers - remove self or admin" ON public.running_club_members;
DROP POLICY IF EXISTS "RunningClubMembers - update self or admin" ON public.running_club_members;
DROP POLICY IF EXISTS "RunningClubMembers - view club members" ON public.running_club_members;

DROP POLICY IF EXISTS "RunningClub - view accessible clubs" ON public.running_clubs;
DROP POLICY IF EXISTS "RunningClub - manage own club" ON public.running_clubs;
DROP POLICY IF EXISTS "RunningClub - delete own club" ON public.running_clubs;
DROP POLICY IF EXISTS "RunningClub - create club" ON public.running_clubs;

-- Recreate safe policies for running_club_members without referencing the same table

-- 1) Users can insert their own membership (join or request); admins can insert for others
CREATE POLICY "RunningClubMembers - join or request"
ON public.running_club_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2) Users can delete their own membership; admins can delete any
CREATE POLICY "RunningClubMembers - remove self or admin"
ON public.running_club_members
FOR DELETE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3) Users can update their own membership; admins can update any
CREATE POLICY "RunningClubMembers - update self or admin"
ON public.running_club_members
FOR UPDATE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4) Any authenticated user (or admin) can view club members (no recursion)
CREATE POLICY "RunningClubMembers - view club members"
ON public.running_club_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Recreate simplified policies for running_clubs without depending on running_club_members

-- Users can create clubs for themselves
CREATE POLICY "RunningClub - create club"
ON public.running_clubs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);

-- Users can manage (update) clubs they created; admins can manage any
CREATE POLICY "RunningClub - manage own club"
ON public.running_clubs
FOR UPDATE
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can delete clubs they created; admins can delete any
CREATE POLICY "RunningClub - delete own club"
ON public.running_clubs
FOR DELETE
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can view public clubs, clubs they created, or any if admin
CREATE POLICY "RunningClub - view accessible clubs"
ON public.running_clubs
FOR SELECT
USING (
  visibility = 'public'
  OR created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);