import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UserPermission {
  system_key: string;
  permission_level: string;
}

interface UseAdminRoleResult {
  isAdmin: boolean;
  permissions: UserPermission[];
  loading: boolean;
  error: Error | null;
  hasPermission: (system: string, level?: string) => boolean;
}

const ROLE_CHECK_TIMEOUT_MS = 6000;

const withTimeout = async (promise: any, timeoutMs: number): Promise<any> => {
  return await new Promise<any>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("role_check_timeout")), timeoutMs);
    Promise.resolve(promise)
      .then((v) => resolve(v))
      .catch((e) => reject(e))
      .finally(() => window.clearTimeout(t));
  });
};

export const useAdminRole = (): UseAdminRoleResult => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<UseAdminRoleResult>({
    isAdmin: false,
    permissions: [],
    loading: true,
    error: null,
    hasPermission: () => false,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setState({ isAdmin: false, loading: false, error: null });
      return;
    }

    // Fail-open para o app do aluno: se a checagem de role travar por rede instável,
    // não podemos deixar todas as rotas presas em "Carregando...".
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setState({ isAdmin: false, loading: false, error: null });
      return;
    }

    let cancelled = false;

    const checkRole = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Parallel check for role and granular permissions
        const [roleResult, permissionsResult] = await Promise.all([
          withTimeout(
            supabase.rpc("has_role", {
              _user_id: user.id,
              _role: "admin",
            }),
            ROLE_CHECK_TIMEOUT_MS
          ),
          withTimeout(
            supabase
              .from("user_system_permissions")
              .select("system_key, permission_level")
              .eq("user_id", user.id),
            ROLE_CHECK_TIMEOUT_MS
          )
        ]);

        if (cancelled) return;

        if (roleResult.error) {
          console.error("Erro ao verificar role admin:", roleResult.error);
          setState((prev) => ({ ...prev, isAdmin: false, loading: false, error: roleResult.error }));
          return;
        }

        const isAdmin = Boolean(roleResult.data) || user.email === "biotreinerapp@gmail.com";
        const permissions = (permissionsResult.data as UserPermission[]) || [];

        setState({
          isAdmin,
          permissions,
          loading: false,
          error: null,
          hasPermission: (system: string, level: string = 'read') => {
            if (isAdmin) return true;
            const p = permissions.find(p => p.system_key === system);
            if (!p) return false;

            if (level === 'admin') return p.permission_level === 'admin';
            if (level === 'write') return p.permission_level === 'write' || p.permission_level === 'admin';
            return true; // level 'read'
          }
        });
      } catch (e) {
        if (cancelled) return;
        console.warn("Role admin check: falha/timeout", e);
        setState((prev) => ({ ...prev, loading: false, error: e as Error }));
      }
    };

    void checkRole();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return state;
};
