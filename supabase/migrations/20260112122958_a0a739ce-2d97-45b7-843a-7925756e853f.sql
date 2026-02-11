-- Relax INSERT RLS on club_posts: allow any authenticated user to insert their own posts
-- while SELECT remains restricted to members/owners/admins.

DROP POLICY IF EXISTS "club_posts_insert_by_member" ON public.club_posts;

CREATE POLICY "club_posts_insert_own" ON public.club_posts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);