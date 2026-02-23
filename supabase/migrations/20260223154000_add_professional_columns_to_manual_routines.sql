-- Add professional tracking columns to manual_routines
ALTER TABLE public.manual_routines 
ADD COLUMN IF NOT EXISTS professional_creator_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_manual_routines_professional_creator ON public.manual_routines(professional_creator_id);
CREATE INDEX IF NOT EXISTS idx_manual_routines_is_template ON public.manual_routines(is_template);

-- Update RLS Policies
-- Allow professionals to manage their own templates
CREATE POLICY "Professionals can manage own templates"
  ON public.manual_routines FOR ALL
  TO authenticated
  USING (
    (auth.uid() = user_id AND is_template = true) OR
    (EXISTS (
      SELECT 1 FROM public.professionals p 
      WHERE p.user_id = auth.uid() AND p.id = professional_creator_id
    ))
  );

-- Allow students to see routines assigned by professionals
-- Note: The existing "Users can view own routines" policy already covers this 
-- as long as user_id is the student's ID.
