-- ============================================================
-- Create access_modules table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.access_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Create app_access_plans table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_access_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('ALUNO', 'PROFISSIONAL', 'LOJISTA')),
    price_cents INTEGER NOT NULL DEFAULT 0,
    validity_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_access_plans_user_type_idx ON public.app_access_plans(user_type);

-- ============================================================
-- Create plan_modules join table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.app_access_plans(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.access_modules(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(plan_id, module_id)
);

CREATE INDEX IF NOT EXISTS plan_modules_plan_id_idx ON public.plan_modules(plan_id);

-- ============================================================
-- Enable RLS
-- ============================================================
ALTER TABLE public.access_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_access_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_modules ENABLE ROW LEVEL SECURITY;

-- Public read for all authenticated users
CREATE POLICY "Authenticated users can read access_modules"
    ON public.access_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read app_access_plans"
    ON public.app_access_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read plan_modules"
    ON public.plan_modules FOR SELECT TO authenticated USING (true);

-- Admin write policies
CREATE POLICY "Admins can manage access_modules"
    ON public.access_modules FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'master' OR email = 'biotreinerapp@gmail.com')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'master' OR email = 'biotreinerapp@gmail.com')));

CREATE POLICY "Admins can manage app_access_plans"
    ON public.app_access_plans FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'master' OR email = 'biotreinerapp@gmail.com')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'master' OR email = 'biotreinerapp@gmail.com')));

CREATE POLICY "Admins can manage plan_modules"
    ON public.plan_modules FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'master' OR email = 'biotreinerapp@gmail.com')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'master' OR email = 'biotreinerapp@gmail.com')));

-- ============================================================
-- Trigger for updated_at on app_access_plans
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_app_access_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_access_plans_updated_at
    BEFORE UPDATE ON public.app_access_plans
    FOR EACH ROW EXECUTE FUNCTION public.set_app_access_plans_updated_at();

-- ============================================================
-- Seed default access modules
-- ============================================================
INSERT INTO public.access_modules (key, label) VALUES
    ('treinos', 'Treinos'),
    ('nutricao', 'Nutrição'),
    ('telemedicina', 'Telemedicina'),
    ('marketplace', 'Marketplace'),
    ('agenda', 'Agenda'),
    ('chat', 'Chat'),
    ('financeiro', 'Financeiro'),
    ('loja', 'Loja'),
    ('estoque', 'Estoque'),
    ('relatorios', 'Relatórios')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Seed default student plans (ADVANCE and ELITE)
-- ============================================================
INSERT INTO public.app_access_plans (name, user_type, price_cents, validity_days, is_active) VALUES
    ('ADVANCE', 'ALUNO', 2990, 30, true),
    ('ELITE', 'ALUNO', 4990, 30, true)
ON CONFLICT DO NOTHING;
