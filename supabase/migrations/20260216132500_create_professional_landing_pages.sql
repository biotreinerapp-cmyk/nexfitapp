-- Create professional_landing_pages table
-- This migration creates the missing table needed for the LP Generator

CREATE TABLE IF NOT EXISTS professional_landing_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    generated_content JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    correction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_professional_landing_pages_professional_id 
ON professional_landing_pages(professional_id);

CREATE INDEX IF NOT EXISTS idx_professional_landing_pages_active 
ON professional_landing_pages(professional_id, is_active);

-- Enable RLS
ALTER TABLE professional_landing_pages ENABLE ROW LEVEL SECURITY;

-- Allow professionals to view their own landing pages
CREATE POLICY "Professionals can view own landing pages"
ON professional_landing_pages FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM professionals WHERE id = professional_id));

-- Allow professionals to insert their own landing pages
CREATE POLICY "Professionals can create landing pages"
ON professional_landing_pages FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM professionals WHERE id = professional_id));

-- Allow professionals to update their own landing pages
CREATE POLICY "Professionals can update own landing pages"
ON professional_landing_pages FOR UPDATE
USING (auth.uid() IN (SELECT user_id FROM professionals WHERE id = professional_id));

-- Allow public to view active landing pages
CREATE POLICY "Anyone can view active landing pages"
ON professional_landing_pages FOR SELECT
USING (is_active = TRUE);

-- Admins can manage all landing pages
CREATE POLICY "Admins can manage all landing pages"
ON professional_landing_pages FOR ALL
USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
