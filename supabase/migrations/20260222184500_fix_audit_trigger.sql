-- Fix PL/pgSQL strict record type-checking error on 'OLD.user_id' for 'profiles' table

CREATE OR REPLACE FUNCTION public.audit_security_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actor_id uuid := auth.uid();
    v_entity_id uuid;
    v_target_user_id uuid;
    v_old_json jsonb;
    v_new_json jsonb;
BEGIN
    IF v_actor_id IS NULL THEN
        -- If direct DB modification without auth session, we might not have a UID.
        v_actor_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;

    -- Extract JSON representations to bypass PL/pgSQL strict compile-time record field checks
    v_old_json := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE null END;
    v_new_json := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE null END;

    -- Generic entity ID
    v_entity_id := CASE WHEN TG_OP = 'DELETE' THEN (v_old_json->>'id')::uuid ELSE (v_new_json->>'id')::uuid END;

    -- Extract target_user_id safely using JSON
    v_target_user_id := CASE 
        WHEN TG_TABLE_NAME = 'profiles' THEN 
            CASE WHEN TG_OP = 'DELETE' THEN (v_old_json->>'id')::uuid ELSE (v_new_json->>'id')::uuid END
        WHEN TG_TABLE_NAME IN ('user_roles', 'user_system_permissions') THEN 
            CASE WHEN TG_OP = 'DELETE' THEN (v_old_json->>'user_id')::uuid ELSE (v_new_json->>'user_id')::uuid END
        ELSE NULL
    END;

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
        v_entity_id,
        v_target_user_id,
        jsonb_build_object(
            'old_data', v_old_json,
            'new_data', v_new_json
        )
    );
    
    RETURN NULL;
END;
$$;
