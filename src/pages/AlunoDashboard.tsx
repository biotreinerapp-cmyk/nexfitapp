import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Dumbbell,
  ShoppingBag,
  UtensilsCrossed,
  User as UserIcon,
  Bell,
  LogOut,
  Lock,
  Stethoscope,
  Trophy,
  Skull,
  Users,
  HeartPulse,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logoNexfit from "@/assets/nexfit-logo.png";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { HubServiceButton } from "@/components/dashboard/HubServiceButton";
import { GreetingCard } from "@/components/dashboard/GreetingCard";
import { DashboardOutdoorBillboard } from "@/components/dashboard/DashboardOutdoorBillboard";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { getFriendlySupabaseErrorMessage, withSchemaCacheRetry } from "@/lib/supabaseResilience";
import { PlanExpiryBanner } from "@/components/subscription/PlanExpiryBanner";
import { PLAN_LABEL, type SubscriptionPlan } from "@/lib/subscriptionPlans";
import { useUserNotifications } from "@/hooks/useUserNotifications";

interface AtividadeSessao {
  id: string;
  tipo_atividade: string;
  status: string;
  iniciado_em: string;
  finalizado_em: string | null;
}

interface WorkoutSessao {
  id: string;
  status: string;
  iniciado_em: string;
  finalizado_em: string | null;
  exercise_name: string;
}

interface PerfilAluno {
  nome: string | null;
  peso_kg: number | null;
  altura_cm: number | null;
  objetivo: string | null;
  avatar_url: string | null;
  bio?: string | null;
  subscription_plan?: SubscriptionPlan | null;
  plan_expires_at?: string | null;
}

interface SessaoSemana {
  id: string;
  tipo_atividade: string;
  status: string;
  iniciado_em: string;
  finalizado_em: string | null;
  origem: "cardio" | "musculacao";
}

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const DASH_CACHE_PREFIX = "biotreiner_dashboard_cache_";

type DashboardCache = {
  perfil: PerfilAluno | null;
  consultas: {
    id: string;
    data_hora: string;
    status: string;
    profissional_nome: string | null;
    consulta_link: string | null;
  }[];
  cached_at: number;
};

const readDashboardCache = (userId: string): DashboardCache | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${DASH_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardCache;
    if (typeof parsed?.cached_at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeDashboardCache = (userId: string, payload: Omit<DashboardCache, "cached_at">) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${DASH_CACHE_PREFIX}${userId}`,
      JSON.stringify({ ...payload, cached_at: Date.now() } satisfies DashboardCache),
    );
  } catch {
    // ignore
  }
};

const AlunoDashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { plan, loading: planLoading, hasNutritionAccess, hasTelemedAccess, isMaster } = useUserPlan();
  // Fonte única do plano no dashboard (já normalizado pelo hook)
  const planoAtual: SubscriptionPlan = plan;
  const { isOnline } = useConnectionStatus({ silent: true });
  const { showInstallBanner, handleInstallClick, handleCloseBanner } = usePwaInstallPrompt();

  const [sessaoAtual, setSessaoAtual] = useState<AtividadeSessao | null>(null);
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sessoesSemana, setSessoesSemana] = useState<SessaoSemana[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);

  const [isPlanosOpen, setIsPlanosOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasSentInsightNotification, setHasSentInsightNotification] = useState(false);

  const {
    notifications,
    notificationsLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useUserNotifications(user?.id ?? null);

  useEffect(() => {
    if (!user) return;

    const cached = readDashboardCache(user.id);
    if (!isOnline && cached) {
      setPerfil(cached.perfil);
      setAvatarUrl(cached.perfil?.avatar_url ?? null);
      setConsultas(cached.consultas ?? []);
      return;
    }

    if (!isOnline) return;

    const fetchDados = async () => {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const agoraIso = new Date().toISOString();

      const [sessaoResp, perfilResp, semanaCardioResp, semanaMuscuResp, consultasResp] = await Promise.all([
        (supabase as any)
          .from("atividade_sessao")
          .select("id, tipo_atividade, status, iniciado_em, finalizado_em")
          .eq("user_id", user.id)
          .eq("status", "em_andamento")
          .order("iniciado_em", { ascending: false })
          .limit(1),
        withSchemaCacheRetry(
          () =>
            supabase
              .from("profiles")
              .select("nome, peso_kg, altura_cm, objetivo, avatar_url, bio, subscription_plan, plan_expires_at")
              .eq("id", user.id)
              .maybeSingle(),
          { label: "dashboard:profiles" },
        ),
        (supabase as any)
          .from("atividade_sessao")
          .select("id, tipo_atividade, status, iniciado_em, finalizado_em, confirmado")
          .eq("user_id", user.id)
          .eq("status", "finalizada")
          .eq("confirmado", true)
          .gte("iniciado_em", seteDiasAtras.toISOString()),
        (supabase as any)
          .from("workout_sessions")
          .select("id, status, iniciado_em, finalizado_em, exercise_name, confirmado")
          .eq("user_id", user.id)
          .eq("status", "finalizada")
          .eq("confirmado", true)
          .gte("iniciado_em", seteDiasAtras.toISOString()),
        withSchemaCacheRetry<any>(
          () =>
            (supabase as any)
              .from("telemedicina_agendamentos")
              .select("id, data_hora, status, profissional_nome, consulta_link")
              .eq("aluno_id", user.id)
              .gte("data_hora", agoraIso)
              .order("data_hora", { ascending: true })
              .limit(5),
          { label: "dashboard:consultas" },
        ),
      ]);

      const { data: sessaoData, error: sessaoError } = sessaoResp;
      const { data: perfilData, error: perfilError } = perfilResp;
      const { data: semanaCardioData, error: semanaCardioError } = semanaCardioResp;
      const { data: semanaMuscuData, error: semanaMuscuError } = semanaMuscuResp;
      const { data: consultasData, error: consultasError } = consultasResp;

      if (sessaoError) {
        toast({ title: "Erro ao carregar atividade", description: getFriendlySupabaseErrorMessage(sessaoError), variant: "destructive" });
      } else {
        setSessaoAtual((sessaoData as AtividadeSessao[] | null)?.[0] ?? null);
      }

      if (perfilError) {
        toast({ title: "Erro ao carregar perfil", description: getFriendlySupabaseErrorMessage(perfilError), variant: "destructive" });
      } else if (perfilData) {
        setPerfil(perfilData as PerfilAluno);
        setAvatarUrl((perfilData as PerfilAluno).avatar_url ?? null);
      }

      if (semanaCardioError || semanaMuscuError) {
        const errorMessage = getFriendlySupabaseErrorMessage(semanaCardioError ?? semanaMuscuError);
        toast({ title: "Erro ao carregar histórico", description: errorMessage, variant: "destructive" });
      }

      const cardio = (semanaCardioData as AtividadeSessao[] | null) ?? [];
      const muscu = (semanaMuscuData as WorkoutSessao[] | null) ?? [];

      const combinadas: SessaoSemana[] = [
        ...cardio.map((s) => ({
          id: s.id,
          tipo_atividade: s.tipo_atividade,
          status: s.status,
          iniciado_em: s.iniciado_em,
          finalizado_em: s.finalizado_em,
          origem: "cardio" as const,
        })),
        ...muscu.map((s) => ({
          id: s.id,
          tipo_atividade: "Musculação",
          status: s.status,
          iniciado_em: s.iniciado_em,
          finalizado_em: s.finalizado_em,
          origem: "musculacao" as const,
        })),
      ].sort((a, b) => {
        const aDate = new Date(a.finalizado_em || a.iniciado_em).getTime();
        const bDate = new Date(b.finalizado_em || b.iniciado_em).getTime();
        return bDate - aDate;
      });

      setSessoesSemana(combinadas);

      if (consultasError) {
        toast({
          title: "Erro ao carregar consultas",
          description: getFriendlySupabaseErrorMessage(consultasError),
          variant: "destructive",
        });
      } else if (consultasData) {
        setConsultas(consultasData as any);
      }

      writeDashboardCache(user.id, {
        perfil: (perfilData as PerfilAluno) ?? null,
        consultas: (consultasData as any) ?? [],
      });
    };

    fetchDados();
  }, [user, isOnline, toast]);

  const resumoSemanal = useMemo(() => {
    const base = diasSemana.map((dia) => ({ dia, minutos: 0 }));

    sessoesSemana.forEach((sessao) => {
      if (!sessao.finalizado_em) return;
      const inicio = new Date(sessao.iniciado_em);
      const fim = new Date(sessao.finalizado_em);
      const minutos = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 60000));
      const diaLabel = diasSemana[inicio.getDay()];
      const entry = base.find((b) => b.dia === diaLabel);
      if (entry) entry.minutos += minutos;
    });

    return base;
  }, [sessoesSemana]);

  const minutosTotaisSemana = useMemo(
    () => resumoSemanal.reduce((acc, d) => acc + d.minutos, 0),
    [resumoSemanal]
  );

  const imc = useMemo(() => {
    if (!perfil?.peso_kg || !perfil.altura_cm) return null;
    const alturaM = perfil.altura_cm / 100;
    return perfil.peso_kg / (alturaM * alturaM);
  }, [perfil]);

  const handleAvatarError = () => {
    setAvatarUrl(null);
  };

  const daysLeftToExpire = useMemo(() => {
    const expiresAt = perfil?.plan_expires_at ?? null;
    if (!expiresAt) return null;
    const expiresMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) return null;
    const diffMs = expiresMs - Date.now();
    if (diffMs <= 0) return null; // já expirou (downgrade automático)
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [perfil?.plan_expires_at]);

  const shouldShowPlanExpiryBanner =
    !isMaster && plan !== "FREE" && daysLeftToExpire != null && daysLeftToExpire <= 3;

  const insightMensagem = useMemo(() => {
    if (!sessoesSemana.length) {
      return "Comece registrando suas atividades para que a IA Nexfit possa gerar insights personalizados.";
    }

    const ultima = sessoesSemana
      .filter((s) => s.finalizado_em)
      .sort((a, b) => new Date(b.finalizado_em || "").getTime() - new Date(a.finalizado_em || "").getTime())[0];

    if (!ultima || !ultima.finalizado_em) {
      return "Continue se movimentando e registrando suas sessões para liberar análises mais profundas.";
    }

    const inicio = new Date(ultima.iniciado_em);
    const fim = new Date(ultima.finalizado_em);
    const minutosUltima = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 60000));
    const media = minutosTotaisSemana / resumoSemanal.filter((d) => d.minutos > 0).length;
    const variacao = ((minutosUltima - media) / (media || minutosUltima)) * 100;
    const variacaoAbs = Math.abs(Math.round(variacao));

    if (variacao >= 5) {
      return `Ótima consistência! Seu ritmo em ${ultima.tipo_atividade} hoje foi cerca de ${variacaoAbs}% superior à sua média semanal.`;
    }

    if (variacao <= -5) {
      return `Bom trabalho em manter a regularidade. Sua sessão de ${ultima.tipo_atividade} ficou cerca de ${variacaoAbs}% abaixo da média — talvez seu corpo estivesse pedindo recuperação.`;
    }

    return `Você está mantendo um padrão estável em ${ultima.tipo_atividade}. A regularidade é a base para evoluções consistentes.`;
  }, [sessoesSemana, minutosTotaisSemana, resumoSemanal]);

  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [userClubs, setUserClubs] = useState<{ id: string; name: string }[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | undefined>();
  const [isPublishingShare, setIsPublishingShare] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!sessoesSemana.length) return;
    if (hasSentInsightNotification) return;

    const sendNotification = () => {
      try {
        new Notification("Insight Nexfit", {
          body: insightMensagem,
        });
        setHasSentInsightNotification(true);
      } catch (error) {
        console.error("Erro ao enviar notificação de insight:", error);
      }
    };

    if (Notification.permission === "granted") {
      sendNotification();
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          sendNotification();
        }
      });
    }
  }, [insightMensagem, sessoesSemana.length, hasSentInsightNotification]);

  useEffect(() => {
    if (location.state && (location.state as any).showSharePrompt) {
      setShowSharePrompt(true);
      navigate(".", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (!showSharePrompt || !user) return;

    (async () => {
      const { data, error } = await (supabase as any)
        .from("running_club_members")
        .select("club_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) {
        console.error("Erro ao carregar clubes do usuário", error);
        toast({
          title: "Erro ao carregar clubes",
          description: "Não foi possível carregar seus clubes de corrida.",
          variant: "destructive",
        });
        return;
      }

      const clubIds = Array.from(new Set((data ?? []).map((m: any) => m.club_id))).filter(Boolean);
      if (!clubIds.length) {
        setUserClubs([]);
        return;
      }

      const { data: clubsData, error: clubsError } = await (supabase as any)
        .from("running_clubs")
        .select("id, name")
        .in("id", clubIds);

      if (clubsError) {
        console.error("Erro ao carregar detalhes dos clubes", clubsError);
        toast({
          title: "Erro ao carregar clubes",
          description: "Não foi possível carregar seus clubes de corrida.",
          variant: "destructive",
        });
        return;
      }

      setUserClubs((clubsData as any[])?.map((c) => ({ id: c.id, name: c.name })) ?? []);
    })();
  }, [showSharePrompt, user, toast]);

  const finalizarSessao = async () => {
    if (!sessaoAtual) return;
    const { error } = await (supabase as any)
      .from("atividade_sessao")
      .update({
        status: "finalizada",
        finalizado_em: new Date().toISOString(),
        confirmado: true,
      })
      .eq("id", sessaoAtual.id);

    if (error) {
      toast({ title: "Erro ao finalizar", description: error.message, variant: "destructive" });
      return;
    }

    setSessaoAtual(null);
  };

  // Evita flicker do placeholder "Aluno": só mostra nome quando estiver disponível.
  const nomeAluno = perfil?.nome ?? null;
  const isTelemedSpecialUser = user?.email === "contatomaydsonsv@gmail.com";

  const diasAtivosSemana = useMemo(
    () => resumoSemanal.filter((d) => d.minutos > 0).length,
    [resumoSemanal]
  );

  const clearEphemeralCaches = () => {
    if (typeof window === "undefined") return;
    try {
      const prefixes = ["biotreiner_activity_", "biotreiner_strength_", "biotreiner_chat_"];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (prefixes.some((p) => key.startsWith(p))) {
          window.localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error("Falha ao limpar caches temporários no logout", error);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      clearEphemeralCaches();

      // Remove token local imediatamente para evitar "loop" de redirect no /auth.
      if (typeof window !== "undefined") {
        try {
          const authTokenKey = "sb-afffyfsmcvphrhbtxrgt-auth-token";
          window.localStorage.removeItem(authTokenKey);
        } catch {
          // ignore
        }
      }

      // Tenta encerrar no servidor; se a sessão já não existir (offline/expirada), força logout local.
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch {
      // Em qualquer falha, garantimos logout local para não "prender" o usuário logado.
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore
      }
    } finally {
      setIsLoggingOut(false);
      // SPA navigation evita “tela branca” de reload completo após logout.
      navigate("/auth", { replace: true });
    }
  };

  const handleIrParaAtividade = () => {
    navigate("/aluno/monitoramento");
  };

  const handleShareToClub = async () => {
    if (!user) return;
    if (!selectedClubId) {
      toast({
        title: "Selecione um clube",
        description: "Escolha um clube para publicar sua atividade.",
      });
      return;
    }

    setIsPublishingShare(true);
    try {
      const { data: lastSession, error: lastSessionError } = await (supabase as any)
        .from("atividade_sessao")
        .select("id, tipo_atividade, iniciado_em, finalizado_em, distance_km, calorias_estimadas, pace_avg")
        .eq("user_id", user.id)
        .eq("status", "finalizada")
        .order("finalizado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastSessionError) {
        console.error("Erro ao buscar última sessão finalizada", lastSessionError);
        toast({
          title: "Erro ao compartilhar",
          description: "Não foi possível encontrar sua última atividade.",
          variant: "destructive",
        });
        return;
      }

      if (!lastSession) {
        toast({
          title: "Nenhuma atividade encontrada",
          description: "Finalize uma atividade antes de compartilhar.",
        });
        return;
      }

      let imageUrl: string | null = null;
      if (typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem("biotreiner_last_share_image");
          if (stored) {
            const parsed = JSON.parse(stored);
            const storedUrl = parsed?.imageUrl as string | undefined;

            if (storedUrl) {
              console.log("[AlunoDashboard] URL de imagem encontrada no localStorage", storedUrl);

              // Caso 1: já seja uma URL pública (http/https), usamos direto
              if (/^https?:\/\//.test(storedUrl)) {
                imageUrl = storedUrl;
              } else {
                // Caso 2: data URL (base64) ou outros esquemas (ex: blob:)
                // Fazemos upload para o bucket running_activities e usamos a URL pública
                try {
                  const fileName = `${user.id}-${lastSession.id}-${Date.now()}.png`;
                  const path = `${user.id}/${fileName}`;

                  const response = await fetch(storedUrl);
                  const blob = await response.blob();

                  const { error: uploadError } = await supabase.storage
                    .from("running_activities")
                    .upload(path, blob, {
                      cacheControl: "3600",
                      upsert: true,
                      contentType: blob.type || "image/png",
                    });

                  if (uploadError) {
                    console.error("[AlunoDashboard] Erro ao fazer upload da imagem gerada", uploadError);
                  } else {
                    const { data: publicData } = supabase.storage
                      .from("running_activities")
                      .getPublicUrl(path);
                    imageUrl = publicData.publicUrl ?? null;
                    console.log("[AlunoDashboard] Imagem gerada publicada em", imageUrl);
                  }
                } catch (uploadErr) {
                  console.error("[AlunoDashboard] Falha ao preparar/upload da imagem para o clube", uploadErr);
                }
              }
            }
          }
        } catch (error) {
          console.warn("Falha ao preparar imagem de compartilhamento a partir do localStorage", error);
        }
      }

      const inicio = lastSession.iniciado_em ? new Date(lastSession.iniciado_em) : null;
      const fim = lastSession.finalizado_em ? new Date(lastSession.finalizado_em) : null;
      const duracaoMinutos =
        inicio && fim ? Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 60000)) : null;

      const captionTextoBase = `Concluí uma atividade de ${lastSession.tipo_atividade} com a Nexfit!`;

      // Garante que exista uma atividade de clube vinculada para satisfazer o relacionamento forte
      try {
        const { data: existingActivity, error: existingActivityError } = await (supabase as any)
          .from("running_club_activities")
          .select("id")
          .eq("id", lastSession.id)
          .maybeSingle();

        if (existingActivityError) {
          console.error("[AlunoDashboard] Erro ao verificar running_club_activities", existingActivityError);
        }

        if (!existingActivity) {
          const { error: insertActivityError } = await (supabase as any)
            .from("running_club_activities")
            .insert({
              id: lastSession.id,
              club_id: selectedClubId,
              user_id: user.id,
              distance_km: lastSession.distance_km ?? 0,
              duration_minutes: duracaoMinutos ?? 0,
              recorded_at: lastSession.finalizado_em ?? new Date().toISOString(),
              author_name: perfil?.nome ?? nomeAluno,
              author_initials: (perfil?.nome || nomeAluno)?.slice(0, 2).toUpperCase(),
              caption: captionTextoBase,
              activity_image_url: imageUrl,
            });

          if (insertActivityError) {
            const isDuplicateActivity =
              typeof insertActivityError.message === "string" &&
              (insertActivityError.message.includes("duplicate key") ||
                insertActivityError.message.includes("unique"));

            if (!isDuplicateActivity) {
              console.error(
                "[AlunoDashboard] Erro ao inserir running_club_activities para suporte ao relacionamento",
                insertActivityError,
              );
              toast({
                title: "Não foi possível compartilhar",
                description: "Erro ao registrar atividade no clube.",
                variant: "destructive",
              });
              return;
            }
          }
        }
      } catch (e) {
        console.error("[AlunoDashboard] Erro inesperado ao garantir running_club_activities", e);
      }

      const { error: insertError } = await supabase.from("club_posts").insert({
        club_id: selectedClubId,
        user_id: user.id,
        activity_id: lastSession.id,
        activity_type: lastSession.tipo_atividade,
        distance_km: lastSession.distance_km ?? null,
        duration_minutes: duracaoMinutos,
        calories: lastSession.calorias_estimadas ?? null,
        pace: lastSession.pace_avg ? `${lastSession.pace_avg} min/km` : null,
        caption: captionTextoBase,
        image_url: imageUrl,
        author_name: perfil?.nome ?? nomeAluno,
        author_initials: (perfil?.nome || nomeAluno)?.slice(0, 2).toUpperCase(),
        author_avatar_url: avatarUrl,
      });

      if (insertError) {
        console.error("Erro ao publicar no clube", insertError);
        toast({
          title: "Erro ao compartilhar",
          description: "Não foi possível publicar sua atividade no clube.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Atividade compartilhada!",
        description: "Sua atividade foi publicada no clube selecionado.",
      });
      setShowSharePrompt(false);
      setSelectedClubId(undefined);
    } finally {
      setIsPublishingShare(false);
    }
  };
  const handleMarketplaceClick = () => {
    if (planLoading) return;
    if (plan === "FREE" && !isMaster) {
      setIsPlanosOpen(true);
      toast({
        title: "Upgrade necessário",
        description: `Faça o upgrade para ${PLAN_LABEL.ADVANCE} para liberar o Marketplace.`,
      });
      return;
    }
    navigate("/marketplace");
  };

  return (
    <main
      className="safe-bottom-main flex min-h-screen flex-col gap-4 bg-background px-4 pt-4"
    >
      {shouldShowPlanExpiryBanner && daysLeftToExpire != null && (
        <PlanExpiryBanner daysLeft={daysLeftToExpire} onRenew={() => navigate("/aluno/perfil/plano")} />
      )}
      <header className="flex flex-col gap-3">
        {/* Linha da logomarca + ações topo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={logoNexfit}
              alt="Logomarca Nexfit"
              className="h-14 w-auto opacity-80"
            />
            {!isOnline && (
              <Badge
                variant="outline"
                className="border-warning/40 bg-warning/10 text-warning"
              >
                Offline
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isPlanosOpen} onOpenChange={setIsPlanosOpen}>
              <DialogContent className="max-w-lg border border-accent/40 bg-card/95">
                <DialogHeader>
                  <DialogTitle className="text-lg">Planos Nexfit</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Compare os planos e faça o upgrade para desbloquear Nutricionista Virtual e Telemedicina.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 text-xs md:grid-cols-3">
                  <Card className="border border-border/60 bg-background/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{PLAN_LABEL.FREE}</CardTitle>
                      <CardDescription className="text-[11px]">
                        Acesso ao app e Hub de Serviços limitado.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-[11px] text-muted-foreground">
                      <ul className="space-y-1">
                        <li>• Dashboard de treino</li>
                        <li>• Registro de atividades</li>
                        <li>• Frequência semanal</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border border-primary/70 bg-background/80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-primary">{PLAN_LABEL.ADVANCE}</CardTitle>
                      <CardDescription className="text-[11px]">
                        Desbloqueie assistência nutricional digital.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-[11px] text-muted-foreground">
                      <ul className="space-y-1">
                        <li>• Tudo do Básico</li>
                        <li>• Nutricionista Virtual liberado</li>
                        <li>• Insights avançados</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border border-accent/80 bg-background/80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-accent">{PLAN_LABEL.ELITE}</CardTitle>
                      <CardDescription className="text-[11px]">
                        Telemedicina + suporte completo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-[11px] text-muted-foreground">
                      <ul className="space-y-1">
                        <li>• Tudo do Premium</li>
                        <li>• Telemedicina liberada</li>
                        <li>• Prioridade em suporte</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                <DialogFooter className="mt-2 flex flex-col items-stretch gap-2">
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() =>
                      toast({
                        title: "Upgrade de plano",
                        description: "Fluxo de upgrade ainda será configurado.",
                      })
                    }
                  >
                    Quero fazer upgrade
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Essa tela é apenas ilustrativa. Em breve você poderá concluir o upgrade aqui pelo app.
                  </p>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="relative h-8 w-8"
                  aria-label="Central de notificações"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md border border-accent/40 bg-card/95">
                <DialogHeader>
                  <DialogTitle className="text-sm">Central de notificações</DialogTitle>
                  <DialogDescription className="text-[11px] text-muted-foreground">
                    Acompanhe avisos do sistema e atualizações de pagamentos.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-xs">
                  <Card className="border border-primary/60 bg-card/90">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs">Insight da IA Nexfit</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">
                        Gerado a partir do seu histórico recente de atividades.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border border-primary/60 bg-gradient-to-r from-primary/10 via-background to-accent/20 p-3">
                        {insightMensagem}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="rounded-lg border border-border/60 bg-background/40">
                    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                      <p className="text-[11px] font-medium text-foreground">Notificações</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        disabled={unreadCount === 0 || markAllAsRead.isPending}
                        onClick={() => markAllAsRead.mutate()}
                      >
                        Marcar tudo como lido
                      </Button>
                    </div>

                    <div className="max-h-[280px] overflow-auto p-2">
                      {notificationsLoading ? (
                        <p className="px-2 py-3 text-[11px] text-muted-foreground">Carregando...</p>
                      ) : notifications.length === 0 ? (
                        <p className="px-2 py-3 text-[11px] text-muted-foreground">Nenhuma notificação ainda.</p>
                      ) : (
                        <ul className="space-y-2">
                          {notifications.map((n) => {
                            const unread = !n.read_at;
                            return (
                              <li
                                key={n.id}
                                className={`rounded-md border border-border/60 p-2 ${unread ? "bg-muted/30" : "bg-background/40"}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      {unread && <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden />}
                                      <p className="truncate text-[11px] font-semibold text-foreground">{n.title}</p>
                                    </div>
                                    {n.body && <p className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</p>}
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                      {new Date(n.created_at).toLocaleString("pt-BR")}
                                    </p>
                                  </div>

                                  <div className="flex flex-col items-end gap-1">
                                    {unread && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px]"
                                        disabled={markAsRead.isPending}
                                        onClick={() => markAsRead.mutate(n.id)}
                                      >
                                        Marcar lida
                                      </Button>
                                    )}
                                    {n.type === "payment" && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[11px]"
                                        onClick={() => navigate("/aluno/perfil/plano")}
                                      >
                                        Ver plano
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="Conectividade"
              onClick={() => navigate("/aluno/conectividade")}
            >
              <HeartPulse className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="Sair"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

        </div>
        {/* Linha principal: bloco de perfil ocupando a largura */}
        <GreetingCard
          name={nomeAluno}
          avatarUrl={avatarUrl}
          onAvatarError={handleAvatarError}
          badgeVariant={planoAtual}
          subtitle={perfil?.bio ?? null}
        />

        <Dialog open={showSharePrompt} onOpenChange={setShowSharePrompt}>
          <DialogContent className="max-w-sm border border-border/60 bg-card/95">
            <DialogHeader>
              <DialogTitle className="text-sm">Parabéns por concluir mais uma atividade!</DialogTitle>
              <DialogDescription className="text-[11px]">
                Gostaria de compartilhar com seus amigos?
              </DialogDescription>
            </DialogHeader>

            {userClubs.length > 0 ? (
              <div className="space-y-2 py-2">
                <p className="text-[11px] text-muted-foreground">
                  Escolha em qual clube deseja publicar esta atividade.
                </p>
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione um clube" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {userClubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="py-3 text-[11px] text-muted-foreground">
                Você ainda não participa de nenhum clube de corrida. Acesse o Running Club para entrar em um grupo.
              </p>
            )}

            <DialogFooter className="mt-2 flex flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSharePrompt(false)}
              >
                Agora não
              </Button>
              {userClubs.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleShareToClub}
                  loading={isPublishingShare}
                  disabled={!selectedClubId}
                >
                  Compartilhar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* Frequência semanal e atalho */}
      <section className="space-y-3">
        {/* White border (no purple) + neon green active day */}
        <Card className="border border-border bg-card/80">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Frequência semanal</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 pt-1">
            {resumoSemanal.map((diaInfo) => {
              const inicial = diaInfo.dia.charAt(0);
              const ativo = diaInfo.minutos > 0;

              return (
                <div
                  key={diaInfo.dia}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border text-[11px] transition-colors ${ativo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                    }`}
                >
                  {inicial}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full py-3"
          onClick={handleIrParaAtividade}
        >
          Explorar Atividades
        </Button>
      </section>

      {/* Conteúdo otimizado em acordes */}
      {/* Seção de evolução semanal removida do dashboard */}

      {/* Outdoor (substitui "Minhas consultas") */}
      <DashboardOutdoorBillboard />

      {/* Hub de serviços */}
      <section className="space-y-2 pb-4">
        <h2 className="text-sm font-medium text-foreground">Hub de serviços Nexfit</h2>
        <p className="text-[11px] text-muted-foreground">
          Explore recursos complementares ao seu treino. Alguns serviços exigem upgrade de plano.
        </p>

        <div className="mt-2 grid gap-3">
          <HubServiceButton
            title="Marketplace"
            icon={ShoppingBag}
            onClick={handleMarketplaceClick}
            rightSlot={
              plan === "FREE" && !isMaster ? (
                <Lock className="h-4 w-4 text-current/80" aria-label="Recurso bloqueado para o seu plano" />
              ) : null
            }
          />

          <HubServiceButton
            title="Nutricionista Virtual"
            icon={UtensilsCrossed}
            onClick={() => {
              if (!hasNutritionAccess && !isMaster) {
                setIsPlanosOpen(true);
                toast({
                  title: "Upgrade necessário",
                  description: `Nutricionista Virtual é liberado a partir do plano ${PLAN_LABEL.ADVANCE}.`,
                });
                return;
              }
              navigate("/aluno/nutricionista");
            }}
            rightSlot={
              !hasNutritionAccess && !isMaster ? (
                <Lock className="h-4 w-4 text-current/80" aria-label="Recurso bloqueado para o seu plano" />
              ) : null
            }
          />

          <HubServiceButton
            title="Telemedicina"
            icon={Stethoscope}
            onClick={() => {
              if (!hasTelemedAccess && !isMaster) {
                setIsPlanosOpen(true);
                toast({
                  title: `Exclusivo ${PLAN_LABEL.ELITE}`,
                  description: `Telemedicina é liberada apenas no plano ${PLAN_LABEL.ELITE}.`,
                });
                return;
              }
              navigate("/telemedicina");
            }}
            rightSlot={
              !hasTelemedAccess && !isMaster ? (
                <Lock className="h-4 w-4 text-current/80" aria-label="Recurso bloqueado para o seu plano" />
              ) : null
            }
          />

          <HubServiceButton
            title="Modo Raiz"
            icon={Skull}
            onClick={() => navigate("/aluno/modo-raiz")}
          />

          <HubServiceButton title="Running Club" icon={Users} onClick={() => navigate("/aluno/running-club")} />
        </div>
      </section>

      {/* Navegação inferior flutuante */}
      <FloatingNavIsland />

      <PwaInstallBanner
        showInstallBanner={showInstallBanner}
        onInstall={handleInstallClick}
        onClose={handleCloseBanner}
      />
    </main>
  );
};

export default AlunoDashboardPage;