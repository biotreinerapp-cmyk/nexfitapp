-- Migration: Update professional_landing_pages for manual templates

-- Add new columns if they don't exist
ALTER TABLE professional_landing_pages
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'simple',
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS about_text TEXT,
ADD COLUMN IF NOT EXISTS services_text TEXT,
ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '{"hero": null, "profile": null}';

-- Clean up old Gemini-related columns
ALTER TABLE professional_landing_pages 
DROP COLUMN IF EXISTS prompt,
DROP COLUMN IF EXISTS generated_content,
DROP COLUMN IF EXISTS correction_count;

-- Ensure RLS is still active
ALTER TABLE professional_landing_pages ENABLE ROW LEVEL SECURITY;

-- Ensure professionals can only manage their own LP
DROP POLICY IF EXISTS "Professionals can manage their own landing page" ON professional_landing_pages;
CREATE POLICY "Professionals can manage their own landing page"
    ON professional_landing_pages
    FOR ALL
    TO authenticated
    USING (professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
    ))
    WITH CHECK (professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
    ));

-- Allow anyone to view active LPs
DROP POLICY IF EXISTS "Anyone can view active landing pages" ON professional_landing_pages;
CREATE POLICY "Anyone can view active landing pages"
    ON professional_landing_pages
    FOR SELECT
    TO public
    USING (is_active = true);
