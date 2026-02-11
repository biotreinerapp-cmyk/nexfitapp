-- Fix RLS for running_club_activities so authenticated users can insert/select
-- while still keeping access scoped to club members / admins.

ALTER TABLE public.running_club_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RunningClubActivities - manage own" ON public.running_club_activities;

-- SELECT: owner of the activity, club members, or admins
CREATE POLICY "running_club_activities_select" ON public.running_club_activities
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.running_club_members m
    WHERE m.club_id = running_club_activities.club_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- INSERT: authenticated user inserting their own activity
CREATE POLICY "running_club_activities_insert" ON public.running_club_activities
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- UPDATE/DELETE: owner or admin
CREATE POLICY "running_club_activities_update" ON public.running_club_activities
FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "running_club_activities_delete" ON public.running_club_activities
FOR DELETE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
