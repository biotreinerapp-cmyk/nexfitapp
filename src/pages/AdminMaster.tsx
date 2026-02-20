import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Store,
  Stethoscope,
  Brain,
  Bell,
  LogOut,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  UserX,
  Eye,
  EyeOff,
  HeartPulse,
  ClipboardList,
  CreditCard,
  Heart,
  Activity,
  Apple,
  Bone,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_LABEL, type SubscriptionPlan } from "@/lib/subscriptionPlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardOutdoorAdminPanel } from "@/components/admin/DashboardOutdoorAdminPanel";
import { NewsNotificationsAdminPanel } from "@/components/admin/NewsNotificationsAdminPanel";
import { HighlightOffersAdminPanel } from "@/components/admin/HighlightOffersAdminPanel";
import { GeneralSettingsPixPanel } from "@/components/admin/GeneralSettingsPixPanel";
import { PlanConfigEditor } from "@/components/admin/pricing/PlanConfigEditor";
import { ProfessionalPricingConfig } from "@/components/admin/pricing/ProfessionalPricingConfig";
import { HighlightOffersManager } from "@/components/admin/pricing/HighlightOffersManager";
import { PixConfigManager } from "@/components/admin/pricing/PixConfigManager";
import { WithdrawalRequestsManager } from "@/components/admin/pricing/WithdrawalRequestsManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StoreImageEditor } from "@/components/marketplace/StoreImageEditor";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  subscription_plan: SubscriptionPlan;
  plan_expires_at: string | null;
  created_at: string | null;
  ativo?: boolean | null;
}

type AdminListUsersRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  subscription_plan: SubscriptionPlan;
  plan_expires_at: string | null;
  created_at: string;
  ativo: boolean;
};

const formatDateTimePtBr = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
};

interface Store {
  id: string;
  nome: string;
  owner_user_id: string;
  status: string;
  store_type: string;
  created_at: string;
}

interface InternalStore {
  id: string;
  name: string;
  store_type: string;
  is_active: boolean;
  created_at: string;
  description: string | null;
}
interface TelemedServico {
  id: string;
  nome: string;
  slug: string;
  icone: string | null;
  icon_url: string | null;
  ativo: boolean | null;
}

interface TelemedProfissional {
  id: string;
  nome: string;
  crm_crp: string | null;
  bio: string | null;
  foto_url: string | null;
  preco_base: number | null;
  disponivel: boolean | null;
  servico_id: string | null;
}

const TELEMED_ICON_COMPONENTS: Record<string, LucideIcon> = {
  heart: Heart,
  "heart-pulse": HeartPulse,
  "clipboard-list": ClipboardList,
  stethoscope: Stethoscope,
  activity: Activity,
  apple: Apple,
  bone: Bone,
  brain: Brain,
};

const getIconForServiceName = (nome: string): string => {
  const normalized = nome.toLowerCase();

  if (normalized.includes("cardio") || normalized.includes("cardiologia")) return "heart";
  if (normalized.includes("endo")) return "stethoscope";
  if (normalized.includes("fisiot") || normalized.includes("fisio")) return "activity";
  if (normalized.includes("nutri")) return "apple";
  if (normalized.includes("orto") || normalized.includes("ortop")) return "bones";
  if (normalized.includes("psico")) return "brain";

  if (normalized.includes("exame") || normalized.includes("avalia")) return "clipboard-list";
  if (normalized.includes("consulta") || normalized.includes("atendimento")) return "stethoscope";

  return "stethoscope";
};

const AdminMasterContent = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();

  const isUpgradeRequestsPage = location.pathname.startsWith("/admin-master/usuarios/solicitacoes-upgrade");

  const [profileSearch, setProfileSearch] = useState("");
  const [isSyncingExercises, setIsSyncingExercises] = useState(false);
  const [exerciseApiKey, setExerciseApiKey] = useState("");
  const [showExerciseApiKey, setShowExerciseApiKey] = useState(false);
  const [hasExerciseApiKey, setHasExerciseApiKey] = useState(false);
  const [exerciseApiKeyUpdatedAt, setExerciseApiKeyUpdatedAt] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);

  const [aiProvider, setAiProvider] = useState<"api_ninjas_nutrition" | "openai_vision" | "custom_endpoint">(
    "api_ninjas_nutrition",
  );
  const [aiApiKey, setAiApiKey] = useState("");
  const [showAiApiKey, setShowAiApiKey] = useState(false);
  const [aiBaseUrl, setAiBaseUrl] = useState("https://api.api-ninjas.com/v1/nutrition?query=");
  const [aiSystemContext, setAiSystemContext] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [loadingAiConfig, setLoadingAiConfig] = useState(false);
  const [savingAiConfig, setSavingAiConfig] = useState(false);

  const [testPrompt, setTestPrompt] = useState("450g de peito bovino");
  const [testLoading, setTestLoading] = useState(false);
  const [testAiResponse, setTestAiResponse] = useState("");
  const [testRawGatewayResponse, setTestRawGatewayResponse] = useState("");
  const [testError, setTestError] = useState<string | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [internalStores, setInternalStores] = useState<InternalStore[]>([]);

  const [newStore, setNewStore] = useState({
    name: "",
    storeType: "suplementos",
    description: "",
    ownerEmail: "",
    ownerPassword: "",
    profileImageFile: null as File | null,
    bannerImageFile: null as File | null,
    cnpj: "",
    whatsapp: "",
  });
  const [showNewStoreForm, setShowNewStoreForm] = useState(false);
  const [isCreatingStore, setIsCreatingStore] = useState(false);

  const [editingStore, setEditingStore] = useState<InternalStore | null>(null);
  const [editStoreForm, setEditStoreForm] = useState({ name: "", store_type: "", description: "" });
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [editStoreMarketplaceId, setEditStoreMarketplaceId] = useState<string | null>(null);
  const [editStoreProfileUrl, setEditStoreProfileUrl] = useState<string | null>(null);
  const [editStoreBannerUrl, setEditStoreBannerUrl] = useState<string | null>(null);

  const [servicos, setServicos] = useState<TelemedServico[]>([]);
  const [profissionais, setProfissionais] = useState<TelemedProfissional[]>([]);
  const [novoServico, setNovoServico] = useState({ nome: "", slug: "", icone: "" });
  const [novoServicoIconFile, setNovoServicoIconFile] = useState<File | null>(null);
  const [editingServicoId, setEditingServicoId] = useState<string | null>(null);
  const [editingServico, setEditingServico] = useState<{
    nome: string;
    slug: string;
    icone: string | null;
    ativo: boolean;
  } | null>(null);
  const [editingServicoIconFile, setEditingServicoIconFile] = useState<File | null>(null);
  const [novoProfissional, setNovoProfissional] = useState({
    nome: "",
    crm_crp: "",
    bio: "",
    foto_url: "",
    preco_base: "",
    servico_id: "",
  });
  const queryClient = useQueryClient();
  const sidebar = useSidebar();
  const collapsed = sidebar.state === "collapsed";

  const { data: profiles = [], error: profilesError, isLoading: profilesLoading } = useQuery<Profile[]>({
    // Use a specific key to avoid stale cached results from previous queries.
    queryKey: ["users", "admin_list_users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");

      if (error) {
        console.error("Erro ao carregar usuários (admin_list_users)", error);
        throw error;
      }

      const rows = (data ?? []) as unknown as AdminListUsersRow[];

      // Map result for UI (show  when missing in UI layer).
      return rows.map((r) => ({
        id: r.id,
        display_name: r.display_name,
        email: r.email,
        phone: r.phone,
        subscription_plan: r.subscription_plan,
        plan_expires_at: r.plan_expires_at,
        created_at: r.created_at,
        ativo: r.ativo,
      }));
    },
    staleTime: 0,
    enabled: !!session && !authLoading,
  });

  useEffect(() => {
    if (!profilesError) return;
    toast({
      title: "Erro ao carregar usuários",
      description: profilesError.message,
      variant: "destructive",
    });
  }, [profilesError, toast]);

  const totalUsers = profiles.length;
  const totalPremiumUsers = useMemo(
    () => profiles.filter((p) => p.subscription_plan !== "FREE").length,
    [profiles],
  );
  const totalActiveUsers = totalUsers;

  useEffect(() => {
    if (!session) return;

    const loadStores = async () => {
      const [{ data: marketplaceData, error: marketplaceError }, { data: internalData, error: internalError }] =
        await Promise.all([
          supabase
            .from("marketplace_stores")
            .select("id, nome, owner_user_id, status, store_type, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("stores")
            .select("id, name, store_type, is_active, created_at, description")
            .order("created_at", { ascending: false }),
        ]);

      if (marketplaceError) {
        toast({ title: "Erro ao carregar lojas", description: marketplaceError.message, variant: "destructive" });
      } else if (marketplaceData) {
        setStores(marketplaceData as Store[]);
      }

      if (internalError) {
        toast({ title: "Erro ao carregar lojas internas", description: internalError.message, variant: "destructive" });
      } else if (internalData) {
        setInternalStores(internalData as InternalStore[]);
      }
    };

    const loadTelemed = async () => {
      const [{ data: servicosData, error: servicosError }, { data: profissionaisData, error: profissionaisError }] =
        await Promise.all([
          supabase.from("telemedicina_servicos").select("id, nome, slug, icone, icon_url, ativo").order("nome"),
          supabase
            .from("telemedicina_profissionais")
            .select("id, nome, crm_crp, bio, foto_url, preco_base, disponivel, servico_id")
            .order("nome"),
        ]);

      if (servicosError) {
        toast({ title: "Erro ao carregar serviços", description: servicosError.message, variant: "destructive" });
      } else {
        setServicos(((servicosData as unknown) as TelemedServico[]) ?? []);
      }

      if (profissionaisError) {
        toast({ title: "Erro ao carregar profissionais", description: profissionaisError.message, variant: "destructive" });
      } else {
        setProfissionais((profissionaisData as TelemedProfissional[]) ?? []);
      }
    };

    void loadStores();
    void loadTelemed();
  }, [session, toast]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["users", "admin_list_users"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredProfiles = useMemo(() => {
    if (!profileSearch.trim()) return profiles;
    const term = profileSearch.toLowerCase();
    return profiles.filter(
      (p) => (p.display_name ?? "").toLowerCase().includes(term) || (p.email ?? "").toLowerCase().includes(term),
    );
  }, [profiles, profileSearch]);

  useEffect(() => {
    const loadConfig = async () => {
      setLoadingConfig(true);
      const { data, error } = await supabase
        .from("app_settings")
        .select("key_value, updated_at")
        .eq("key_name", "exercisedb_api_key")
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar configuração ExerciseDB", error);
        toast({ title: "Erro ao carregar configurações", description: error.message, variant: "destructive" });
      } else if (data?.key_value) {
        setExerciseApiKey(data.key_value as string);
        setHasExerciseApiKey(true);
        setExerciseApiKeyUpdatedAt((data as any).updated_at ?? null);
      } else {
        setHasExerciseApiKey(false);
        setExerciseApiKeyUpdatedAt(null);
      }

      setLoadingConfig(false);
    };

    if (session) {
      void loadConfig();
    }
  }, [session, toast]);

  useEffect(() => {
    const loadAiConfig = async () => {
      if (!session) return;
      setLoadingAiConfig(true);
      setTestError(null);

      const { data, error } = await supabase
        .from("config_ai_agents")
        .select("provider, api_key, base_url, system_context, instructions_layer")
        .eq("agent_key", "dr_bio")
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar configuração do Dr. Bio (config_ai_agents)", error);
        toast({
          title: "Erro ao carregar Conteúdo Dr. Bio",
          description: error.message,
          variant: "destructive",
        });
        setLoadingAiConfig(false);
        return;
      }

      if (data) {
        setAiProvider(((data as any).provider as any) ?? "api_ninjas_nutrition");
        setAiApiKey(((data as any).api_key as string | null) ?? "");
        setAiBaseUrl(((data as any).base_url as string | null) ?? "https://api.api-ninjas.com/v1/nutrition?query=");
        setAiSystemContext(((data as any).system_context as string | null) ?? "");
        setAiInstructions(((data as any).instructions_layer as string | null) ?? "");
      }

      setLoadingAiConfig(false);
    };

    void loadAiConfig();
  }, [session, toast]);

  const handleChangePlano = async (profileId: string, novoPlano: SubscriptionPlan) => {
    const previous = queryClient.getQueryData<Profile[]>(["users"]);

    // Atualiza imediatamente no UI
    queryClient.setQueryData<Profile[]>(["users"], (curr) =>
      (curr ?? []).map((p) => (p.id === profileId ? { ...p, subscription_plan: novoPlano } : p)),
    );

    const { error } = await supabase.from("profiles").update({ subscription_plan: novoPlano }).eq("id", profileId);

    if (error) {
      // Reverte UI se falhar
      queryClient.setQueryData<Profile[]>(["users"], previous ?? []);
      toast({ title: "Erro ao atualizar plano", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Plano atualizado", description: "Plano do usuário atualizado com sucesso!" });
    void queryClient.invalidateQueries({ queryKey: ["users", "admin_list_users"] });
  };

  const handleToggleAtivo = async (profileId: string, ativo: boolean) => {
    const { error } = await supabase.from("profiles").update({ ativo }).eq("id", profileId);

    if (error) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Status atualizado", description: "O status do usuário foi atualizado com sucesso." });
    void queryClient.invalidateQueries({ queryKey: ["users", "admin_list_users"] });
  };


  const handleBanUser = async (profileId: string) => {
    const { error } = await supabase.functions.invoke("admin-user-management", {
      body: { action: "ban", userId: profileId },
    });

    if (error) {
      toast({ title: "Erro ao banir usuário", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Usuário banido", description: "Usuário desativado (ativo=false)." });
    void queryClient.invalidateQueries({ queryKey: ["users", "admin_list_users"] });
  };

  const handleDeleteUser = async (profileId: string) => {
    const { error } = await supabase.functions.invoke("admin-user-management", {
      body: { action: "delete", userId: profileId },
    });

    if (error) {
      toast({ title: "Erro ao excluir usuário", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Usuário excluído", description: "Usuário removido com sucesso." });
    void queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handleUpdateUser = async () => {
    if (!editUserId) return;

    const { error } = await supabase.functions.invoke("admin-user-management", {
      body: {
        action: "update",
        userId: editUserId,
        data: { display_name: editDisplayName.trim() || null, ativo: editAtivo },
      },
    });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Usuário atualizado", description: "Dados do usuário atualizados." });
    setEditUserOpen(false);
    setEditUserId(null);
    void queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handleSyncExercises = async () => {
    if (!exerciseApiKey) {
      toast({
        title: "Configure a API key primeiro",
        description: "Preencha e salve a chave da ExerciseDB na aba Configurações antes de sincronizar.",
        variant: "destructive",
      });
      return;
    }

    const masked = `${exerciseApiKey.slice(0, 4)}*** (len=${exerciseApiKey.length})`;
    // eslint-disable-next-line no-console
    console.log("[Biotreiner] ExerciseDB key carregada de app_settings:", masked);

    setIsSyncingExercises(true);
    const { data, error } = await supabase.functions.invoke("sync-exercises");

    if (error) {
      toast({ title: "Erro ao sincronizar exercícios", description: error.message, variant: "destructive" });
      setIsSyncingExercises(false);
      return;
    }

    const imported = (data as any)?.imported ?? 0;
    const details = (data as any)?.details as string | undefined;

    toast({
      title: imported > 0 ? "Sincronização concluída" : "Sincronização finalizada",
      description:
        imported > 0
          ? `${imported} exercícios foram sincronizados com sucesso para a biblioteca.`
          : details || "Nenhum exercício novo encontrado ou a API retornou uma mensagem específica.",
    });
    setIsSyncingExercises(false);
  };

  const handleSaveAiConfig = async () => {
    setSavingAiConfig(true);
    setTestError(null);

    const payload = {
      agent_key: "dr_bio",
      provider: aiProvider,
      api_key: aiApiKey.trim() || null,
      base_url: aiBaseUrl.trim() || "https://api.api-ninjas.com/v1/nutrition?query=",
      system_context: aiSystemContext.trim() || null,
      instructions_layer: aiInstructions.trim() || null,
    } as const;

    const { error } = await supabase.from("config_ai_agents").upsert(payload, {
      onConflict: "agent_key",
    });

    setSavingAiConfig(false);

    if (error) {
      toast({
        title: "Erro ao salvar Conteúdo Dr. Bio",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Configurações do Dr. Bio salvas",
      description: "O agente nutricionista passará a usar imediatamente estas configurações.",
    });
  };

  const handleTestDrBio = async () => {
    if (!testPrompt.trim()) return;

    setTestLoading(true);
    setTestError(null);
    setTestAiResponse("");
    setTestRawGatewayResponse("");

    try {
      const sessionInfo = await supabase.auth.getSession();
      const accessToken = sessionInfo.data.session?.access_token;

      if (!accessToken) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const response = await fetch("https://affyffsmcvphrhbtxrgt.functions.supabase.co/dr-bio-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZnlmZnNtY3ZwaHJoYnR4cmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjU1NDYsImV4cCI6MjA4MjY0MTU0Nn0.cpLjvUADTJxzdr0MGIZFai_zYHPbnaU2P1I-EyDoqnw",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: testPrompt.trim() }],
          profile: null,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Falha ao iniciar o teste com o Dr. Bio.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let collectedText = "";
      const rawLines: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":")) continue;
          if (line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            break;
          }

          rawLines.push(jsonStr);

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              collectedText += delta;
              setTestAiResponse((prev) => prev + delta);
            }
          } catch {
            // JSON parcial; aguarda mais dados
          }
        }
      }

      setTestRawGatewayResponse(rawLines.join("\n"));

      if (!collectedText) {
        setTestError("Nenhuma resposta de texto foi recebida do Dr. Bio.");
      }
    } catch (error) {
      console.error("Erro ao testar Dr. Bio no console admin:", error);
      setTestError(error instanceof Error ? error.message : "Erro desconhecido ao testar Dr. Bio.");
    } finally {
      setTestLoading(false);
    }
  };
  const handleNovoUsuarioClick = () => {
    toast({
      title: "Cadastro de usuário",
      description:
        "O botão 'Novo usuário' ainda não cria contas reais porque isso exige uma função segura no backend com permissões de administrador.",
    });
  };
  const handleCreateStoreWithOwner = async () => {
    const name = newStore.name.trim();
    const ownerEmail = newStore.ownerEmail.trim().toLowerCase();
    const ownerPassword = newStore.ownerPassword.trim();

    if (!name || !ownerEmail || !ownerPassword) {
      toast({ title: "Preencha nome da loja, e-mail e senha do lojista", variant: "destructive" });
      return;
    }

    if (ownerPassword.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setIsCreatingStore(true);

    try {
      // Upload images if provided
      let profileImageUrl: string | undefined;
      let bannerImageUrl: string | undefined;

      if (newStore.profileImageFile) {
        const ext = newStore.profileImageFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `profile-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("marketplace_store_images")
          .upload(path, newStore.profileImageFile, { upsert: true });
        if (!upErr) {
          profileImageUrl = supabase.storage.from("marketplace_store_images").getPublicUrl(path).data.publicUrl;
        }
      }

      if (newStore.bannerImageFile) {
        const ext = newStore.bannerImageFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `banner-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("marketplace_store_images")
          .upload(path, newStore.bannerImageFile, { upsert: true });
        if (!upErr) {
          bannerImageUrl = supabase.storage.from("marketplace_store_images").getPublicUrl(path).data.publicUrl;
        }
      }

      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: {
          action: "create_store_owner",
          email: ownerEmail,
          password: ownerPassword,
          storeName: name,
          storeType: newStore.storeType,
          storeDescription: newStore.description.trim() || undefined,
          profileImageUrl,
          bannerImageUrl,
          cnpj: newStore.cnpj.trim() || undefined,
          whatsapp: newStore.whatsapp.trim() || undefined,
        },
      });

      // On non-2xx, supabase-js sets error but data may still contain the parsed body
      const bodyError = (data as any)?.error;
      if (bodyError || error) {
        let msg = bodyError || "Erro desconhecido ao criar loja.";
        if (!bodyError && error) {
          // Try to extract the JSON body from FunctionsHttpError
          try {
            const ctx = (error as any).context;
            if (ctx && typeof ctx.json === "function") {
              const parsed = await ctx.json();
              msg = parsed?.error || error.message;
            } else {
              msg = error.message;
            }
          } catch {
            msg = error.message;
          }
        }
        toast({ title: "Erro ao criar loja", description: msg, variant: "destructive" });
        return;
      }

      toast({
        title: "Loja e lojista cadastrados",
        description: `A conta do lojista (${ownerEmail}) foi criada e a loja está ativa no marketplace.`,
      });

      setNewStore({
        name: "", storeType: "suplementos", description: "",
        ownerEmail: "", ownerPassword: "",
        profileImageFile: null, bannerImageFile: null,
        cnpj: "", whatsapp: "",
      });
      setShowNewStoreForm(false);

      // Reload stores
      const { data: updatedStores } = await supabase
        .from("stores")
        .select("id, name, store_type, is_active, created_at, description")
        .order("created_at", { ascending: false });
      if (updatedStores) setInternalStores(updatedStores as InternalStore[]);
    } finally {
      setIsCreatingStore(false);
    }
  };

  const handleCreateServico = async () => {
    if (!novoServico.nome.trim() || !novoServico.slug.trim()) {
      toast({ title: "Preencha nome e slug do serviço", variant: "destructive" });
      return;
    }

    const iconSlug = novoServico.icone || getIconForServiceName(novoServico.nome);

    const { data, error } = await supabase
      .from("telemedicina_servicos")
      .insert({
        nome: novoServico.nome,
        slug: novoServico.slug,
        icone: iconSlug,
        ativo: true,
      })
      .select()
      .maybeSingle();

    if (error) {
      toast({ title: "Erro ao criar serviço", description: error.message, variant: "destructive" });
      return;
    }

    let createdServico = data as TelemedServico;

    if (novoServicoIconFile) {
      const file = novoServicoIconFile;
      const validTypes = ["image/png", "image/svg+xml"];

      if (!validTypes.includes(file.type)) {
        toast({ title: "Formato inválido", description: "Envie um arquivo SVG ou PNG.", variant: "destructive" });
      } else {
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
        const filePath = `servico-${createdServico.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("telemedicina_icons")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type || undefined,
          });

        if (uploadError) {
          toast({ title: "Erro ao enviar ícone", description: uploadError.message, variant: "destructive" });
        } else {
          const { data: publicData } = supabase.storage.from("telemedicina_icons").getPublicUrl(filePath);
          const publicUrl = publicData.publicUrl;

          const { data: updated, error: updateError } = await supabase
            .from("telemedicina_servicos")
            .update({ icon_url: publicUrl } as any)
            .eq("id", createdServico.id)
            .select()
            .maybeSingle();

          if (updateError) {
            toast({ title: "Erro ao salvar URL do ícone", description: updateError.message, variant: "destructive" });
          } else if (updated) {
            createdServico = updated as TelemedServico;
          }
        }
      }
    }

    if (createdServico) {
      setServicos((prev) => [...prev, createdServico]);
    }

    setNovoServico({ nome: "", slug: "", icone: "" });
    setNovoServicoIconFile(null);
    toast({ title: "Serviço criado", description: "Novo serviço de telemedicina adicionado." });
  };
  const handleDeleteServico = async (id: string) => {
    const { error } = await supabase.from("telemedicina_servicos").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao remover serviço", description: error.message, variant: "destructive" });
      return;
    }

    setServicos((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Serviço removido" });
  };

  const handleCreateProfissional = async () => {
    if (!novoProfissional.nome.trim()) {
      toast({ title: "Informe o nome do profissional", variant: "destructive" });
      return;
    }

    const preco = novoProfissional.preco_base ? Number(novoProfissional.preco_base) : null;

    const { data, error } = await supabase
      .from("telemedicina_profissionais")
      .insert({
        nome: novoProfissional.nome,
        crm_crp: novoProfissional.crm_crp || null,
        bio: novoProfissional.bio || null,
        foto_url: novoProfissional.foto_url || null,
        preco_base: preco,
        disponivel: true,
        servico_id: novoProfissional.servico_id || null,
      })
      .select()
      .maybeSingle();

    if (error) {
      toast({ title: "Erro ao criar profissional", description: error.message, variant: "destructive" });
      return;
    }

    if (data) {
      setProfissionais((prev) => [...prev, data as TelemedProfissional]);
    }

    setNovoProfissional({ nome: "", crm_crp: "", bio: "", foto_url: "", preco_base: "", servico_id: "" });
    toast({ title: "Profissional criado", description: "Novo profissional adicionado à telemedicina." });
  };

  const handleDeleteProfissional = async (id: string) => {
    const { error } = await supabase.from("telemedicina_profissionais").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao remover profissional", description: error.message, variant: "destructive" });
      return;
    }

    setProfissionais((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Profissional removido" });
  };

  const handleStartEditServico = (servico: TelemedServico) => {
    setEditingServicoId(servico.id);
    setEditingServico({
      nome: servico.nome,
      slug: servico.slug,
      icone: servico.icone,
      ativo: servico.ativo ?? true,
    });
  };

  const handleCancelEditServico = () => {
    setEditingServicoId(null);
    setEditingServico(null);
  };

  const handleSaveEditServico = async () => {
    if (!editingServicoId || !editingServico) return;

    const { nome, slug, icone, ativo } = editingServico;

    if (!nome.trim() || !slug.trim()) {
      toast({ title: "Preencha nome e slug do serviço", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("telemedicina_servicos")
      .update({ nome, slug, icone, ativo })
      .eq("id", editingServicoId)
      .select()
      .maybeSingle();

    if (error) {
      toast({ title: "Erro ao atualizar serviço", description: error.message, variant: "destructive" });
      return;
    }

    let updatedServico = data as TelemedServico;

    if (editingServicoIconFile) {
      const file = editingServicoIconFile;
      const validTypes = ["image/png", "image/svg+xml"];

      if (!validTypes.includes(file.type)) {
        toast({ title: "Formato inválido", description: "Envie um arquivo SVG ou PNG.", variant: "destructive" });
      } else {
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
        const filePath = `servico-${editingServicoId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("telemedicina_icons")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type || undefined,
          });

        if (uploadError) {
          toast({ title: "Erro ao enviar ícone", description: uploadError.message, variant: "destructive" });
        } else {
          const { data: publicData } = supabase.storage.from("telemedicina_icons").getPublicUrl(filePath);
          const publicUrl = publicData.publicUrl;

          const { data: updatedWithIcon, error: updateError } = await supabase
            .from("telemedicina_servicos")
            .update({ icon_url: publicUrl } as any)
            .eq("id", editingServicoId)
            .select()
            .maybeSingle();

          if (updateError) {
            toast({ title: "Erro ao salvar URL do ícone", description: updateError.message, variant: "destructive" });
          } else if (updatedWithIcon) {
            updatedServico = updatedWithIcon as TelemedServico;
          }
        }
      }
    }

    if (updatedServico) {
      setServicos((prev) => prev.map((s) => (s.id === editingServicoId ? updatedServico : s)));
    }

    setEditingServicoId(null);
    setEditingServico(null);
    setEditingServicoIconFile(null);
    toast({ title: "Serviço atualizado", description: "Dados do serviço salvos com sucesso." });
  };
  const currentSection:
    | "dashboard"
    | "usuarios"
    | "pagamentos"
    | "marketplace"
    | "telemedicina"
    | "precificacao"
    | "dr-bio"
    | "noticias"
    | "configuracoes"
    | "ajustes" = (() => {
      if (location.pathname.startsWith("/admin-master/usuarios")) return "usuarios";
      if (location.pathname.startsWith("/admin-master/pagamentos")) return "pagamentos";
      if (location.pathname.startsWith("/admin-master/marketplace")) return "marketplace";
      if (location.pathname.startsWith("/admin-master/telemedicina")) return "telemedicina";
      if (location.pathname.startsWith("/admin-master/precificacao")) return "precificacao";
      if (location.pathname.startsWith("/admin-master/dr-bio")) return "dr-bio";
      if (location.pathname.startsWith("/admin-master/noticias")) return "noticias";
      if (location.pathname.startsWith("/admin-master/configuracoes")) return "configuracoes";
      if (location.pathname.startsWith("/admin-master/ajustes")) return "ajustes";
      return "dashboard";
    })();

  const handleNavigate = (path: string) => {
    if (location.pathname === path) return;
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        try {
          const prefixes = ["biotreiner_activity_", "biotreiner_strength_", "biotreiner_chat_"];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (!key) continue;
            if (prefixes.some((p) => key.startsWith(p))) {
              window.localStorage.removeItem(key);
            }
          }

          // Remove token local imediatamente para evitar "loop" de redirect no /auth.
          window.localStorage.removeItem("sb-affyffsmcvphrhbtxrgt-auth-token");
        } catch (error) {
          console.error("Falha ao limpar caches temporários no logout (admin)", error);
        }
      }

      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore
      }
    } finally {
      // SPA navigation evita “tela branca” de reload completo após logout.
      navigate("/auth", { replace: true });
    }
  };

  const handleGoToAlunoView = () => {
    navigate("/aluno/dashboard?adminView=1", { replace: true });
  };

  const currentSectionTitle =
    currentSection === "dashboard"
      ? "Painel Admin Master"
      : currentSection === "usuarios"
        ? isUpgradeRequestsPage
          ? "Solicitações de Upgrade"
          : "Gestão de Usuários"
        : currentSection === "pagamentos"
          ? "Pagamentos"
          : currentSection === "marketplace"
            ? "Marketplace"
            : currentSection === "telemedicina"
              ? "Telemedicina"
              : currentSection === "precificacao"
                ? "Precificação"
                : currentSection === "dr-bio"
                  ? "Conteúdo Dr. Bio"
                  : currentSection === "noticias"
                    ? "Notícias / Outdoor"
                    : currentSection === "ajustes"
                      ? "Ajustes Gerais"
                      : "Configurações Gerais";

  type PaymentStatusFilter = "all" | "pending" | "approved" | "rejected";
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>(
    currentSection === "pagamentos" ? "pending" : "all",
  );
  const [receiptPreview, setReceiptPreview] = useState<{ open: boolean; url: string | null }>(
    { open: false, url: null },
  );
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; payment: PaymentRowUi | null }>({
    open: false,
    payment: null,
  });
  const [reviewedReceiptFile, setReviewedReceiptFile] = useState<File | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; paymentId: string | null }>({
    open: false,
    paymentId: null,
  });
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReviewedReceiptFile, setRejectReviewedReceiptFile] = useState<File | null>(null);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  const [upgradeRejectDialog, setUpgradeRejectDialog] = useState<{ open: boolean; payment: PaymentRowUi | null }>(
    {
      open: false,
      payment: null,
    },
  );
  const [upgradeRejectReason, setUpgradeRejectReason] = useState("");

  type PagamentoRow = {
    id: string;
    user_id: string;
    store_id: string | null;
    provider: "pix";
    desired_plan: "FREE" | "ADVANCE" | "ELITE";
    status: "pending" | "approved" | "rejected";
    requested_at: string;
    processed_at: string | null;
    processed_by: string | null;
    receipt_path: string;
    reviewed_receipt_path: string | null;
    rejection_reason: string | null;
  };

  type PaymentRowUi = PagamentoRow & {
    user_name: string;
    user_email: string;
  };

  type AdminActionRow = {
    id: string;
    actor_id: string;
    action: string;
    entity_table: string;
    entity_id: string;
    target_user_id: string | null;
    details: any;
    created_at: string;
  };

  type AdminActionRowUi = AdminActionRow & {
    actor_email: string;
  };

  const { data: payments = [], isLoading: paymentsLoading, error: paymentsError } = useQuery<PaymentRowUi[]>({
    queryKey: ["admin-payments", paymentFilter],
    enabled: !!session && !authLoading,
    queryFn: async () => {
      let q = (supabase as any)
        .from("pagamentos")
        .select(
          "id,user_id,store_id,provider,desired_plan,status,requested_at,processed_at,processed_by,receipt_path,reviewed_receipt_path,rejection_reason",
        )
        .order("requested_at", { ascending: false });

      if (paymentFilter !== "all") {
        q = q.eq("status", paymentFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as PagamentoRow[];

      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const profilesById = new Map<string, { name: string; email: string }>();

      if (userIds.length) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, display_name, nome, email")
          .in("id", userIds);

        if (profilesErr) throw profilesErr;

        for (const p of (profilesData ?? []) as any[]) {
          const name = (p.display_name ?? p.nome ?? (p.email ? String(p.email).split("@")[0] : "(sem nome)")) as string;
          const email = (p.email ?? "(sem e-mail)") as string;
          profilesById.set(p.id as string, { name, email });
        }
      }

      return rows.map((r) => {
        const profile = profilesById.get(r.user_id);
        return {
          ...r,
          user_name: profile?.name ?? "(usuário)",
          user_email: profile?.email ?? "(sem e-mail)",
        };
      });
    },
  });

  const { data: pendingUpgradeCount = 0 } = useQuery<number>({
    queryKey: ["admin-upgrade-pending-count"],
    enabled: !!session && !authLoading && currentSection === "usuarios",
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("pagamentos")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  const {
    data: upgradeRequests = [],
    isLoading: upgradeRequestsLoading,
    error: upgradeRequestsError,
  } = useQuery<PaymentRowUi[]>({
    queryKey: ["admin-upgrade-requests"],
    enabled: !!session && !authLoading && isUpgradeRequestsPage,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pagamentos")
        .select("id,user_id,store_id,provider,desired_plan,status,requested_at,processed_at,processed_by,receipt_path,reviewed_receipt_path,rejection_reason")
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as unknown as PagamentoRow[];

      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const profilesById = new Map<string, { name: string; email: string }>();

      if (userIds.length) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, display_name, nome, email")
          .in("id", userIds);

        if (profilesErr) throw profilesErr;

        for (const p of (profilesData ?? []) as any[]) {
          const name = (p.display_name ?? p.nome ?? (p.email ? String(p.email).split("@")[0] : "(sem nome)")) as string;
          const email = (p.email ?? "(sem e-mail)") as string;
          profilesById.set(p.id as string, { name, email });
        }
      }

      return rows.map((r) => {
        const profile = profilesById.get(r.user_id);
        return {
          ...r,
          user_name: profile?.name ?? "(usuário)",
          user_email: profile?.email ?? "(sem e-mail)",
        };
      });
    },
  });

  const { data: auditRows = [], isLoading: auditLoading } = useQuery<AdminActionRowUi[]>({
    queryKey: ["admin-payment-audit"],
    enabled: !!session && !authLoading,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_actions")
        .select("id, actor_id, action, entity_table, entity_id, target_user_id, details, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as unknown as AdminActionRow[];

      const actorIds = Array.from(new Set(rows.map((r) => r.actor_id)));
      const profilesById = new Map<string, string>();
      if (actorIds.length) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", actorIds);
        if (profilesErr) throw profilesErr;
        for (const p of (profilesData ?? []) as any[]) {
          profilesById.set(p.id as string, (p.email ?? p.id) as string);
        }
      }

      return rows.map((r) => ({
        ...r,
        actor_email: profilesById.get(r.actor_id) ?? r.actor_id,
      }));
    },
  });

  useEffect(() => {
    if (!paymentsError) return;
    toast({ title: "Erro ao carregar pagamentos", description: paymentsError.message, variant: "destructive" });
  }, [paymentsError, toast]);

  useEffect(() => {
    if (!upgradeRequestsError) return;
    toast({
      title: "Erro ao carregar solicitações",
      description: upgradeRequestsError.message,
      variant: "destructive",
    });
  }, [upgradeRequestsError, toast]);

  const statusBadgeVariant = (status: PagamentoRow["status"]) => {
    if (status === "approved") return "default";
    if (status === "rejected") return "destructive";
    return "secondary";
  };

  const handleOpenReceipt = async (receiptPath: string) => {
    try {
      setProcessingPaymentId("preview");
      const { data, error } = await supabase.storage.from("payment_receipts").createSignedUrl(receiptPath, 60 * 10);
      if (error) throw error;
      const url = data?.signedUrl ?? null;
      if (!url) throw new Error("signed_url_empty");
      setReceiptPreview({ open: true, url });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({
        title: "Erro ao abrir comprovante",
        description: e?.message ?? "Não foi possível gerar o link do comprovante.",
        variant: "destructive",
      });
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const uploadReviewedReceipt = async (payment: PaymentRowUi, file: File) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const reviewedPath = `admin-reviewed/${payment.user_id}/${payment.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("payment_receipts")
      .upload(reviewedPath, file, { upsert: true, contentType: file.type || undefined });

    if (uploadError) throw uploadError;
    return reviewedPath;
  };

  const logAdminAction = async (payload: {
    action: "payment_approved" | "payment_rejected";
    payment: PaymentRowUi;
    rejection_reason?: string | null;
    reviewed_receipt_path?: string | null;
  }) => {
    if (!session?.user) return;
    const { error } = await (supabase as any).from("admin_actions").insert({
      actor_id: session.user.id,
      action: payload.action,
      entity_table: "pagamentos",
      entity_id: payload.payment.id,
      target_user_id: payload.payment.user_id,
      details: {
        desired_plan: payload.payment.desired_plan,
        rejection_reason: payload.rejection_reason ?? null,
        reviewed_receipt_path: payload.reviewed_receipt_path ?? null,
      },
    });
    if (error) throw error;
  };

  const handleApprovePayment = async (payment: PaymentRowUi, maybeReviewedFile?: File | null) => {
    try {
      if (!session?.user) return;
      setProcessingPaymentId(payment.id);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const reviewedPath = maybeReviewedFile ? await uploadReviewedReceipt(payment, maybeReviewedFile) : null;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ subscription_plan: payment.desired_plan, plan_expires_at: expiresAt })
        .eq("id", payment.user_id);

      if (profileErr) throw profileErr;

      const { error: payErr } = await (supabase as any)
        .from("pagamentos")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
          processed_by: session.user.id,
          rejection_reason: null,
          reviewed_receipt_path: reviewedPath,
        })
        .eq("id", payment.id);

      if (payErr) throw payErr;

      await logAdminAction({
        action: "payment_approved",
        payment,
        reviewed_receipt_path: reviewedPath,
      });

      toast({
        title: "Pagamento aprovado",
        description: `Plano do usuário atualizado para ${payment.desired_plan} por 30 dias.`,
      });

      void queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (e: any) {
      toast({ title: "Erro ao aprovar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleRejectPayment = async () => {
    try {
      if (!session?.user) return;
      if (!rejectDialog.paymentId) return;
      if (!rejectReason.trim()) {
        toast({ title: "Informe o motivo", description: "Digite um motivo para a rejeição." });
        return;
      }
      setProcessingPaymentId(rejectDialog.paymentId);

      const payment = payments.find((p) => p.id === rejectDialog.paymentId) ?? null;
      const reviewedPath =
        payment && rejectReviewedReceiptFile ? await uploadReviewedReceipt(payment, rejectReviewedReceiptFile) : null;

      const { error } = await (supabase as any)
        .from("pagamentos")
        .update({
          status: "rejected",
          rejection_reason: rejectReason.trim(),
          processed_at: new Date().toISOString(),
          processed_by: session.user.id,
          reviewed_receipt_path: reviewedPath,
        })
        .eq("id", rejectDialog.paymentId);

      if (error) throw error;

      if (payment) {
        await logAdminAction({
          action: "payment_rejected",
          payment,
          rejection_reason: rejectReason.trim(),
          reviewed_receipt_path: reviewedPath,
        });
      }

      toast({ title: "Pagamento rejeitado", description: "A solicitação foi marcada como rejeitada." });
      setRejectDialog({ open: false, paymentId: null });
      setRejectReason("");
      setRejectReviewedReceiptFile(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (e: any) {
      toast({ title: "Erro ao rejeitar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleApproveUpgradeRequest = async (payment: PaymentRowUi) => {
    await handleApprovePayment(payment);
    void queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-upgrade-pending-count"] });
    void queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handleRejectUpgradeRequest = async () => {
    try {
      if (!session?.user) return;
      if (!upgradeRejectDialog.payment) return;
      if (!upgradeRejectReason.trim()) {
        toast({ title: "Informe o motivo", description: "Digite um motivo para a rejeição." });
        return;
      }

      const payment = upgradeRejectDialog.payment;
      setProcessingPaymentId(payment.id);

      const { error } = await (supabase as any)
        .from("pagamentos")
        .update({
          status: "rejected",
          rejection_reason: upgradeRejectReason.trim(),
          processed_at: new Date().toISOString(),
          processed_by: session.user.id,
        })
        .eq("id", payment.id);

      if (error) throw error;

      await logAdminAction({
        action: "payment_rejected",
        payment,
        rejection_reason: upgradeRejectReason.trim(),
      });

      toast({ title: "Solicitação rejeitada", description: "A solicitação foi marcada como rejeitada." });
      setUpgradeRejectDialog({ open: false, payment: null });
      setUpgradeRejectReason("");

      void queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-upgrade-pending-count"] });
    } catch (e: any) {
      toast({ title: "Erro ao rejeitar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setProcessingPaymentId(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar
          collapsible="icon"
          className="border-r border-border bg-[hsl(var(--background))] text-sm"
          variant="sidebar"
        >
          <SidebarContent>
            <SidebarHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 px-2 pt-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <span className="text-lg font-bold">BT</span>
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Admin</span>
                    <span className="text-sm font-semibold">Nexfit Console</span>
                  </div>
                )}
              </div>
            </SidebarHeader>

            <SidebarGroup className="mt-2">
              <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80">
                Navegação
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentSection === "dashboard"}
                      onClick={() => handleNavigate("/admin-master")}
                    >
                      <LayoutDashboard className="mr-2" />
                      {!collapsed && <span>Painel de controle</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentSection === "usuarios"}
                      onClick={() => handleNavigate("/admin-master/usuarios")}
                    >
                      <Users className="mr-2" />
                      {!collapsed && <span>Gestão de Usuários</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentSection === "pagamentos"}
                      onClick={() => handleNavigate("/admin-master/pagamentos")}
                    >
                      <CreditCard className="mr-2" />
                      {!collapsed && <span>Pagamentos</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentSection === "marketplace"}
                      onClick={() => handleNavigate("/admin-master/marketplace")}
                    >
                      <Store className="mr-2" />
                      {!collapsed && <span>Marketplace</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentSection === "telemedicina"}
                      onClick={() => handleNavigate("/admin-master/telemedicina")}
                    >
                      <Stethoscope className="mr-2" />
                      {!collapsed && <span>Telemedicina</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentSection === "precificacao"}
                      onClick={() => handleNavigate("/admin-master/precificacao")}
                    >
                      <CreditCard className="mr-2" />
                      {!collapsed && <span>Precificação</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentSection === "dr-bio"}
                      onClick={() => handleNavigate("/admin-master/dr-bio")}
                    >
                      <Brain className="mr-2" />
                      {!collapsed && <span>Conteúdo Dr. Bio</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentSection === "noticias"}
                      onClick={() => handleNavigate("/admin-master/noticias")}
                    >
                      <ClipboardList className="mr-2" />
                      {!collapsed && <span>Notícias</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentSection === "configuracoes"}
                      onClick={() => handleNavigate("/admin-master/configuracoes")}
                    >
                      <Pencil className="mr-2" />
                      {!collapsed && <span>Configurações</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentSection === "ajustes"}
                      onClick={() => handleNavigate("/admin-master/ajustes")}
                    >
                      <Settings className="mr-2" />
                      {!collapsed && <span>Ajustes Gerais</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarFooter className="mt-auto border-t border-border/60">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleGoToAlunoView} variant="outline" size="sm">
                      <ArrowLeftRight className="mr-2" />
                      <span>Voltar para visão aluno</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout} variant="outline" size="sm">
                      <LogOut className="mr-2" />
                      <span>Sair</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarFooter>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="bg-background">
          <main className="min-h-screen px-4 pb-10 pt-4">
            {authLoading ? (
              <p className="text-sm text-muted-foreground">Carregando sessão...</p>
            ) : !session ? (
              <p className="text-sm text-muted-foreground">Sessão inválida ou expirada. Faça login novamente.</p>
            ) : (
              <>
                {currentSection === "dashboard" ? (
                  <header className="mb-4 flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-3">
                      <SidebarTrigger className="mr-1 flex h-8 w-8 items-center justify-center rounded border border-border/60 bg-background">
                        {collapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronLeft className="h-4 w-4" />
                        )}
                      </SidebarTrigger>
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Console interno</p>
                        <h1 className="mt-1 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl">
                          Painel Admin Master
                        </h1>
                        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                          Controle avançado de usuários, planos, marketplace e telemedicina do ecossistema Nexfit.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-primary/60 bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary"
                      >
                        ADMIN MASTER
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-border/70 bg-card/80 text-[10px] font-medium text-muted-foreground"
                      >
                        Somente biotreinerapp@gmail.com
                      </Badge>
                    </div>
                  </header>
                ) : (
                  <header className="mb-4 flex items-center gap-3 border-b border-border/60 pb-3">
                    <SidebarTrigger className="mr-1 flex h-8 w-8 items-center justify-center rounded border border-border/60 bg-background">
                      {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronLeft className="h-4 w-4" />
                      )}
                    </SidebarTrigger>
                    <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{currentSectionTitle}</h1>
                  </header>
                )}

                <div className="mx-auto flex max-w-6xl flex-col gap-6">
                  {currentSection === "dashboard" && (
                    <>
                      {/* Dashboard de Métricas */}
                      <section aria-labelledby="metricas-title" className="grid gap-4 md:grid-cols-3">
                        <Card className="border border-primary/30 bg-card/90 shadow-lg shadow-primary/20">
                          <CardHeader className="pb-1 pt-3">
                            <CardTitle
                              id="metricas-title"
                              className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
                            >
                              Usuários cadastrados
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex items-center justify-between pb-3 pt-1">
                            <p className="text-2xl font-semibold text-foreground">
                              {totalUsers !== null ? totalUsers.toLocaleString("pt-BR") : "--"}
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border border-primary/30 bg-card/90 shadow-lg shadow-primary/20">
                          <CardHeader className="pb-1 pt-3">
                            <CardTitle className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                              Usuários ativos
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex items-center justify-between pb-3 pt-1">
                            <p className="text-2xl font-semibold text-foreground">
                              {totalActiveUsers !== null ? totalActiveUsers.toLocaleString("pt-BR") : "--"}
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border border-primary/30 bg-card/90 shadow-lg shadow-primary/20">
                          <CardHeader className="pb-1 pt-3">
                            <CardTitle className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                              Usuários premium
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex items-center justify-between pb-3 pt-1">
                            <div className="flex flex-col text-right">
                              <span className="text-[11px] text-muted-foreground">Planos +SAUDE e +SAUDE PRO</span>
                              <p className="text-2xl font-semibold text-primary">
                                {totalPremiumUsers !== null ? totalPremiumUsers.toLocaleString("pt-BR") : "--"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </section>

                      {/* Seções detalhadas por módulo */}
                      <section className="mt-4 grid gap-4 md:grid-cols-2">
                        <Card className="border border-border/70 bg-card/80">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">Visão geral rápida</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <p>
                              Utilize o menu lateral para navegar entre gestão de usuários, marketplace, telemedicina e
                              configurações da IA Dr. Bio.
                            </p>
                            <p>
                              Este painel é exclusivo para o e-mail <span className="font-medium">biotreinerapp@gmail.com</span>
                              , com poderes completos sobre o ecossistema.
                            </p>
                          </CardContent>
                        </Card>
                      </section>
                    </>
                  )}

                  {currentSection === "noticias" && (
                    <section className="space-y-4">
                      <Card className="border border-border/70 bg-card/80">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Notícias</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Gerencie o Outdoor (banners no Dashboard do Aluno) e, em breve, notificações.
                          </p>
                        </CardHeader>
                        <CardContent>
                          <Tabs defaultValue="banner" className="w-full">
                            <TabsList className="w-full justify-start">
                              <TabsTrigger value="banner">Banner</TabsTrigger>
                              <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
                              <TabsTrigger value="ofertas">Ofertas Destaque</TabsTrigger>
                            </TabsList>

                            <TabsContent value="banner" className="mt-4 space-y-4">
                              <Card className="border border-border/70 bg-card/80">
                                <CardHeader>
                                  <CardTitle className="text-sm font-medium">Outdoor do Dashboard</CardTitle>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Publique comunicados em formato de imagem que aparecem no Dashboard do Aluno.
                                  </p>
                                </CardHeader>
                                <CardContent className="text-xs text-muted-foreground">
                                  Dica: use imagens 360×120 (proporção 3:1). O link é opcional.
                                </CardContent>
                              </Card>

                              <DashboardOutdoorAdminPanel />
                            </TabsContent>

                            <TabsContent value="notificacoes" className="mt-4 space-y-4">
                              <NewsNotificationsAdminPanel />
                            </TabsContent>

                            <TabsContent value="ofertas" className="mt-4 space-y-4">
                              <HighlightOffersAdminPanel />
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>
                    </section>
                  )}

                  {currentSection === "configuracoes" && (
                    <section className="space-y-4">
                      <Card className="border border-border/70 bg-card/80">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Configurações gerais</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Esta seção foi movida para o novo painel administrativo.
                          </p>
                        </CardHeader>
                        <CardContent>
                          <a href="/admin/settings" className="text-blue-500 hover:underline">
                            Ir para Configurações no Novo Admin
                          </a>
                        </CardContent>
                      </Card>
                    </section>
                  )}

                  {currentSection === "ajustes" && (
                    <section className="space-y-4">
                      <Card className="border border-border/70 bg-card/80">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Ajustes Gerais</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Gerencie meios de pagamento e planos/permissões.
                          </p>
                        </CardHeader>
                        <CardContent>
                          <Tabs defaultValue="pix" className="w-full">
                            <TabsList className="w-full justify-start">
                              <TabsTrigger value="pix">Meios de Pagamento</TabsTrigger>
                              <TabsTrigger value="plans">Planos e Permissões</TabsTrigger>
                            </TabsList>

                            <TabsContent value="pix" className="mt-4 space-y-4">
                              <GeneralSettingsPixPanel />
                            </TabsContent>

                            <TabsContent value="plans" className="mt-4 space-y-4">
                              <Card className="border border-border/70 bg-card/80">
                                <CardHeader>
                                  <CardTitle className="text-sm font-medium">Planos e Permissões</CardTitle>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Os valores dos planos agora são gerenciados em <strong>Meios de Pagamento</strong>.
                                  </p>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-muted-foreground">
                                    (Em breve) Ajustes de permissões por plano.
                                  </p>
                                </CardContent>
                              </Card>
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>
                    </section>
                  )}

                  {currentSection === "usuarios" && (
                    <section className="space-y-4">
                      {isUpgradeRequestsPage ? (
                        <>
                          <div className="flex items-center justify-between">
                            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/admin-master/usuarios")}>
                              Voltar
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="relative"
                              aria-label="Ir para solicitações de upgrade"
                              onClick={() => navigate("/admin-master/usuarios/solicitacoes-upgrade")}
                            >
                              <Bell className="h-4 w-4" />
                              {pendingUpgradeCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                                  {pendingUpgradeCount > 99 ? "99+" : pendingUpgradeCount}
                                </span>
                              )}
                            </Button>
                          </div>

                          <Card className="border border-border/70 bg-card/80">
                            <CardHeader>
                              <CardTitle className="text-sm font-medium">Solicitações de Upgrade</CardTitle>
                              <p className="mt-1 text-xs text-muted-foreground">Pendências de upgrade via Pix aguardando aprovação.</p>
                            </CardHeader>
                            <CardContent>
                              <div className="overflow-hidden rounded-lg border border-border/60">
                                <Table>
                                  <TableHeader className="bg-muted/40">
                                    <TableRow>
                                      <TableHead className="w-[240px]">Usuário</TableHead>
                                      <TableHead>E-mail</TableHead>
                                      <TableHead>Plano solicitado</TableHead>
                                      <TableHead>Enviado em</TableHead>
                                      <TableHead className="w-[280px] text-right">Ações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {upgradeRequestsLoading && (
                                      <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                                          Carregando solicitações...
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    {!upgradeRequestsLoading && upgradeRequests.length === 0 && (
                                      <TableRow>
                                        <TableCell colSpan={5} className="py-10 text-center text-xs text-muted-foreground">
                                          Nenhuma solicitação pendente.
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    {!upgradeRequestsLoading &&
                                      upgradeRequests.map((p) => (
                                        <TableRow key={p.id} className="hover:bg-muted/40">
                                          <TableCell className="text-sm font-medium text-foreground">{p.user_name}</TableCell>
                                          <TableCell className="text-xs text-muted-foreground">{p.user_email}</TableCell>
                                          <TableCell className="text-sm font-semibold">{p.desired_plan}</TableCell>
                                          <TableCell className="text-xs text-muted-foreground">
                                            {new Date(p.requested_at).toLocaleString("pt-BR")}
                                          </TableCell>
                                          <TableCell className="space-x-2 text-right">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="h-8"
                                              onClick={() => handleOpenReceipt(p.receipt_path)}
                                              disabled={processingPaymentId !== null && processingPaymentId !== p.id}
                                            >
                                              Ver comprovante
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              className="h-8"
                                              onClick={() => void handleApproveUpgradeRequest(p)}
                                              disabled={processingPaymentId !== null}
                                              loading={processingPaymentId === p.id}
                                            >
                                              Aprovar
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="destructive"
                                              className="h-8"
                                              onClick={() => {
                                                setUpgradeRejectReason("");
                                                setUpgradeRejectDialog({ open: true, payment: p });
                                              }}
                                              disabled={processingPaymentId !== null}
                                            >
                                              Rejeitar
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>

                          <Dialog
                            open={upgradeRejectDialog.open}
                            onOpenChange={(open) => {
                              setUpgradeRejectDialog((prev) => ({ ...prev, open }));
                              if (!open) {
                                setUpgradeRejectDialog({ open: false, payment: null });
                                setUpgradeRejectReason("");
                              }
                            }}
                          >
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Rejeitar solicitação</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2">
                                <Label htmlFor="upgrade-reject-reason">Motivo</Label>
                                <Textarea
                                  id="upgrade-reject-reason"
                                  value={upgradeRejectReason}
                                  onChange={(e) => setUpgradeRejectReason(e.target.value)}
                                  placeholder="Explique rapidamente o motivo da rejeição..."
                                />
                              </div>
                              <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setUpgradeRejectDialog({ open: false, payment: null })}>
                                  Cancelar
                                </Button>
                                <Button type="button" variant="destructive" onClick={() => void handleRejectUpgradeRequest()}>
                                  Confirmar rejeição
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      ) : (
                        <Card className="border border-border/70 bg-card/80">
                          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                            <div>
                              <CardTitle className="text-sm font-medium">Usuários (profiles)</CardTitle>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Busque por nome ou e-mail e altere rapidamente o plano entre FREE, ADVANCE e ELITE.
                              </p>
                            </div>
                            <div className="flex w-full max-w-md items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="relative"
                                aria-label="Solicitações de upgrade"
                                onClick={() => navigate("/admin-master/usuarios/solicitacoes-upgrade")}
                              >
                                <Bell className="h-4 w-4" />
                                {pendingUpgradeCount > 0 && (
                                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                                    {pendingUpgradeCount > 99 ? "99+" : pendingUpgradeCount}
                                  </span>
                                )}
                              </Button>

                              <Button
                                size="sm"
                                className="h-8 whitespace-nowrap"
                                type="button"
                                onClick={handleNovoUsuarioClick}
                              >
                                Novo usuário
                              </Button>
                              <div className="w-full max-w-xs">
                                <Label htmlFor="busca-usuarios" className="sr-only">
                                  Buscar usuários
                                </Label>
                                <Input
                                  id="busca-usuarios"
                                  placeholder="Buscar por nome ou e-mail..."
                                  value={profileSearch}
                                  onChange={(e) => setProfileSearch(e.target.value)}
                                  className="h-9 bg-background/60 text-sm placeholder:text-muted-foreground"
                                />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-hidden rounded-lg border border-border/60">
                              <Table>
                                <TableHeader className="bg-muted/40">
                                  <TableRow>
                                    <TableHead className="w-[220px]">Nome</TableHead>
                                    <TableHead>E-mail</TableHead>
                                    <TableHead className="hidden md:table-cell">Telefone</TableHead>
                                    <TableHead className="w-[210px]">Plano</TableHead>
                                    <TableHead className="hidden md:table-cell">Validade</TableHead>
                                    <TableHead className="hidden md:table-cell">Criado em</TableHead>
                                    <TableHead className="w-[150px] text-right">Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {profilesLoading && (
                                    <TableRow>
                                      <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                                        Carregando usuários...
                                      </TableCell>
                                    </TableRow>
                                  )}
                                  {!profilesLoading &&
                                    filteredProfiles.map((profile) => (
                                      <TableRow key={profile.id} className="hover:bg-muted/40">
                                        <TableCell className="font-medium">
                                          {profile.display_name ?? (profile.email ? profile.email.split("@")[0] : "—")}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                          <span className="block max-w-[220px] truncate">{profile.email ?? "—"}</span>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                          <span className="block max-w-[160px] truncate">{profile.phone ?? "—"}</span>
                                        </TableCell>
                                        <TableCell>
                                          <Select
                                            value={profile.subscription_plan}
                                            onValueChange={(value) => handleChangePlano(profile.id, value as SubscriptionPlan)}
                                          >
                                            <SelectTrigger className="h-8 w-[190px] bg-background/60 text-xs">
                                              <SelectValue placeholder="Selecionar plano" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="FREE">{PLAN_LABEL.FREE}</SelectItem>
                                              <SelectItem value="ADVANCE">{PLAN_LABEL.ADVANCE}</SelectItem>
                                              <SelectItem value="ELITE">{PLAN_LABEL.ELITE}</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                          {formatDateTimePtBr(profile.plan_expires_at)}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                          {formatDateTimePtBr(profile.created_at)}
                                        </TableCell>
                                        <TableCell className="space-x-1 text-right">
                                          <Dialog
                                            open={editUserOpen && editUserId === profile.id}
                                            onOpenChange={(open) => {
                                              setEditUserOpen(open);
                                              if (!open) {
                                                setEditUserId(null);
                                              }
                                            }}
                                          >
                                            <DialogTrigger asChild>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                type="button"
                                                onClick={() => {
                                                  setEditUserId(profile.id);
                                                  setEditDisplayName(profile.display_name ?? "");
                                                  setEditAtivo(Boolean(profile.ativo ?? true));
                                                  setEditUserOpen(true);
                                                }}
                                              >
                                                <Pencil className="h-4 w-4" />
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                              <DialogHeader>
                                                <DialogTitle>Editar usuário</DialogTitle>
                                              </DialogHeader>

                                              <div className="space-y-3">
                                                <div className="space-y-1">
                                                  <Label htmlFor="edit-display-name">Nome exibido</Label>
                                                  <Input
                                                    id="edit-display-name"
                                                    value={editDisplayName}
                                                    onChange={(e) => setEditDisplayName(e.target.value)}
                                                    placeholder="Nome que aparece no app"
                                                  />
                                                </div>

                                                <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                                                  <div className="space-y-0.5">
                                                    <p className="text-sm font-medium">Usuário ativo</p>
                                                    <p className="text-xs text-muted-foreground">
                                                      Desativado = sem acesso ao sistema.
                                                    </p>
                                                  </div>
                                                  <Switch checked={editAtivo} onCheckedChange={setEditAtivo} />
                                                </div>
                                              </div>

                                              <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setEditUserOpen(false)}>
                                                  Cancelar
                                                </Button>
                                                <Button type="button" onClick={handleUpdateUser}>
                                                  Salvar
                                                </Button>
                                              </DialogFooter>
                                            </DialogContent>
                                          </Dialog>

                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                type="button"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Tem certeza que deseja excluir {profile.display_name ?? profile.email ?? "este usuário"}? Isso
                                                  remove o usuário do Auth e do banco.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteUser(profile.id)}>
                                                  Confirmar exclusão
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>

                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                type="button"
                                              >
                                                <UserX className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Banir usuário</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Tem certeza que deseja banir {profile.display_name ?? profile.email ?? "este usuário"}? Essa
                                                  ação desativa o acesso (ativo=false).
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleBanUser(profile.id)}>
                                                  Confirmar banimento
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                                {filteredProfiles.length === 0 && (
                                  <TableCaption className="py-6 text-xs text-muted-foreground">
                                    Nenhum usuário encontrado para o termo pesquisado.
                                  </TableCaption>
                                )}
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </section>
                  )}

                  {currentSection === "pagamentos" && (
                    <section className="space-y-4">
                      <Card className="border border-border/70 bg-card/80">
                        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <CardTitle className="text-sm font-medium">Pagamentos (Pix)</CardTitle>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Analise solicitações de upgrade via Pix, visualize comprovantes e aprove/rejeite.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Label htmlFor="filter-pagamentos" className="sr-only">
                              Filtro de status
                            </Label>
                            <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentStatusFilter)}>
                              <SelectTrigger id="filter-pagamentos" className="h-9 w-[220px] bg-background/60 text-sm">
                                <SelectValue placeholder="Filtrar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="pending">Pendentes</SelectItem>
                                <SelectItem value="approved">Aprovados</SelectItem>
                                <SelectItem value="rejected">Rejeitados</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-hidden rounded-lg border border-border/60">
                            <Table>
                              <TableHeader className="bg-muted/40">
                                <TableRow>
                                  <TableHead className="w-[260px]">Usuário</TableHead>
                                  <TableHead>Plano desejado</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Solicitado em</TableHead>
                                  <TableHead className="w-[220px]">Comprovante</TableHead>
                                  <TableHead className="w-[220px] text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paymentsLoading && (
                                  <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                                      Carregando pagamentos...
                                    </TableCell>
                                  </TableRow>
                                )}

                                {!paymentsLoading && payments.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                                      Nenhum pagamento encontrado.
                                    </TableCell>
                                  </TableRow>
                                )}

                                {!paymentsLoading &&
                                  payments.map((p) => (
                                    <TableRow key={p.id} className="hover:bg-muted/40">
                                      <TableCell>
                                        <div className="space-y-0.5">
                                          <p className="text-sm font-medium text-foreground">{p.user_name}</p>
                                          <p className="text-xs text-muted-foreground">{p.user_email}</p>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm font-semibold">{p.desired_plan}</TableCell>
                                      <TableCell>
                                        <Badge variant={statusBadgeVariant(p.status)} className="text-[10px] uppercase tracking-wide">
                                          {p.status}
                                        </Badge>
                                        {p.status === "rejected" && p.rejection_reason && (
                                          <p className="mt-1 text-[11px] text-muted-foreground">Motivo: {p.rejection_reason}</p>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground">
                                        {new Date(p.requested_at).toLocaleString("pt-BR")}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-8"
                                          onClick={() => handleOpenReceipt(p.receipt_path)}
                                          disabled={processingPaymentId !== null && processingPaymentId !== p.id}
                                        >
                                          Ver / Baixar
                                        </Button>
                                        {p.reviewed_receipt_path && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="ml-2 h-8"
                                            onClick={() => handleOpenReceipt(p.reviewed_receipt_path as string)}
                                            disabled={processingPaymentId !== null && processingPaymentId !== p.id}
                                          >
                                            Revisado
                                          </Button>
                                        )}
                                      </TableCell>
                                      <TableCell className="space-x-2 text-right">
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="h-8"
                                          onClick={() => {
                                            setReviewedReceiptFile(null);
                                            setApproveDialog({ open: true, payment: p });
                                          }}
                                          disabled={p.status !== "pending" || processingPaymentId === p.id}
                                          loading={processingPaymentId === p.id}
                                        >
                                          Aprovar
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="destructive"
                                          className="h-8"
                                          onClick={() => {
                                            setRejectReason("");
                                            setRejectDialog({ open: true, paymentId: p.id });
                                          }}
                                          disabled={p.status !== "pending" || processingPaymentId !== null}
                                        >
                                          Rejeitar
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-border/70 bg-card/80">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Auditoria (aprovações/rejeições)</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">Últimas ações administrativas registradas.</p>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-hidden rounded-lg border border-border/60">
                            <Table>
                              <TableHeader className="bg-muted/40">
                                <TableRow>
                                  <TableHead>Quando</TableHead>
                                  <TableHead>Admin</TableHead>
                                  <TableHead>Ação</TableHead>
                                  <TableHead>Detalhes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {auditLoading && (
                                  <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                                      Carregando auditoria...
                                    </TableCell>
                                  </TableRow>
                                )}
                                {!auditLoading && auditRows.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={4} className="py-10 text-center text-xs text-muted-foreground">
                                      Nenhuma ação registrada ainda.
                                    </TableCell>
                                  </TableRow>
                                )}
                                {!auditLoading &&
                                  auditRows.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-muted/40">
                                      <TableCell className="text-xs text-muted-foreground">
                                        {new Date(row.created_at).toLocaleString("pt-BR")}
                                      </TableCell>
                                      <TableCell className="text-xs text-foreground">{row.actor_email}</TableCell>
                                      <TableCell className="text-xs font-medium text-foreground">{row.action}</TableCell>
                                      <TableCell className="text-xs text-muted-foreground">
                                        {(row.details?.desired_plan && `plano=${row.details.desired_plan}`) || "—"}
                                        {row.details?.rejection_reason ? ` | motivo=${row.details.rejection_reason}` : ""}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Dialog
                        open={rejectDialog.open}
                        onOpenChange={(open) => {
                          setRejectDialog({ open, paymentId: open ? rejectDialog.paymentId : null });
                          if (!open) {
                            setRejectReason("");
                            setRejectReviewedReceiptFile(null);
                          }
                        }}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rejeitar pagamento</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Label htmlFor="reject-reason">Motivo</Label>
                            <Textarea
                              id="reject-reason"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Explique brevemente o motivo da rejeição (ex: comprovante ilegível)."
                            />
                            <div className="space-y-1.5 pt-2">
                              <Label htmlFor="reject-reviewed-receipt">Comprovante revisado (opcional)</Label>
                              <Input
                                id="reject-reviewed-receipt"
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => setRejectReviewedReceiptFile(e.target.files?.[0] ?? null)}
                                className="bg-background/60 text-sm"
                              />
                              <p className="text-[11px] text-muted-foreground">
                                Se anexar, ele ficará disponível para admins como “Revisado”.
                              </p>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              O motivo será mostrado ao aluno na tela “Meu plano”.
                            </p>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRejectDialog({ open: false, paymentId: null })}>
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={handleRejectPayment}
                              loading={processingPaymentId === rejectDialog.paymentId}
                            >
                              Confirmar rejeição
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={approveDialog.open}
                        onOpenChange={(open) => {
                          setApproveDialog({ open, payment: open ? approveDialog.payment : null });
                          if (!open) setReviewedReceiptFile(null);
                        }}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Aprovar pagamento</DialogTitle>
                          </DialogHeader>

                          <div className="space-y-3">
                            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground">Usuário</p>
                              <p className="text-sm font-medium text-foreground">{approveDialog.payment?.user_name ?? "—"}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Plano solicitado: {approveDialog.payment?.desired_plan ?? "—"}</p>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="approve-reviewed-receipt">Comprovante revisado (opcional)</Label>
                              <Input
                                id="approve-reviewed-receipt"
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => setReviewedReceiptFile(e.target.files?.[0] ?? null)}
                                className="bg-background/60 text-sm"
                              />
                              <p className="text-[11px] text-muted-foreground">
                                Se anexar, ficará salvo e acessível no botão “Revisado”.
                              </p>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setApproveDialog({ open: false, payment: null })}>
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              onClick={async () => {
                                if (!approveDialog.payment) return;
                                await handleApprovePayment(approveDialog.payment, reviewedReceiptFile);
                                setApproveDialog({ open: false, payment: null });
                                setReviewedReceiptFile(null);
                              }}
                              loading={processingPaymentId === approveDialog.payment?.id}
                              disabled={!approveDialog.payment || (approveDialog.payment.status !== "pending")}
                            >
                              Confirmar aprovação
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </section>
                  )}

                  {currentSection === "marketplace" && (
                    <section className="space-y-4">
                      <Card className="border border-border/70 bg-card/80">
                        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <CardTitle className="text-sm font-medium">Lojas (stores + store_users)</CardTitle>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Cadastre novas lojas e vincule um usuário dono com papel <code className="font-mono">store_owner</code>.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 whitespace-nowrap"
                            onClick={() => setShowNewStoreForm((prev) => !prev)}
                          >
                            {showNewStoreForm ? "Fechar cadastro" : "Cadastrar nova loja"}
                          </Button>
                        </CardHeader>
                        {showNewStoreForm && (
                          <CardContent className="border-t border-border/60 pt-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label htmlFor="store-name">Nome da loja</Label>
                                <Input
                                  id="store-name"
                                  value={newStore.name}
                                  onChange={(e) => setNewStore((prev) => ({ ...prev, name: e.target.value }))}
                                  className="bg-background/60 text-sm"
                                  placeholder="Ex: Bio Suplementos Premium"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="store-type">Tipo de loja</Label>
                                <Select
                                  value={newStore.storeType}
                                  onValueChange={(value) =>
                                    setNewStore((prev) => ({ ...prev, storeType: value as typeof newStore.storeType }))
                                  }
                                >
                                  <SelectTrigger id="store-type" className="bg-background/60 text-sm">
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="suplementos">Suplementos</SelectItem>
                                    <SelectItem value="artigos_esportivos">Artigos esportivos</SelectItem>
                                    <SelectItem value="roupas_fitness">Roupas fitness</SelectItem>
                                    <SelectItem value="comidas_fitness">Comidas Fitness</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="store-description">Descrição</Label>
                                <Textarea
                                  id="store-description"
                                  value={newStore.description}
                                  onChange={(e) => setNewStore((prev) => ({ ...prev, description: e.target.value }))}
                                  className="min-h-[72px] bg-background/60 text-sm"
                                  placeholder="Breve resumo da loja e principais produtos ou serviços."
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="store-owner-email">E-mail do lojista (novo cadastro)</Label>
                                <Input
                                  id="store-owner-email"
                                  type="email"
                                  value={newStore.ownerEmail}
                                  onChange={(e) => setNewStore((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                                  className="bg-background/60 text-sm"
                                  placeholder="email@lojista.com"
                                />
                                <p className="pt-1 text-[11px] text-muted-foreground">
                                  O e-mail <strong>não pode</strong> ser de um aluno existente. Uma conta nova será criada exclusivamente para o lojista.
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="store-owner-password">Senha do lojista</Label>
                                <Input
                                  id="store-owner-password"
                                  type="password"
                                  value={newStore.ownerPassword}
                                  onChange={(e) => setNewStore((prev) => ({ ...prev, ownerPassword: e.target.value }))}
                                  className="bg-background/60 text-sm"
                                  placeholder="Mínimo de 6 caracteres"
                                />
                                <p className="pt-1 text-[11px] text-muted-foreground">
                                  Defina a senha inicial. O lojista poderá alterá-la posteriormente.
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="store-cnpj">CNPJ</Label>
                                <Input
                                  id="store-cnpj"
                                  value={newStore.cnpj}
                                  onChange={(e) => setNewStore((prev) => ({ ...prev, cnpj: e.target.value }))}
                                  className="bg-background/60 text-sm"
                                  placeholder="00.000.000/0001-00"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="store-whatsapp">WhatsApp</Label>
                                <Input
                                  id="store-whatsapp"
                                  value={newStore.whatsapp}
                                  onChange={(e) => setNewStore((prev) => ({ ...prev, whatsapp: e.target.value }))}
                                  className="bg-background/60 text-sm"
                                  placeholder="Ex: 11999999999"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="store-profile-image">Foto de perfil da loja</Label>
                                <Input
                                  id="store-profile-image"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setNewStore((prev) => ({ ...prev, profileImageFile: file }));
                                  }}
                                  className="bg-background/60 text-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="store-banner-image">Banner da loja</Label>
                                <Input
                                  id="store-banner-image"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    setNewStore((prev) => ({ ...prev, bannerImageFile: file }));
                                  }}
                                  className="bg-background/60 text-sm"
                                />
                                <p className="pt-1 text-[11px] text-muted-foreground">
                                  Formato recomendado: 16:9 (ex: 1200×675px).
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => setShowNewStoreForm(false)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={handleCreateStoreWithOwner}
                                disabled={isCreatingStore}
                              >
                                {isCreatingStore ? "Cadastrando..." : "Salvar loja"}
                              </Button>
                            </div>
                          </CardContent>
                        )}
                      </Card>

                      <Card className="border border-border/70 bg-card/80">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Lojas internas (stores)</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Edite dados básicos, exclua e ative/desative o acesso de lojistas pela coluna <code className="font-mono">is_active</code>.
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-hidden rounded-lg border border-border/60">
                            <Table>
                              <TableHeader className="bg-muted/40">
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Criada em</TableHead>
                                  <TableHead className="w-[260px] text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {internalStores.map((store) => (
                                  <TableRow key={store.id} className="hover:bg-muted/40">
                                    <TableCell className="font-medium">{store.name}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{store.store_type}</TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={
                                          store.is_active
                                            ? "border-primary/30 bg-primary/5 text-[10px] font-semibold uppercase tracking-wide text-primary"
                                            : "border-destructive/40 bg-destructive/5 text-[10px] font-semibold uppercase tracking-wide text-destructive"
                                        }
                                      >
                                        {store.is_active ? "Ativa" : "Desativada"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {new Date(store.created_at).toLocaleDateString("pt-BR")}
                                    </TableCell>
                                    <TableCell className="space-x-2 text-right">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-border/60 bg-background/60 text-xs"
                                        onClick={async () => {
                                          setEditStoreForm({
                                            name: store.name,
                                            store_type: store.store_type,
                                            description: store.description || "",
                                          });
                                          // Fetch marketplace store data for images
                                          const { data: mkStore } = await supabase
                                            .from("marketplace_stores")
                                            .select("id, profile_image_url, banner_image_url")
                                            .eq("nome", store.name)
                                            .maybeSingle();
                                          setEditStoreMarketplaceId(mkStore?.id ?? null);
                                          setEditStoreProfileUrl(mkStore?.profile_image_url ?? null);
                                          setEditStoreBannerUrl(mkStore?.banner_image_url ?? null);
                                          setEditingStore(store);
                                        }}
                                      >
                                        Editar
                                      </Button>

                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 border-destructive/60 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/20"
                                          >
                                            Excluir
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir loja</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Esta ação é irreversível. A loja será removida da tabela <code className="font-mono">stores</code> e os vínculos
                                              com usuários serão apagados.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => {
                                                void (async () => {
                                                  const { error } = await supabase.from("stores").delete().eq("id", store.id);

                                                  if (error) {
                                                    toast({
                                                      title: "Erro ao excluir loja",
                                                      description: error.message,
                                                      variant: "destructive",
                                                    });
                                                    return;
                                                  }

                                                  setInternalStores((prev) => prev.filter((s) => s.id !== store.id));
                                                  toast({
                                                    title: "Loja excluída",
                                                    description: "A loja foi removida com sucesso.",
                                                  });
                                                })();
                                              }}
                                            >
                                              Confirmar exclusão
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>

                                      <div className="inline-flex items-center gap-2 align-middle">
                                        <span className="text-[11px] text-muted-foreground">{store.is_active ? "Ativa" : "Banida"}</span>
                                        <Switch
                                          checked={store.is_active}
                                          onCheckedChange={(checked) => {
                                            void (async () => {
                                              const { error } = await supabase
                                                .from("stores")
                                                .update({ is_active: checked })
                                                .eq("id", store.id);

                                              if (error) {
                                                toast({
                                                  title: "Erro ao atualizar status",
                                                  description: error.message,
                                                  variant: "destructive",
                                                });
                                                return;
                                              }

                                              setInternalStores((prev) =>
                                                prev.map((s) => (s.id === store.id ? { ...s, is_active: checked } : s)),
                                              );
                                              toast({
                                                title: checked ? "Loja reativada" : "Loja desativada",
                                                description: checked
                                                  ? "O acesso do lojista foi reativado."
                                                  : "O acesso do lojista foi desativado (banido).",
                                              });
                                            })();
                                          }}
                                        />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                              {internalStores.length === 0 && (
                                <TableCaption className="py-6 text-xs text-muted-foreground">
                                  Nenhuma loja interna cadastrada ainda.
                                </TableCaption>
                              )}
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      {/* ── Edit Store Dialog ── */}
                      <Dialog open={!!editingStore} onOpenChange={(open) => { if (!open) setEditingStore(null); }}>
                        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Editar Loja</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            {/* Images */}
                            {editStoreMarketplaceId && (
                              <StoreImageEditor
                                storeId={editStoreMarketplaceId}
                                currentProfileUrl={editStoreProfileUrl}
                                currentBannerUrl={editStoreBannerUrl}
                                onImagesUpdated={(p, b) => {
                                  setEditStoreProfileUrl(p);
                                  setEditStoreBannerUrl(b);
                                }}
                              />
                            )}
                            <div className="space-y-2">
                              <Label>Nome da Loja</Label>
                              <Input
                                value={editStoreForm.name}
                                onChange={(e) => setEditStoreForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Nome da loja"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo da Loja</Label>
                              <Select
                                value={editStoreForm.store_type}
                                onValueChange={(v) => setEditStoreForm((f) => ({ ...f, store_type: v }))}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="suplementos">Suplementos</SelectItem>
                                  <SelectItem value="artigos_esportivos">Artigos Esportivos</SelectItem>
                                  <SelectItem value="roupas_fitness">Roupas Fitness</SelectItem>
                                  <SelectItem value="comidas_fitness">Comidas Fitness</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Descrição</Label>
                              <Textarea
                                value={editStoreForm.description}
                                onChange={(e) => setEditStoreForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Descrição da loja (opcional)"
                                rows={3}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setEditingStore(null)} disabled={isSavingStore}>
                              Cancelar
                            </Button>
                            <Button
                              disabled={isSavingStore || !editStoreForm.name.trim()}
                              onClick={() => {
                                if (!editingStore) return;
                                void (async () => {
                                  setIsSavingStore(true);
                                  try {
                                    const updates = {
                                      name: editStoreForm.name.trim(),
                                      store_type: editStoreForm.store_type,
                                      description: editStoreForm.description.trim() || null,
                                    };

                                    const { error } = await supabase
                                      .from("stores")
                                      .update(updates)
                                      .eq("id", editingStore.id);

                                    if (error) {
                                      toast({ title: "Erro ao editar loja", description: error.message, variant: "destructive" });
                                      return;
                                    }

                                    // Also update marketplace_stores if exists
                                    await supabase
                                      .from("marketplace_stores")
                                      .update({ nome: updates.name, store_type: updates.store_type, descricao: updates.description })
                                      .eq("nome", editingStore.name);

                                    setInternalStores((prev) =>
                                      prev.map((s) => (s.id === editingStore.id ? { ...s, ...updates } : s)),
                                    );
                                    setEditingStore(null);
                                    toast({ title: "Loja atualizada", description: "Dados da loja salvos com sucesso." });
                                  } finally {
                                    setIsSavingStore(false);
                                  }
                                })();
                              }}
                            >
                              {isSavingStore ? "Salvando…" : "Salvar"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                    </section>
                  )}


                  {currentSection === "telemedicina" && (
                    <section className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                        <Card className="border border-border/70 bg-card/80">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">Novo serviço de telemedicina</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="servico-nome">Nome</Label>
                              <Input
                                id="servico-nome"
                                value={novoServico.nome}
                                onChange={(e) =>
                                  setNovoServico((prev) => ({
                                    ...prev,
                                    nome: e.target.value,
                                    icone: getIconForServiceName(e.target.value),
                                  }))
                                }
                                placeholder="Ex: Consulta com Nutricionista"
                                className="bg-background/60 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="servico-slug">Slug</Label>
                              <Input
                                id="servico-slug"
                                value={novoServico.slug}
                                onChange={(e) => setNovoServico((prev) => ({ ...prev, slug: e.target.value }))}
                                placeholder="ex: consulta-nutricionista"
                                className="bg-background/60 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Ícone sugerido</Label>
                              <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {novoServico.icone && TELEMED_ICON_COMPONENTS[novoServico.icone] && (
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                                      {(() => {
                                        const IconComp = TELEMED_ICON_COMPONENTS[novoServico.icone!];
                                        return <IconComp className="h-4 w-4" aria-hidden="true" />;
                                      })()}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-muted-foreground">
                                    {novoServico.icone
                                      ? novoServico.icone
                                      : "Ícone será definido automaticamente a partir do nome."}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="servico-icone-arquivo">Ícone (SVG ou PNG)</Label>
                              <Input
                                id="servico-icone-arquivo"
                                type="file"
                                accept=".png,.svg,image/png,image/svg+xml"
                                className="bg-background/60 text-xs"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                  const file = e.target.files?.[0] ?? null;

                                  if (!file) {
                                    setNovoServicoIconFile(null);
                                    return;
                                  }

                                  const validTypes = ["image/png", "image/svg+xml"];

                                  if (!validTypes.includes(file.type)) {
                                    toast({
                                      title: "Formato inválido",
                                      description: "Envie um arquivo SVG ou PNG.",
                                      variant: "destructive",
                                    });
                                    e.target.value = "";
                                    setNovoServicoIconFile(null);
                                    return;
                                  }

                                  setNovoServicoIconFile(file);
                                }}
                              />
                              <p className="text-[10px] text-muted-foreground">
                                Opcional. Se não enviar, um ícone padrão será usado no app do aluno.
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border border-border/70 bg-card/80">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">Serviços cadastrados</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-hidden rounded-lg border border-border/60">
                              <Table>
                                <TableHeader className="bg-muted/40">
                                  <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Ícone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[200px] text-right">Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {servicos.map((s) => {
                                    const isEditing = editingServicoId === s.id;
                                    const current =
                                      isEditing && editingServico
                                        ? editingServico
                                        : {
                                          nome: s.nome,
                                          slug: s.slug,
                                          icone: s.icone,
                                          icon_url: s.icon_url,
                                          ativo: s.ativo ?? true,
                                        };
                                    const IconComp = current.icone ? TELEMED_ICON_COMPONENTS[current.icone] : null;

                                    return (
                                      <TableRow key={s.id} className="hover:bg-muted/40">
                                        <TableCell>
                                          {isEditing ? (
                                            <Input
                                              value={current.nome}
                                              onChange={(e) =>
                                                setEditingServico((prev) =>
                                                  prev
                                                    ? { ...prev, nome: e.target.value }
                                                    : {
                                                      nome: e.target.value,
                                                      slug: s.slug,
                                                      icone: s.icone,
                                                      ativo: s.ativo ?? true,
                                                    },
                                                )
                                              }
                                              className="h-8 bg-background/60 text-xs"
                                            />
                                          ) : (
                                            s.nome
                                          )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                          {isEditing ? (
                                            <Input
                                              value={current.slug}
                                              onChange={(e) =>
                                                setEditingServico((prev) =>
                                                  prev
                                                    ? { ...prev, slug: e.target.value }
                                                    : {
                                                      nome: s.nome,
                                                      slug: e.target.value,
                                                      icone: s.icone,
                                                      ativo: s.ativo ?? true,
                                                    },
                                                )
                                              }
                                              className="h-8 bg-background/60 text-xs"
                                            />
                                          ) : (
                                            s.slug
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-3">
                                            {s.icon_url ? (
                                              <img
                                                src={s.icon_url}
                                                alt={`Ícone do serviço ${s.nome}`}
                                                className="h-8 w-8 rounded bg-background/60 object-contain"
                                              />
                                            ) : IconComp ? (
                                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <IconComp className="h-4 w-4" aria-hidden="true" />
                                              </span>
                                            ) : null}
                                            {isEditing && (
                                              <div className="flex flex-1 flex-col gap-1 text-[10px]">
                                                <Input
                                                  type="file"
                                                  accept=".png,.svg,image/png,image/svg+xml"
                                                  className="h-8 bg-background/60 text-[10px]"
                                                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                    const file = e.target.files?.[0] ?? null;

                                                    if (!file) {
                                                      setEditingServicoIconFile(null);
                                                      return;
                                                    }

                                                    const validTypes = ["image/png", "image/svg+xml"];

                                                    if (!validTypes.includes(file.type)) {
                                                      toast({
                                                        title: "Formato inválido",
                                                        description: "Envie um arquivo SVG ou PNG.",
                                                        variant: "destructive",
                                                      });
                                                      e.target.value = "";
                                                      setEditingServicoIconFile(null);
                                                      return;
                                                    }

                                                    setEditingServicoIconFile(file);
                                                  }}
                                                />
                                                <span className="text-muted-foreground">
                                                  Envie um novo ícone (SVG/PNG). Deixe em branco para manter o atual.
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2 text-xs">
                                            <Switch
                                              checked={current.ativo}
                                              onCheckedChange={(checked) =>
                                                setEditingServico((prev) =>
                                                  prev
                                                    ? { ...prev, ativo: checked }
                                                    : {
                                                      nome: s.nome,
                                                      slug: s.slug,
                                                      icone: s.icone,
                                                      ativo: checked,
                                                    },
                                                )
                                              }
                                              disabled={!isEditing}
                                            />
                                            <span className={current.ativo ? "text-emerald-500" : "text-destructive"}>
                                              {current.ativo ? "Ativo" : "Inativo"}
                                            </span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            {isEditing ? (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-8 text-xs"
                                                  onClick={handleCancelEditServico}
                                                >
                                                  Cancelar
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  className="h-8 text-xs"
                                                  onClick={handleSaveEditServico}
                                                >
                                                  Salvar
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-8 text-xs"
                                                  onClick={() => handleStartEditServico(s)}
                                                >
                                                  Editar
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-8 border-destructive/60 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/20"
                                                  onClick={() => handleDeleteServico(s.id)}
                                                >
                                                  Remover
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                                {servicos.length === 0 && (
                                  <TableCaption className="py-6 text-xs text-muted-foreground">
                                    Nenhum serviço cadastrado até o momento.
                                  </TableCaption>
                                )}
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                        <Card className="border border-border/70 bg-card/80">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">Novo profissional</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="prof-nome">Nome</Label>
                              <Input
                                id="prof-nome"
                                value={novoProfissional.nome}
                                onChange={(e) => setNovoProfissional((prev) => ({ ...prev, nome: e.target.value }))}
                                placeholder="Ex: Dra. Ana Silva"
                                className="bg-background/60 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="prof-crm">CRM/CRP</Label>
                              <Input
                                id="prof-crm"
                                value={novoProfissional.crm_crp}
                                onChange={(e) => setNovoProfissional((prev) => ({ ...prev, crm_crp: e.target.value }))}
                                placeholder="CRM 12345 / CRP 0000"
                                className="bg-background/60 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="prof-bio">Bio</Label>
                              <Textarea
                                id="prof-bio"
                                value={novoProfissional.bio}
                                onChange={(e) => setNovoProfissional((prev) => ({ ...prev, bio: e.target.value }))}
                                placeholder="Resumo profissional, especialidades e foco de atuação."
                                className="min-h-[70px] bg-background/60 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="prof-foto">URL da foto</Label>
                              <Input
                                id="prof-foto"
                                value={novoProfissional.foto_url}
                                onChange={(e) => setNovoProfissional((prev) => ({ ...prev, foto_url: e.target.value }))}
                                placeholder="https://..."
                                className="bg-background/60 text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label htmlFor="prof-preco">Preço base (R$)</Label>
                                <Input
                                  id="prof-preco"
                                  type="number"
                                  min={0}
                                  step={10}
                                  value={novoProfissional.preco_base}
                                  onChange={(e) =>
                                    setNovoProfissional((prev) => ({ ...prev, preco_base: e.target.value }))
                                  }
                                  placeholder="200"
                                  className="bg-background/60 text-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="prof-servico">Serviço</Label>
                                <Select
                                  value={novoProfissional.servico_id}
                                  onValueChange={(value) =>
                                    setNovoProfissional((prev) => ({ ...prev, servico_id: value }))
                                  }
                                >
                                  <SelectTrigger id="prof-servico" className="bg-background/60 text-sm">
                                    <SelectValue placeholder="Selecionar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {servicos.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button className="mt-2 w-full" onClick={handleCreateProfissional}>
                              Salvar profissional
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="border border-border/70 bg-card/80">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">Profissionais cadastrados</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-hidden rounded-lg border border-border/60">
                              <Table>
                                <TableHeader className="bg-muted/40">
                                  <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>CRM/CRP</TableHead>
                                    <TableHead>Serviço</TableHead>
                                    <TableHead>Preço base</TableHead>
                                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {profissionais.map((p) => {
                                    const servico = servicos.find((s) => s.id === p.servico_id);
                                    return (
                                      <TableRow key={p.id} className="hover:bg-muted/40">
                                        <TableCell>{p.nome}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{p.crm_crp ?? "-"}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{servico?.nome ?? "-"}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                          {p.preco_base !== null
                                            ? p.preco_base.toLocaleString("pt-BR", {
                                              style: "currency",
                                              currency: "BRL",
                                            })
                                            : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 border-destructive/60 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/20"
                                            onClick={() => handleDeleteProfissional(p.id)}
                                          >
                                            Remover
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                                {profissionais.length === 0 && (
                                  <TableCaption className="py-6 text-xs text-muted-foreground">
                                    Nenhum profissional cadastrado até o momento.
                                  </TableCaption>
                                )}
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </section>
                  )}

                  {currentSection === "precificacao" && (
                    <section className="space-y-4">
                      <Card className="border border-border/70 bg-card/80">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Central de Precificação</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Gerencie todas as configurações de preços e cobranças da plataforma
                          </p>
                        </CardHeader>
                        <CardContent>
                          <Tabs defaultValue="planos" className="w-full">
                            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/30 p-1">
                              <TabsTrigger value="planos" className="text-xs">Planos</TabsTrigger>
                              <TabsTrigger value="profissionais" className="text-xs">Profissionais</TabsTrigger>
                              <TabsTrigger value="marketplace" className="text-xs">Marketplace</TabsTrigger>
                              <TabsTrigger value="pix" className="text-xs">PIX Configs</TabsTrigger>
                              <TabsTrigger value="saques" className="text-xs">Saques</TabsTrigger>
                            </TabsList>

                            <TabsContent value="planos" className="mt-4">
                              <PlanConfigEditor />
                            </TabsContent>

                            <TabsContent value="profissionais" className="mt-4">
                              <ProfessionalPricingConfig />
                            </TabsContent>

                            <TabsContent value="marketplace" className="mt-4">
                              <HighlightOffersManager />
                            </TabsContent>

                            <TabsContent value="pix" className="mt-4">
                              <PixConfigManager />
                            </TabsContent>

                            <TabsContent value="saques" className="mt-4">
                              <WithdrawalRequestsManager />
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>
                    </section>
                  )}

                  {currentSection === "dr-bio" && (
                    <section className="space-y-4">
                      <Card className="border border-border/70 bg-card/80">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Configurações do Agente Dr. Bio</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Gerencie a integração do nutricionista virtual com provedores externos de nutrição e ajuste a
                            personalidade do agente.
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-6 text-sm">
                          {/* 1. Gateway de API */}
                          <div className="space-y-3">
                            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Gateway de API
                            </h2>
                            <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
                              <div className="space-y-3">
                                <div className="space-y-1.5">
                                  <Label htmlFor="drbio-provider" className="text-xs font-medium text-muted-foreground">
                                    Provedor de nutrição
                                  </Label>
                                  <Select
                                    value={aiProvider}
                                    onValueChange={(value) =>
                                      setAiProvider(value as "api_ninjas_nutrition" | "openai_vision" | "custom_endpoint")
                                    }
                                    disabled={loadingAiConfig}
                                  >
                                    <SelectTrigger id="drbio-provider" className="h-9 bg-background/60 text-xs">
                                      <SelectValue placeholder="Selecione o provedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="api_ninjas_nutrition">API-Ninjas Nutrition</SelectItem>
                                      <SelectItem value="openai_vision">OpenAI Vision (fotos)</SelectItem>
                                      <SelectItem value="custom_endpoint">Endpoint personalizado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <p className="text-[11px] text-muted-foreground">
                                    Escolha qual backend de nutrição o Dr. Bio deve usar quando precisar de dados
                                    quantitativos (calorias, macros etc.).
                                  </p>
                                </div>

                                <div className="space-y-1.5">
                                  <Label htmlFor="drbio-api-key" className="text-xs font-medium text-muted-foreground">
                                    X-Api-Key do provedor
                                  </Label>
                                  <div className="relative">
                                    <Input
                                      id="drbio-api-key"
                                      type={showAiApiKey ? "text" : "password"}
                                      autoComplete="off"
                                      value={aiApiKey}
                                      onChange={(e) => setAiApiKey(e.target.value)}
                                      disabled={loadingAiConfig || savingAiConfig}
                                      className="bg-background/60 pr-10 text-sm"
                                      placeholder="Cole aqui a chave secreta de nutrição"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowAiApiKey((prev) => !prev)}
                                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                                      aria-label={showAiApiKey ? "Ocultar chave" : "Mostrar chave"}
                                    >
                                      {showAiApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    Esta chave é armazenada de forma segura em <code>config_ai_agents</code> e só é lida por
                                    funções de backend.
                                  </p>
                                </div>

                                <div className="space-y-1.5">
                                  <Label htmlFor="drbio-base-url" className="text-xs font-medium text-muted-foreground">
                                    Endpoint base para consultas nutricionais
                                  </Label>
                                  <Input
                                    id="drbio-base-url"
                                    type="text"
                                    value={aiBaseUrl}
                                    onChange={(e) => setAiBaseUrl(e.target.value)}
                                    disabled={loadingAiConfig || savingAiConfig}
                                    className="bg-background/60 text-xs"
                                    placeholder="https://api.api-ninjas.com/v1/nutrition?query="
                                  />
                                  <p className="text-[11px] text-muted-foreground">
                                    URL base utilizada quando o agente precisar consultar por exemplo "450g de peito bovino".
                                  </p>
                                </div>
                              </div>

                              {/* Sandbox */}
                              <div className="space-y-2 rounded-md border border-border/60 bg-background/60 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                      Testar Dr. Bio
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground">
                                      Envie uma pergunta de comida e veja a resposta formatada da IA.
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 px-3 text-xs"
                                    onClick={handleTestDrBio}
                                    loading={testLoading}
                                    disabled={loadingAiConfig || savingAiConfig}
                                  >
                                    Executar teste
                                  </Button>
                                </div>

                                <div className="space-y-1.5">
                                  <Label htmlFor="drbio-test-prompt" className="text-xs font-medium text-muted-foreground">
                                    Entrada de teste
                                  </Label>
                                  <Input
                                    id="drbio-test-prompt"
                                    value={testPrompt}
                                    onChange={(e) => setTestPrompt(e.target.value)}
                                    placeholder="Ex: 450g de peito bovino"
                                    className="h-9 bg-background/80 text-xs"
                                  />
                                </div>

                                {testError && (
                                  <p className="text-[11px] text-destructive">{testError}</p>
                                )}

                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <Label className="text-[11px] font-medium text-muted-foreground">
                                      Resposta bruta do gateway de IA (SSE)
                                    </Label>
                                    <Textarea
                                      readOnly
                                      value={testRawGatewayResponse}
                                      className="min-h-[120px] bg-background/80 text-[11px] font-mono"
                                      placeholder="Será exibido aqui o JSON bruto recebido via streaming."
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[11px] font-medium text-muted-foreground">
                                      Resposta formatada do Dr. Bio
                                    </Label>
                                    <Textarea
                                      readOnly
                                      value={testAiResponse}
                                      className="min-h-[120px] bg-background/80 text-[11px]"
                                      placeholder="Resposta de texto do agente baseada nas configurações atuais."
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Mensagens e personalidade */}
                          <div className="space-y-3 border-t border-border/60 pt-4">
                            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Mensagens e personalidade
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label htmlFor="drbio-system-context" className="text-xs font-medium text-muted-foreground">
                                  Contexto do agente (persona)
                                </Label>
                                <Textarea
                                  id="drbio-system-context"
                                  value={aiSystemContext}
                                  onChange={(e) => setAiSystemContext(e.target.value)}
                                  rows={6}
                                  className="bg-background/60 text-xs"
                                  placeholder="Ex: Você é um nutricionista profissional especialista em esportes de alto rendimento..."
                                />
                                <p className="text-[11px] text-muted-foreground">
                                  Texto que será sempre colocado antes do sistema padrão do Dr. Bio, definindo tom de voz e
                                  persona.
                                </p>
                              </div>

                              <div className="space-y-1.5">
                                <Label
                                  htmlFor="drbio-instructions-layer"
                                  className="text-xs font-medium text-muted-foreground"
                                >
                                  Camada de instruções para dados da API
                                </Label>
                                <Textarea
                                  id="drbio-instructions-layer"
                                  value={aiInstructions}
                                  onChange={(e) => setAiInstructions(e.target.value)}
                                  rows={6}
                                  className="bg-background/60 text-xs"
                                  placeholder="Ex: Formate sempre a resposta usando as calorias e macros fornecidas pela API externa..."
                                />
                                <p className="text-[11px] text-muted-foreground">
                                  Instruções adicionais sobre como o agente deve consumir e explicar os dados vindos do
                                  provedor externo.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                            <p className="text-[11px] text-muted-foreground">
                              As alterações são aplicadas imediatamente nas próximas conversas do Dr. Bio.
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={handleSaveAiConfig}
                                loading={savingAiConfig}
                                disabled={loadingAiConfig}
                              >
                                Salvar Conteúdo Dr. Bio
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 bg-primary text-primary-foreground text-xs hover:bg-primary/90"
                                onClick={handleSaveAiConfig}
                                loading={savingAiConfig}
                                disabled={loadingAiConfig}
                              >
                                Recarregar e Atualizar Agente
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </section>
                  )}
                </div>
              </>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

const AdminMasterPage = () => (
  <SidebarProvider>
    <AdminMasterContent />
  </SidebarProvider>
);

export default AdminMasterPage;
