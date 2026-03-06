-- Create nutrition_plans table
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    days JSONB DEFAULT '[]'::jsonb,
    professional_creator_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON public.nutrition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_professional_creator ON public.nutrition_plans(professional_creator_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_is_template ON public.nutrition_plans(is_template);

-- Trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION update_nutrition_plans_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_nutrition_plans_updated_at ON public.nutrition_plans;

CREATE TRIGGER trg_update_nutrition_plans_updated_at
BEFORE UPDATE ON public.nutrition_plans
FOR EACH ROW
EXECUTE FUNCTION update_nutrition_plans_updated_at_column();

-- Update trigger for is_active matching the behavior in manual_routines
CREATE OR REPLACE FUNCTION reset_other_active_nutrition_plans()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true AND NEW.is_template = false THEN
    UPDATE public.nutrition_plans
    SET is_active = false
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_template = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_single_active_nutrition_plan ON public.nutrition_plans;

CREATE TRIGGER ensure_single_active_nutrition_plan
  BEFORE INSERT OR UPDATE OF is_active
  ON public.nutrition_plans
  FOR EACH ROW
  EXECUTE FUNCTION reset_other_active_nutrition_plans();

-- RLS Policies

-- Users can view their own nutrition plans
CREATE POLICY "Users can view own nutrition plans"
  ON public.nutrition_plans FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (EXISTS (
        SELECT 1 FROM public.professionals p
        JOIN public.professional_student_bindings b ON b.professional_id = p.id
        WHERE p.user_id = auth.uid() 
          AND b.student_id = nutrition_plans.user_id
          AND b.status = 'active'
    ))
  );

-- Users can insert their own nutrition plans
CREATE POLICY "Users can insert own nutrition plans"
  ON public.nutrition_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    (EXISTS (
        SELECT 1 FROM public.professionals p
        JOIN public.professional_student_bindings b ON b.professional_id = p.id
        WHERE p.user_id = auth.uid() 
          AND b.student_id = nutrition_plans.user_id
          AND b.status = 'active'
    ))
  );

-- Users can update their own nutrition plans
CREATE POLICY "Users can update own nutrition plans"
  ON public.nutrition_plans FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (EXISTS (
        SELECT 1 FROM public.professionals p
        JOIN public.professional_student_bindings b ON b.professional_id = p.id
        WHERE p.user_id = auth.uid() 
          AND b.student_id = nutrition_plans.user_id
          AND b.status = 'active'
    ))
  );

-- Users can delete their own nutrition plans
CREATE POLICY "Users can delete own nutrition plans"
  ON public.nutrition_plans FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (EXISTS (
        SELECT 1 FROM public.professionals p
        JOIN public.professional_student_bindings b ON b.professional_id = p.id
        WHERE p.user_id = auth.uid() 
          AND b.student_id = nutrition_plans.user_id
          AND b.status = 'active'
    ))
  );

-- Professionals can manage own templates
CREATE POLICY "Professionals can manage own nutrition templates"
  ON public.nutrition_plans FOR ALL
  TO authenticated
  USING (
    (auth.uid() = user_id AND is_template = true) OR
    (EXISTS (
      SELECT 1 FROM public.professionals p 
      WHERE p.user_id = auth.uid() AND p.id = professional_creator_id
    ))
  );
