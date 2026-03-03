-- Migration: Educational and Consultancy Module
-- Description: Adds tables for professional educational content, marketplace, and members area.

-- 0. Ensure handle_updated_at function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Educational Contents (The main entity for course/mentorship/consultoria)
CREATE TABLE IF NOT EXISTS public.educational_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('consultoria', 'mentoria', 'curso')),
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Educational Modules
CREATE TABLE IF NOT EXISTS public.educational_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES public.educational_contents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Educational Lessons
CREATE TABLE IF NOT EXISTS public.educational_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.educational_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT, -- Support YouTube links
    content TEXT, -- Textual/HTML content
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Educational Purchases
CREATE TABLE IF NOT EXISTS public.educational_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES public.educational_contents(id) ON DELETE CASCADE,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(buyer_id, content_id) -- Prevent double purchase
);

-- Enable RLS
ALTER TABLE public.educational_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for educational_contents
DROP POLICY IF EXISTS "Anyone can view published contents" ON public.educational_contents;
CREATE POLICY "Anyone can view published contents"
    ON public.educational_contents FOR SELECT
    USING (is_published = true OR (auth.uid() IN (SELECT user_id FROM professionals WHERE id = professional_id)));

DROP POLICY IF EXISTS "Professionals can manage own contents" ON public.educational_contents;
CREATE POLICY "Professionals can manage own contents"
    ON public.educational_contents FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM professionals WHERE id = professional_id));

-- RLS Policies for educational_modules
DROP POLICY IF EXISTS "Anyone can view modules of published contents" ON public.educational_modules;
CREATE POLICY "Anyone can view modules of published contents"
    ON public.educational_modules FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.educational_contents c
        WHERE c.id = content_id AND (c.is_published = true OR auth.uid() IN (SELECT user_id FROM professionals WHERE id = c.professional_id))
    ));

DROP POLICY IF EXISTS "Professionals can manage own modules" ON public.educational_modules;
CREATE POLICY "Professionals can manage own modules"
    ON public.educational_modules FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.educational_contents c
        WHERE c.id = content_id AND auth.uid() IN (SELECT user_id FROM professionals WHERE id = c.professional_id)
    ));

-- RLS Policies for educational_lessons
DROP POLICY IF EXISTS "Buyers and owners can view lessons" ON public.educational_lessons;
CREATE POLICY "Buyers and owners can view lessons"
    ON public.educational_lessons FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.educational_modules m
        JOIN public.educational_contents c ON c.id = m.content_id
        WHERE m.id = module_id AND (
            c.is_published = true AND (
                c.price = 0 OR -- Free content
                auth.uid() IN (SELECT buyer_id FROM public.educational_purchases WHERE content_id = c.id) OR -- Purchased
                auth.uid() IN (SELECT user_id FROM professionals WHERE id = c.professional_id) -- Owner
            )
        )
    ));

DROP POLICY IF EXISTS "Professionals can manage own lessons" ON public.educational_lessons;
CREATE POLICY "Professionals can manage own lessons"
    ON public.educational_lessons FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.educational_modules m
        JOIN public.educational_contents c ON c.id = m.content_id
        WHERE m.id = module_id AND auth.uid() IN (SELECT user_id FROM professionals WHERE id = c.professional_id)
    ));

-- RLS Policies for educational_purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON public.educational_purchases;
CREATE POLICY "Users can view own purchases"
    ON public.educational_purchases FOR SELECT
    TO authenticated
    USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can insert own purchases" ON public.educational_purchases;
CREATE POLICY "Users can insert own purchases"
    ON public.educational_purchases FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = buyer_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_educational_contents_updated_at ON public.educational_contents;
CREATE TRIGGER update_educational_contents_updated_at
    BEFORE UPDATE ON public.educational_contents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_educational_lessons_updated_at ON public.educational_lessons;
CREATE TRIGGER update_educational_lessons_updated_at
    BEFORE UPDATE ON public.educational_lessons
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
