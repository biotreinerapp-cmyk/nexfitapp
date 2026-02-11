-- Create social feed tables for Running Club (retry without IF NOT EXISTS on policies)

-- 1) club_posts: main social feed posts per club
CREATE TABLE IF NOT EXISTS public.club_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.running_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  activity_id uuid NOT NULL REFERENCES public.running_club_activities(id) ON DELETE CASCADE,
  image_url text,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_club_posts_club_created_at
  ON public.club_posts (club_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_club_posts_user
  ON public.club_posts (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_club_posts_activity_unique
  ON public.club_posts (activity_id);

-- 2) club_post_likes: likes for posts
CREATE TABLE IF NOT EXISTS public.club_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.club_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT club_post_likes_unique_like UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_post_likes_post
  ON public.club_post_likes (post_id);

CREATE INDEX IF NOT EXISTS idx_club_post_likes_user
  ON public.club_post_likes (user_id);

-- 3) club_post_comments: comments for posts
CREATE TABLE IF NOT EXISTS public.club_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.club_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_post_comments_post_created_at
  ON public.club_post_comments (post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_club_post_comments_user
  ON public.club_post_comments (user_id);

-- Enable RLS
ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_post_comments ENABLE ROW LEVEL SECURITY;

-- RLS for club_posts

-- Members (or club owner/admin) can view posts for their clubs
DROP POLICY IF EXISTS "ClubPosts - view by members" ON public.club_posts;
CREATE POLICY "ClubPosts - view by members" ON public.club_posts
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
  OR has_role(auth.uid(), 'admin')
);

-- Only post owner (or admin) can insert posts, and must be member of club
DROP POLICY IF EXISTS "ClubPosts - insert by owner member" ON public.club_posts;
CREATE POLICY "ClubPosts - insert by owner member" ON public.club_posts
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
    OR has_role(auth.uid(), 'admin')
  )
);

-- Only post owner (or admin) can update their posts
DROP POLICY IF EXISTS "ClubPosts - update by owner" ON public.club_posts;
CREATE POLICY "ClubPosts - update by owner" ON public.club_posts
FOR UPDATE
USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- Only post owner (or admin) can delete their posts
DROP POLICY IF EXISTS "ClubPosts - delete by owner" ON public.club_posts;
CREATE POLICY "ClubPosts - delete by owner" ON public.club_posts
FOR DELETE
USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- RLS for club_post_likes

-- Members can see likes on posts from their clubs
DROP POLICY IF EXISTS "ClubPostLikes - view by club members" ON public.club_post_likes;
CREATE POLICY "ClubPostLikes - view by club members" ON public.club_post_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.club_posts p
    JOIN public.running_club_members m ON m.club_id = p.club_id
    WHERE p.id = club_post_likes.post_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
  OR has_role(auth.uid(), 'admin')
);

-- Members can like posts from their clubs (one like per user enforced by unique constraint)
DROP POLICY IF EXISTS "ClubPostLikes - insert by member" ON public.club_post_likes;
CREATE POLICY "ClubPostLikes - insert by member" ON public.club_post_likes
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.club_posts p
      JOIN public.running_club_members m ON m.club_id = p.club_id
      WHERE p.id = club_post_likes.post_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR has_role(auth.uid(), 'admin')
  )
);

-- Users can remove their own likes; admins can remove any
DROP POLICY IF EXISTS "ClubPostLikes - delete own or admin" ON public.club_post_likes;
CREATE POLICY "ClubPostLikes - delete own or admin" ON public.club_post_likes
FOR DELETE
USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- RLS for club_post_comments

-- Members can view comments on posts from their clubs
DROP POLICY IF EXISTS "ClubPostComments - view by club members" ON public.club_post_comments;
CREATE POLICY "ClubPostComments - view by club members" ON public.club_post_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.club_posts p
    JOIN public.running_club_members m ON m.club_id = p.club_id
    WHERE p.id = club_post_comments.post_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
  OR has_role(auth.uid(), 'admin')
);

-- Members can comment on posts from their clubs
DROP POLICY IF EXISTS "ClubPostComments - insert by member" ON public.club_post_comments;
CREATE POLICY "ClubPostComments - insert by member" ON public.club_post_comments
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.club_posts p
      JOIN public.running_club_members m ON m.club_id = p.club_id
      WHERE p.id = club_post_comments.post_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR has_role(auth.uid(), 'admin')
  )
);

-- Users can update their own comments (e.g., editing), admins can update any
DROP POLICY IF EXISTS "ClubPostComments - update own or admin" ON public.club_post_comments;
CREATE POLICY "ClubPostComments - update own or admin" ON public.club_post_comments
FOR UPDATE
USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- Users can delete their own comments; admins can delete any
DROP POLICY IF EXISTS "ClubPostComments - delete own or admin" ON public.club_post_comments;
CREATE POLICY "ClubPostComments - delete own or admin" ON public.club_post_comments
FOR DELETE
USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);