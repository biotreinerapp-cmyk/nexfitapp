
-- 1) New table for granular system permissions
CREATE TABLE IF NOT EXISTS public.user_system_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    system_key text NOT NULL, -- e.g., 'billing', 'telemedicine', 'users', 'content'
    permission_level text NOT NULL DEFAULT 'read', -- 'read', 'write', 'admin'
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, system_key)
);

ALTER TABLE public.user_system_permissions ENABLE ROW LEVEL SECURITY;

-- 2) Function to log denied access (to be called by frontend via RPC or handled by RLS)
CREATE OR REPLACE FUNCTION public.log_denied_access(_system text, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.admin_actions (
        actor_id,
        action,
        entity_table,
        entity_id,
        details
    ) VALUES (
        auth.uid(),
        'ACCESS_DENIED',
        'system_route',
        '00000000-0000-0000-0000-000000000000'::uuid,
        jsonb_build_object(
            'system', _system,
            'user_email', auth.jwt() ->> 'email',
            'details', _details
        )
    );
END;
$$;

-- 3) RLS Policies for user_system_permissions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_system_permissions' AND policyname = 'Admins manage permissions'
    ) THEN
        CREATE POLICY "Admins manage permissions"
        ON public.user_system_permissions
        FOR ALL
        TO authenticated
        USING (
            public.has_role(auth.uid(), 'admin'::app_role)
            OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
        )
        WITH CHECK (
            public.has_role(auth.uid(), 'admin'::app_role)
            OR (auth.jwt() ->> 'email') = 'biotreinerapp@gmail.com'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_system_permissions' AND policyname = 'Users view own permissions'
    ) THEN
        CREATE POLICY "Users view own permissions"
        ON public.user_system_permissions
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 4) Auditing triggers for security-sensitive tables
CREATE OR REPLACE FUNCTION public.audit_security_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id uuid := auth.uid();
BEGIN
    IF v_actor_id IS NULL THEN
        -- If direct DB modification without auth session, we might not have a UID.
        -- But for app-level changes, we want the actor.
        v_actor_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;

    INSERT INTO public.admin_actions (
        actor_id,
        action,
        entity_table,
        entity_id,
        target_user_id,
        details
    ) VALUES (
        v_actor_id,
        TG_OP || '_' || TG_TABLE_NAME,
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        CASE 
            WHEN TG_TABLE_NAME = 'profiles' THEN (CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END)
            WHEN TG_TABLE_NAME = 'user_roles' THEN (CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END)
            WHEN TG_TABLE_NAME = 'user_system_permissions' THEN (CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END)
            ELSE NULL
        END,
        jsonb_build_object(
            'old_data', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE null END,
            'new_data', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE null END
        )
    );
    RETURN NULL;
END;
$$;

-- Apply triggers
DO $$
BEGIN
    -- profiles trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_audit_profiles') THEN
        CREATE TRIGGER tr_audit_profiles
        AFTER INSERT OR UPDATE OR DELETE ON public.profiles
        FOR EACH ROW EXECUTE FUNCTION public.audit_security_change();
    END IF;

    -- user_roles trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_audit_user_roles') THEN
        CREATE TRIGGER tr_audit_user_roles
        AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
        FOR EACH ROW EXECUTE FUNCTION public.audit_security_change();
    END IF;

    -- user_system_permissions trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_audit_user_system_permissions') THEN
        CREATE TRIGGER tr_audit_user_system_permissions
        AFTER INSERT OR UPDATE OR DELETE ON public.user_system_permissions
        FOR EACH ROW EXECUTE FUNCTION public.audit_security_change();
    END IF;

    -- blacklist_emails trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_audit_blacklist_emails') THEN
        CREATE TRIGGER tr_audit_blacklist_emails
        AFTER INSERT OR UPDATE OR DELETE ON public.blacklist_emails
        FOR EACH ROW EXECUTE FUNCTION public.audit_security_change();
    END IF;
END $$;
