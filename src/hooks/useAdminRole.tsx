import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UseAdminRoleResult {
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
}

const ROLE_CHECK_TIMEOUT_MS = 4000;

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
    loading: true,
    error: null,
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
        const result = await withTimeout(
          Promise.resolve(
            supabase.rpc("has_role", {
              _user_id: user.id,
              _role: "admin",
            }) as any,
          ),
          ROLE_CHECK_TIMEOUT_MS,
        );

        const { data, error } = result as { data: unknown; error: any };

        if (cancelled) return;

        if (error) {
          console.error("Erro ao verificar role admin:", error);
          setState({ isAdmin: false, loading: false, error: error as any });
          return;
        }

        setState({ isAdmin: Boolean(data), loading: false, error: null });
      } catch (e) {
        if (cancelled) return;
        console.warn("Role admin: falha/timeout, liberando app", e);
        setState({ isAdmin: false, loading: false, error: e as Error });
      }
    };

    void checkRole();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return state;
};
