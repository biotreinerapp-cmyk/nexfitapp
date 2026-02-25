-- Migration to add is_active and video_url to exercises table
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Update existing records to have is_active = true (already handled by DEFAULT, but good to ensure)
UPDATE exercises SET is_active = true WHERE is_active IS NULL;
