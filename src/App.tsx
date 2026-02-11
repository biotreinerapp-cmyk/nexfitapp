import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, BrowserRouter } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useAdminRole } from "./hooks/useAdminRole";
import AuthPage from "./pages/Auth";
import AlunoAtividadePage from "./pages/AlunoAtividade";
import AlunoAtividadeMomentoPage from "./pages/AlunoAtividadeMomento";
import AlunoTreinosHojePage from "./pages/AlunoTreinosHoje";
import AlunoDashboardPage from "./pages/AlunoDashboard";
import AlunoOnboardingPage from "./pages/AlunoOnboarding";
import AdminPage from "./pages/Admin";
import AdminMasterPage from "./pages/AdminMaster";
import MarketplaceCategoriesPage from "./pages/MarketplaceCategoriesPage";
import MarketplaceStoresPage from "./pages/MarketplaceStoresPage";
import MarketplaceStorePage from "./pages/MarketplaceStorePage";
import MarketplaceCartPage from "./pages/MarketplaceCartPage";
import NutricionistaPage from "./pages/NutricionistaPage";
import TelemedicinaPage from "./pages/TelemedicinaPage";
import LojaDashboardPage from "./pages/LojaDashboard";
import LojaFinanceiroPage from "./pages/LojaFinanceiroPage";
import LojaProdutosPage from "./pages/LojaProdutosPage";
import LojaEstoquePage from "./pages/LojaEstoquePage";
import LojaPerfilPage from "./pages/LojaPerfilPage";
import RunningClubPage from "./pages/RunningClubPage";
import RunningClubDetailPage from "./pages/RunningClubDetailPage";
import AlunoPersonalizarAtividadePage from "./pages/AlunoPersonalizarAtividade";
import AlunoPerfilPage from "./pages/AlunoPerfilPage";
import AlunoHistoricoPage from "./pages/AlunoHistoricoPage";
import AlunoHistoricoDetalhePage from "./pages/AlunoHistoricoDetalhePage";
import AlunoEditarPerfilPage from "./pages/AlunoEditarPerfilPage";
import AlunoPreferenciasPage from "./pages/AlunoPreferenciasPage";
import AlunoPlanoPage from "./pages/AlunoPlanoPage";
import { UserPreferencesProvider } from "./hooks/useUserPreferences";
import DeviceConnectivityPage from "./pages/DeviceConnectivityPage";
import { ActivityProvider } from "./hooks/useActivityContext";
import AlunoTreinoAtivoPage from "./pages/AlunoTreinoAtivo";
import AlunoProgressoPage from "./pages/AlunoProgressoPage";
import ModoRaizPage from "./pages/ModoRaizPage";
import ModoRaizFormPage from "./pages/ModoRaizFormPage";
import ModoRaizViewPage from "./pages/ModoRaizViewPage";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useOfflineSync } from "@/hooks/useOfflineSync";

const AlunoRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // SWR: bloqueia apenas no primeiro boot (sessão ainda não resolvida)
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>;
  }

  if (!user) return <Navigate to="/auth" replace />;

  const isMasterAdmin = user.email === "biotreinerapp@gmail.com";
  const searchParams = new URLSearchParams(location.search);
  const adminView = searchParams.get("adminView") === "1";

  // Apenas o admin master, por padrão, vai para o painel master, a menos que esteja forçando a visão de aluno
  if (isMasterAdmin && !adminView) {
    return <Navigate to="/admin-master" replace />;
  }

  return children;
};

const ONBOARDING_CACHE_PREFIX = "biotreiner_onboarding_cache_";

type OnboardingCache = {
  onboarding_completed: boolean;
  altura_cm: number | null;
  peso_kg: number | null;
  training_level: string | null;
  cached_at: number;
};

const readOnboardingCache = (userId: string): OnboardingCache | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${ONBOARDING_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingCache;
    if (typeof parsed?.cached_at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeOnboardingCache = (userId: string, data: Omit<OnboardingCache, "cached_at">) => {
  if (typeof window === "undefined") return;
  try {
    const payload: OnboardingCache = { ...data, cached_at: Date.now() };
    window.localStorage.setItem(`${ONBOARDING_CACHE_PREFIX}${userId}`, JSON.stringify(payload));
  } catch {
    // ignore
  }
};

const RequireOnboarding = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [hasSoftCache, setHasSoftCache] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyOnboarding = async () => {
      if (!user) return;

      // SWR: se já temos cache local, não bloqueia a UI enquanto revalida em background.
      const cached = readOnboardingCache(user.id);
      const cachedSatisfies =
        !!cached &&
        !!cached.onboarding_completed &&
        cached.altura_cm !== null &&
        cached.peso_kg !== null &&
        !!cached.training_level;

      setHasSoftCache(Boolean(cached));
      if (cachedSatisfies) {
        setChecking(false);
      }

      if (isAdmin) {
        // Admins não passam por onboarding
        setChecking(false);
        return;
      }

      // OFFLINE-FIRST: se estiver offline, usamos cache local (se existir) e não bloqueamos o app.
      if (!navigator.onLine) {
        if (cached) {
          const needsOnboarding =
            !cached.onboarding_completed ||
            cached.altura_cm === null ||
            cached.peso_kg === null ||
            !cached.training_level;
          if (needsOnboarding) navigate("/aluno/onboarding", { replace: true });
        }
        setChecking(false);
        return;
      }

      const onboardingTimeoutMs = 4000;

      const { data, error } = (await Promise.race([
        supabase
          .from("profiles")
          .select("onboarding_completed, altura_cm, peso_kg, training_level")
          .eq("id", user.id)
          .maybeSingle(),
        new Promise<{ data: null; error: Error }>((resolve) =>
          window.setTimeout(() => resolve({ data: null, error: new Error("onboarding_check_timeout") }), onboardingTimeoutMs),
        ),
      ])) as any;

      if (error) {
        // Se cair aqui por instabilidade/sem rede, tentamos cache e não travamos a navegação.
        if (cached) {
          const needsOnboarding =
            !cached.onboarding_completed ||
            cached.altura_cm === null ||
            cached.peso_kg === null ||
            !cached.training_level;
          if (needsOnboarding) navigate("/aluno/onboarding", { replace: true });
        }
        // Sem cache: não bloqueia e não mostra toast destrutivo (evita ruído no modo offline).
        setChecking(false);
        return;
      }

      const needsOnboarding =
        !data ||
        !data.onboarding_completed ||
        data.altura_cm === null ||
        data.peso_kg === null ||
        !data.training_level;

      // Atualiza cache local sempre que conseguir verificar online.
      if (data) {
        writeOnboardingCache(user.id, {
          onboarding_completed: Boolean(data.onboarding_completed),
          altura_cm: data.altura_cm,
          peso_kg: data.peso_kg,
          training_level: data.training_level ?? null,
        });
      }

      if (needsOnboarding) {
        navigate("/aluno/onboarding", { replace: true });
      }

      setChecking(false);
    };

    if (!loading && !roleLoading && user) {
      void verifyOnboarding();
    }
  }, [user, loading, roleLoading, navigate, toast, isAdmin]);

  // SWR: só bloqueia em tela cheia no boot inicial sem sessão.
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>;
  }

  // SWR: se já existe cache local de onboarding, renderiza o app e revalida em background.
  if ((roleLoading || checking) && !hasSoftCache) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>;
  }

  return children;
};

const AdminMasterRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading, error } = useAdminRole();

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isMasterAdmin = user.email === "biotreinerapp@gmail.com";

  if (error) {
    console.error("Erro ao verificar role admin:", error);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Acesso negado</h1>
        <p className="mb-4 text-muted-foreground">
          Não foi possível verificar suas permissões. Tente novamente mais tarde.
        </p>
      </div>
    );
  }

  if (!isAdmin && !isMasterAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Acesso negado</h1>
        <p className="mb-4 text-muted-foreground">
          Você não tem permissão para acessar o painel administrador.
        </p>
        <a
          href="/aluno/dashboard"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Voltar para o app
        </a>
      </div>
    );
  }

  return children;
};

const OfflineFirstManager = () => {
  useConnectionStatus();
  useOfflineSync();
  return null;
};

const AppRoutes = () => (
  <>
    <OfflineFirstManager />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/aluno/atividade"
        element={
          <AlunoRoute>
            <RequireOnboarding>
              <AlunoTreinosHojePage />
            </RequireOnboarding>
          </AlunoRoute>
        }
      />
    <Route
      path="/aluno/treinos"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoTreinosHojePage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/monitoramento"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoAtividadeMomentoPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/monitoramento-tempo-real"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoAtividadePage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/treino-ativo"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoTreinoAtivoPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/atividade-personalizar"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoPersonalizarAtividadePage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/onboarding"
      element={
        <AlunoRoute>
          <AlunoOnboardingPage />
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/dashboard"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoDashboardPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/perfil"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoPerfilPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/perfil/editar"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoEditarPerfilPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/perfil/plano"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoPlanoPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/perfil/preferencias"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoPreferenciasPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/conectividade"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <DeviceConnectivityPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/historico"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoHistoricoPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/historico/:id"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoHistoricoDetalhePage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/progresso"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <AlunoProgressoPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
       path="/aluno/running-club"
       element={
         <AlunoRoute>
           <RequireOnboarding>
             <RunningClubPage />
           </RequireOnboarding>
         </AlunoRoute>
       }
     />
     <Route
       path="/aluno/running-club/:clubId"
       element={
         <AlunoRoute>
           <RequireOnboarding>
             <RunningClubDetailPage />
           </RequireOnboarding>
         </AlunoRoute>
       }
     />
    <Route
      path="/aluno/nutricionista"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <NutricionistaPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/telemedicina"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <TelemedicinaPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/marketplace"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <MarketplaceCategoriesPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/marketplace/categoria/:category"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <MarketplaceStoresPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/marketplace/loja/:storeId"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <MarketplaceStorePage />
          </RequireOnboarding>
        </AlunoRoute>
      }
     />
    <Route
      path="/marketplace/loja/:storeId/carrinho"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <MarketplaceCartPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/modo-raiz"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <ModoRaizPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/modo-raiz/nova"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <ModoRaizFormPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/modo-raiz/:id"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <ModoRaizViewPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/aluno/modo-raiz/:id/editar"
      element={
        <AlunoRoute>
          <RequireOnboarding>
            <ModoRaizFormPage />
          </RequireOnboarding>
        </AlunoRoute>
      }
    />
    <Route
      path="/loja/dashboard"
      element={
        <AlunoRoute>
          <LojaDashboardPage />
        </AlunoRoute>
      }
    />
    <Route
      path="/loja/financeiro"
      element={
        <AlunoRoute>
          <LojaFinanceiroPage />
        </AlunoRoute>
      }
    />
    <Route
      path="/loja/produtos"
      element={
        <AlunoRoute>
          <LojaProdutosPage />
        </AlunoRoute>
      }
    />
    <Route
      path="/loja/estoque"
      element={
        <AlunoRoute>
          <LojaEstoquePage />
        </AlunoRoute>
      }
    />
    <Route
      path="/loja/perfil"
      element={
        <AlunoRoute>
          <LojaPerfilPage />
        </AlunoRoute>
      }
    />
    <Route path="/admin" element={<AdminPage />} />
    <Route
      path="/admin-master"
      element={
        <AdminMasterRoute>
          <AdminMasterPage />
        </AdminMasterRoute>
      }
    />
    <Route
      path="/admin-master/usuarios"
      element={
        <AdminMasterRoute>
          <AdminMasterPage />
        </AdminMasterRoute>
      }
    />
    <Route
      path="/admin-master/usuarios/solicitacoes-upgrade"
      element={
        <AdminMasterRoute>
          <AdminMasterPage />
        </AdminMasterRoute>
      }
    />
    <Route
      path="/admin-master/marketplace"
      element={
        <AdminMasterRoute>
          <AdminMasterPage />
        </AdminMasterRoute>
      }
    />
    <Route
      path="/admin-master/telemedicina"
      element={
        <AdminMasterRoute>
          <AdminMasterPage />
        </AdminMasterRoute>
      }
    />
    <Route
      path="/admin-master/dr-bio"
      element={
        <AdminMasterRoute>
          <AdminMasterPage />
        </AdminMasterRoute>
      }
    />
    <Route
      path="/admin-master/configuracoes"
      element={
        <AdminMasterRoute>
          <AdminMasterPage />
        </AdminMasterRoute>
      }
    />
    <Route
      path="/admin-master/noticias"
      element={
        <AdminMasterRoute>
          <AdminMasterPage />
        </AdminMasterRoute>
      }
    />
    <Route
      path="/admin-master/pagamentos"
      element={
        <AdminMasterRoute>
          <AdminMasterPage />
        </AdminMasterRoute>
      }
    />
    <Route
      path="/admin-master/ajustes"
      element={
        <AdminMasterRoute>
          <AdminMasterPage />
        </AdminMasterRoute>
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
  </>
);

const ScrollToTopOnDashboard = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/aluno/dashboard") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [location.pathname]);

  return null;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <UserPreferencesProvider>
        <ActivityProvider>
          <ScrollToTopOnDashboard />
          <AppRoutes />
        </ActivityProvider>
      </UserPreferencesProvider>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
