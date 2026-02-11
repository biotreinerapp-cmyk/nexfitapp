-- Clean up and standardize RLS policies for club_posts

-- 1) Ensure RLS is enabled
ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;

-- 2) Drop existing policies to avoid conflicts/overlaps
DROP POLICY IF EXISTS "Allow authenticated user to insert club posts" ON public.club_posts;
DROP POLICY IF EXISTS "Allow user to update own club posts" ON public.club_posts;
DROP POLICY IF EXISTS "Allow users to read club posts" ON public.club_posts;
DROP POLICY IF EXISTS "ClubPosts - delete by owner" ON public.club_posts;
DROP POLICY IF EXISTS "ClubPosts - insert by owner member" ON public.club_posts;
DROP POLICY IF EXISTS "ClubPosts - update by owner" ON public.club_posts;
DROP POLICY IF EXISTS "ClubPosts - view by members" ON public.club_posts;
DROP POLICY IF EXISTS "Members can read club posts" ON public.club_posts;
DROP POLICY IF EXISTS "Users can insert their own club posts" ON public.club_posts;

-- 3) Create clear, non-overlapping policies

-- SELECT: members of the club, club creator, or admins can see posts
CREATE POLICY "club_posts_select_by_members" ON public.club_posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.running_club_members m
    WHERE m.club_id = club_posts.club_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
  OR EXISTS (
    SELECT 1
    FROM public.running_clubs c
    WHERE c.id = club_posts.club_id
      AND c.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- INSERT: only authenticated members of the club (or admins) can insert, and only for themselves
CREATE POLICY "club_posts_insert_by_member" ON public.club_posts
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.running_club_members m
      WHERE m.club_id = club_posts.club_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- UPDATE: post owner or admins
CREATE POLICY "club_posts_update_by_owner" ON public.club_posts
FOR UPDATE
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- DELETE: post owner or admins
CREATE POLICY "club_posts_delete_by_owner" ON public.club_posts
FOR DELETE
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
