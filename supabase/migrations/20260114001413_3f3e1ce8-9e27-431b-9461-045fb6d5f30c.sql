-- Simplify and fix RLS on running_club_activities to allow authenticated members to insert/read while keeping per-user control

-- Drop existing policies to avoid conflicting restrictive rules
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.running_club_activities;
DROP POLICY IF EXISTS "Users can read their own activities" ON public.running_club_activities;
DROP POLICY IF EXISTS "allow authenticated insert club activity" ON public.running_club_activities;
DROP POLICY IF EXISTS "allow read club feed" ON public.running_club_activities;
DROP POLICY IF EXISTS "member can post in club" ON public.running_club_activities;
DROP POLICY IF EXISTS "permissao_total_membros_atividades" ON public.running_club_activities;
DROP POLICY IF EXISTS "running_club_activities_delete" ON public.running_club_activities;
DROP POLICY IF EXISTS "running_club_activities_impl_full_access" ON public.running_club_activities;
DROP POLICY IF EXISTS "running_club_activities_insert" ON public.running_club_activities;
DROP POLICY IF EXISTS "running_club_activities_select" ON public.running_club_activities;
DROP POLICY IF EXISTS "running_club_activities_update" ON public.running_club_activities;

-- Ensure RLS is enabled
ALTER TABLE public.running_club_activities ENABLE ROW LEVEL SECURITY;

-- Users can manage (insert/update/delete) their own activities
CREATE POLICY "running_club_activities_manage_own"
ON public.running_club_activities
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Club members and owners can view activities in their clubs (feed)
CREATE POLICY "running_club_activities_view_club_feed"
ON public.running_club_activities
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  -- Owner of the activity can always see
  auth.uid() = user_id
  OR
  -- Members of the same club can see
  EXISTS (
    SELECT 1
    FROM public.running_club_members m
    WHERE m.club_id = running_club_activities.club_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
);
