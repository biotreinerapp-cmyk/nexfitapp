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
  Rocket,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
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
import { usePushNotifications } from "@/hooks/usePushNotifications";

import { useDashboardData } from "@/hooks/useDashboardData";
import { NotificationCenter } from "@/components/shared/NotificationCenter";

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;



const AlunoDashboardPage = () => {
  const { user } = useAuth();
  const { nome: profileNome, avatarUrl: profileAvatarUrl, pesoKg: profilePeso, alturaCm: profileAltura, bio: profileBio } = useProfile();
  const { toast } = useToast();
  const { plan, loading: planLoading, hasNutritionAccess, hasTelemedAccess, isMaster } = useUserPlan();
  // Fonte única do plano no dashboard (já normalizado pelo hook)
  const planoAtual: SubscriptionPlan = plan;
  const { isOnline } = useConnectionStatus({ silent: true });

  const { showInstallBanner, handleInstallClick, handleCloseBanner } = usePwaInstallPrompt();

  const { sessaoAtual, sessoesSemana, consultas } = useDashboardData(user?.id, isOnline);
  const [hasActiveEvent, setHasActiveEvent] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchActiveEvents = async () => {
      try {
        const { data: memberData } = await supabase
          .from("running_club_members")
          .select("club_id")
          .eq("user_id", user.id)
          .eq("status", "active");

        if (!memberData || memberData.length === 0) return;

        const clubIds = memberData.map((m: any) => m.club_id);

        const now = new Date().toISOString();
        const [{ data: racesData }, { data: challengesData }] = await Promise.all([
          supabase.from("running_club_races").select("id").in("club_id", clubIds).eq("active", true).lte("start_date", now).gte("end_date", now).limit(1),
          supabase.from("running_club_challenges").select("id").in("club_id", clubIds).eq("active", true).lte("start_date", now).gte("end_date", now).limit(1)
        ]);

        if ((racesData && racesData.length > 0) || (challengesData && challengesData.length > 0)) {
          setHasActiveEvent(true);
        }
      } catch (err) {
        console.warn("Could not check active events", err);
      }
    };

    fetchActiveEvents();
  }, [user]);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const {
    notifications,
    notificationsLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useUserNotifications(user?.id ?? null);

  const { permission: pushPermission, subscribeUser } = usePushNotifications();

  // Tenta registrar o push automaticamente se a permissão já foi dada
  useEffect(() => {
    if (user && pushPermission === "granted") {
      subscribeUser();
    }
  }, [user, pushPermission, subscribeUser]);

  useEffect(() => {
    if (user && pushPermission === "granted") {
      subscribeUser();
    }
  }, [user, pushPermission, subscribeUser]);

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
    if (!profilePeso || !profileAltura) return null;
    const alturaM = profileAltura / 100;
    return (profilePeso / (alturaM * alturaM)).toFixed(1);
  }, [profilePeso, profileAltura]);

  const handleAvatarError = () => {
    // Avatar is now managed by useProfile, no need for local state
  };

  const daysLeftToExpire = useMemo(() => {
    // We check the plan object, but if it doesn't have expires_at we can fallback to something else, or omit for now
    const expiresAt = user?.user_metadata?.plan_expires_at ?? null; // For simplicity, we can fetch from auth metadata if available, or just ignore for FREE plans
    if (!expiresAt) return null;
    const expiresMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) return null;
    const nowMs = Date.now();
    const diffMs = expiresMs - nowMs;
    if (diffMs <= 0) return null; // já expirou (downgrade automático)
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [user?.user_metadata?.plan_expires_at]);

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

    const diasAtivos = resumoSemanal.filter((d) => d.minutos > 0).length;
    if (diasAtivos === 0) return "Continue se movimentando para que a IA possa analisar seu padrão semanal.";

    const media = minutosTotaisSemana / diasAtivos;
    const variacao = ((minutosUltima - media) / (media || minutosUltima || 1)) * 100;
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
  };

  // Evita flicker do placeholder "Aluno": só mostra nome quando estiver disponível.
  const nomeAluno = profileNome ?? null;
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

                  let blob: Blob;
                  if (storedUrl.startsWith("data:")) {
                    // Converter de DataURL para Blob manualmente de forma robusta
                    const arr = storedUrl.split(',');
                    const mimeMatch = arr[0].match(/:(.*?);/);
                    const mime = mimeMatch ? mimeMatch[1] : "image/png";
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                      u8arr[n] = bstr.charCodeAt(n);
                    }
                    blob = new Blob([u8arr], { type: mime });
                  } else {
                    const response = await fetch(storedUrl);
                    blob = await response.blob();
                  }

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
              author_name: profileNome || "Atleta",
              author_initials: (profileNome || "Atleta").slice(0, 2).toUpperCase(),
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
        author_name: profileNome || "Atleta",
        author_initials: (profileNome || "Atleta").slice(0, 2).toUpperCase(),
        author_avatar_url: profileAvatarUrl,
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
      toast({
        title: "Upgrade necessário",
        description: `Faça o upgrade para ${PLAN_LABEL.ADVANCE} para liberar o Marketplace.`,
      });
      navigate("/aluno/planos");
      return;
    }
    navigate("/marketplace");
  };

  return (
    <main
      className="safe-bottom-main flex min-h-screen flex-col gap-4 bg-background px-4 safe-top-padded"
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
            <NotificationCenter />

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
          name={profileNome}
          avatarUrl={profileAvatarUrl}
          onAvatarError={handleAvatarError}
          badgeVariant={planoAtual}
          subtitle={profileBio ?? null}
        />

        <Dialog open={showSharePrompt} onOpenChange={setShowSharePrompt}>
          <DialogContent className="max-w-sm border border-white/10 bg-black/90 backdrop-blur-2xl text-foreground sm:rounded-3xl">
            <VisuallyHidden>
              <DialogTitle>Atividade Concluída</DialogTitle>
              <DialogDescription>Detalhes e opções de compartilhamento após finalizar a atividade.</DialogDescription>
            </VisuallyHidden>
            <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-6">
              <p className="text-lg font-black uppercase tracking-tight text-white">
                Parabéns! <span className="text-primary">Atividade Concluída</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Compartilhe sua conquista com a comunidade do Running Club.
              </p>
            </div>

            {userClubs.length > 0 ? (
              <div className="space-y-3 py-4">
                <p className="text-xs font-medium text-white/80">
                  Escolha o clube para publicar:
                </p>
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                  <SelectTrigger className="h-12 w-full rounded-xl border-white/10 bg-white/5 text-sm text-white focus:ring-primary/50">
                    <SelectValue placeholder="Selecione um clube..." />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-black/95 text-white backdrop-blur-xl">
                    {userClubs.map((club) => (
                      <SelectItem
                        key={club.id}
                        value={club.id}
                        className="focus:bg-primary/20 focus:text-primary"
                      >
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  Você ainda não participa de nenhum clube.
                  <br />
                  Acesse o <strong>Running Club</strong> para entrar em um grupo.
                </p>
              </div>
            )}

            <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-white/5 hover:text-white"
                onClick={() => setShowSharePrompt(false)}
              >
                Agora não
              </Button>
              {userClubs.length > 0 && (
                <Button
                  type="button"
                  className="h-12 min-w-[140px] rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-xs font-bold uppercase tracking-widest text-white hover:from-orange-600 hover:to-amber-700 disabled:opacity-50"
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
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Frequência semanal</h2>
          </div>

          <div className="flex justify-between gap-1">
            {resumoSemanal.map((diaInfo) => {
              const inicial = diaInfo.dia.charAt(0);
              const ativo = diaInfo.minutos > 0;

              return (
                <div
                  key={diaInfo.dia}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${ativo
                    ? "bg-[#00FF00] text-black shadow-[0_0_15px_rgba(0,255,0,0.4)] scale-110"
                    : "border border-white/10 bg-white/5 text-zinc-500"
                    }`}
                >
                  {inicial}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Conteúdo otimizado em acordes */}
      {/* Seção de evolução semanal removida do dashboard */}

      {/* Outdoor (substitui "Minhas consultas") */}
      <DashboardOutdoorBillboard />

      {/* Hub de serviços */}
      <section className="space-y-4 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
            Serviços Premium
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent ml-4" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Explorar Atividades */}
          <button
            onClick={handleIrParaAtividade}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-primary shadow-inner">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground leading-none">Atividades</h3>
              <p className="text-[10px] text-muted-foreground font-medium opacity-70">Treinos & Frequência</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <Dumbbell className="h-10 w-10 rotate-12" />
            </div>
          </button>



          {/* Marketplace */}
          <button
            onClick={handleMarketplaceClick}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-blue-400 shadow-inner">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground leading-none">Marketplace</h3>
                {plan === "FREE" && !isMaster && <Lock className="h-3 w-3 text-muted-foreground/50" />}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium opacity-70">Suplementos & Acessórios</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <ShoppingBag className="h-10 w-10 rotate-12" />
            </div>
          </button>

          {/* Nutricionista Virtual */}
          <button
            onClick={() => {
              if (!hasNutritionAccess && !isMaster) {
                navigate("/aluno/planos");
                return;
              }
              navigate("/aluno/nutricionista");
            }}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-emerald-400 shadow-inner">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground leading-none">Nutrição</h3>
                {!hasNutritionAccess && !isMaster && <Lock className="h-3 w-3 text-muted-foreground/50" />}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium opacity-70">Plano Alimentar IA</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <UtensilsCrossed className="h-10 w-10 rotate-12" />
            </div>
          </button>

          {/* Telemedicina */}
          <button
            onClick={() => {
              if (!hasTelemedAccess && !isMaster) {
                navigate("/aluno/planos");
                return;
              }
              navigate("/telemedicina");
            }}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-purple-400 shadow-inner">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground leading-none">Telemedicina</h3>
                {!hasTelemedAccess && !isMaster && <Lock className="h-3 w-3 text-muted-foreground/50" />}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium opacity-70">Consultas Online</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <Stethoscope className="h-10 w-10 rotate-12" />
            </div>
          </button>

          {/* Modo Raiz */}
          <button
            onClick={() => navigate("/aluno/modo-raiz")}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-red-500/20 bg-gradient-to-br from-red-500/10 to-red-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-red-500 shadow-inner">
              <Skull className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground leading-none">Modo Raiz</h3>
              <p className="text-[10px] text-muted-foreground font-medium opacity-70">Oldschool Training</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <Skull className="h-10 w-10 rotate-12" />
            </div>
          </button>

          {/* Running Club */}
          <button
            onClick={() => navigate("/aluno/running-club")}
            className={`group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border ${hasActiveEvent ? "border-orange-500/50 bg-gradient-to-br from-orange-500/20 to-orange-600/10 shadow-[0_0_15px_rgba(249,115,22,0.3)] animate-[pulse_2s_ease-in-out_infinite]" : "border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5"} p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-orange-400 shadow-inner">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground leading-none">Running Club</h3>
              <p className="text-[10px] text-muted-foreground font-medium opacity-70">Comunidade Global</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <Users className="h-10 w-10 rotate-12" />
            </div>
          </button>

          {/* Chat (Elite only) */}
          <button
            onClick={() => {
              if (plan !== "ELITE" && !isMaster) {
                navigate("/aluno/planos");
                return;
              }
              navigate("/aluno/chat");
            }}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-cyan-400 shadow-inner">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground leading-none">Chat</h3>
                {plan !== "ELITE" && !isMaster && <Lock className="h-3 w-3 text-muted-foreground/50" />}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium opacity-70">Atendimento Direto</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <MessageSquare className="h-10 w-10 rotate-12" />
            </div>
          </button>

          {/* Agenda (Elite only) */}
          <button
            onClick={() => {
              if (plan !== "ELITE" && !isMaster) {
                navigate("/aluno/planos");
                return;
              }
              navigate("/aluno/consultas");
            }}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-pink-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-pink-400 shadow-inner">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground leading-none">Agenda</h3>
                {plan !== "ELITE" && !isMaster && <Lock className="h-3 w-3 text-muted-foreground/50" />}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium opacity-70">Minhas Consultas</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <Calendar className="h-10 w-10 rotate-12" />
            </div>
          </button>
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