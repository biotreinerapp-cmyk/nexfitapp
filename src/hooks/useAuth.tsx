import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Limpa a sessão de forma segura e redireciona para /auth.
 * Usa uma flag para evitar loops de requisição.
 */
const handleInvalidSession = async (
  isSigningOutRef: React.MutableRefObject<boolean>,
  reason: string,
) => {
  if (isSigningOutRef.current) return; // evitar loop
  isSigningOutRef.current = true;

  console.warn(
    `[Auth] 🔒 Sessão inválida detectada (${reason}). Realizando logout e redirecionando para /auth...`,
  );

  try {
    // signOut com scope 'local' limpa apenas o storage local, sem chamar a API
    // (que falharia de qualquer forma com token inválido).
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    console.error("[Auth] Erro ao limpar sessão local:", err);
  }

  // Redireciona apenas se não estiver já em /auth para evitar loop
  if (window.location.pathname !== "/auth") {
    window.location.replace("/auth");
  }

  // Resetar flag após redirect para segurança
  setTimeout(() => {
    isSigningOutRef.current = false;
  }, 3000);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const didInitRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const userRef = useRef<User | null>(null);
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log("[Auth] Routing event:", event, nextSession ? "com sessão" : "sem sessão");

      // ─── Tratamento de logout / token inválido ───
      // Quando o Supabase detecta um refresh_token inválido, ele emite SIGNED_OUT.
      // Também tratamos TOKEN_REFRESHED sem sessão como sinal de falha.
      if (event === "SIGNED_OUT") {
        const hadSession = sessionRef.current !== null || userRef.current !== null;

        sessionRef.current = null;
        userRef.current = null;
        setSession(null);
        setUser(null);

        // Se o signOut não veio de uma ação do usuário (havia sessão antes),
        // provavelmente é um refresh_token inválido → forçar redirect.
        if (hadSession) {
          handleInvalidSession(isSigningOutRef, "SIGNED_OUT inesperado");
        }
        return;
      }

      if (event === "TOKEN_REFRESHED" && !nextSession) {
        handleInvalidSession(isSigningOutRef, "TOKEN_REFRESHED sem sessão");
        return;
      }

      // ─── Fluxo normal ───
      // Regra crítica: nunca voltar loading=true após o boot inicial.
      // Eventos rotineiros (ex: TOKEN_REFRESHED) não devem causar remount/flash.
      const nextUser = nextSession?.user ?? null;
      const prevUserId = userRef.current?.id ?? null;
      const nextUserId = nextUser?.id ?? null;

      // Se o usuário não mudou (apenas refresh de token), não re-renderiza.
      if (didInitRef.current && prevUserId === nextUserId) {
        sessionRef.current = nextSession;
        userRef.current = nextUser;
        return;
      }

      sessionRef.current = nextSession;
      userRef.current = nextUser;
      setSession(nextSession);
      setUser(nextUser);
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        // Se getSession retornar erro (ex: refresh_token expirado), tratar
        if (error) {
          console.warn("[Auth] Erro ao recuperar sessão inicial:", error.message);
          handleInvalidSession(isSigningOutRef, `getSession falhou: ${error.message}`);
          return;
        }

        sessionRef.current = data.session;
        userRef.current = data.session?.user ?? null;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((err) => {
        console.error("[Auth] Erro inesperado em getSession:", err);
        handleInvalidSession(isSigningOutRef, "getSession exception");
      })
      .finally(() => {
        // Regra crítica: inicializa apenas uma vez.
        if (!didInitRef.current) {
          didInitRef.current = true;
          setLoading(false);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, session, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
};
