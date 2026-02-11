import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const didInitRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Regra crítica: nunca voltar loading=true após o boot inicial.
      // Além disso, eventos rotineiros (ex: TOKEN_REFRESHED) não devem causar remount/flash.
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
      .then(({ data }) => {
        sessionRef.current = data.session;
        userRef.current = data.session?.user ?? null;
        setSession(data.session);
        setUser(data.session?.user ?? null);
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
