import { useEffect, useMemo, useState } from "react";
import { Activity, CreditCard, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getActivityTypeById } from "@/lib/activityTypes";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { HubServiceButton } from "@/components/dashboard/HubServiceButton";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { PlanExpiryBanner } from "@/components/subscription/PlanExpiryBanner";

interface AtividadeSessaoRow {
  id: string;
  tipo_atividade: string;
  status: string | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
  distance_km: number | null;
}

const AlunoPerfilPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { distanceUnit } = useUserPreferences();

  const [atividades, setAtividades] = useState<AtividadeSessaoRow[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [perfilMetabolico, setPerfilMetabolico] = useState<{
    peso_kg: number | null;
    altura_cm: number | null;
    objetivo: string | null;
  } | null>(null);
  const [planInfo, setPlanInfo] = useState<{
    subscription_plan: string | null;
    plan_expires_at: string | null;
  } | null>(null);

  const handleAvatarError = () => {
    setAvatarUrl(null);
  };

  const displayName =
    (user?.user_metadata as any)?.full_name || user?.email?.split("@")[0] || "Aluno";

  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const fetchProfileAndAtividades = async () => {
      if (!user) return;

      const [{ data: perfil }, { data: atividadesData }] = await Promise.all([
        supabase
          .from("profiles")
            .select("display_name, avatar_url, peso_kg, altura_cm, objetivo, subscription_plan, plan_expires_at")
          .eq("id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("atividade_sessao")
          .select("id, tipo_atividade, status, iniciado_em, finalizado_em, distance_km")
          .eq("user_id", user.id)
          .eq("status", "finalizada")
          .order("finalizado_em", { ascending: false }),
      ]);

      if (perfil) {
        if (perfil.display_name) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (user as any).user_metadata = {
            ...(user.user_metadata || {}),
            full_name: perfil.display_name,
          };
        }
        setAvatarUrl(perfil.avatar_url ?? null);
        setPerfilMetabolico({
          peso_kg: perfil.peso_kg ?? null,
          altura_cm: perfil.altura_cm ?? null,
          objetivo: perfil.objetivo ?? null,
        });
          setPlanInfo({
            subscription_plan: (perfil as any).subscription_plan ?? null,
            plan_expires_at: (perfil as any).plan_expires_at ?? null,
          });
      }

      if (atividadesData) {
        setAtividades(atividadesData as AtividadeSessaoRow[]);
      }
    };

    void fetchProfileAndAtividades();
  }, [user]);

  const totalAtividades = useMemo(() => atividades.length, [atividades]);

  const imc = useMemo(() => {
    if (!perfilMetabolico?.peso_kg || !perfilMetabolico.altura_cm) return null;
    const alturaM = perfilMetabolico.altura_cm / 100;
    return perfilMetabolico.peso_kg / (alturaM * alturaM);
  }, [perfilMetabolico]);

  const totalMinutosTreino = useMemo(() => {
    return atividades.reduce((acc, sessao) => {
      if (!sessao.iniciado_em || !sessao.finalizado_em) return acc;
      const inicio = new Date(sessao.iniciado_em).getTime();
      const fim = new Date(sessao.finalizado_em).getTime();
      if (!isFinite(inicio) || !isFinite(fim) || fim <= inicio) return acc;
      const minutos = Math.max(1, Math.round((fim - inicio) / 60000));
      return acc + minutos;
    }, 0);
  }, [atividades]);

  const totalDistanciaKm = useMemo(() => {
    return atividades.reduce((acc, sessao) => {
      const tipo = getActivityTypeById(sessao.tipo_atividade);
      if (!tipo || !tipo.usesGps) return acc;
      if (sessao.distance_km == null) return acc;
      return acc + Number(sessao.distance_km);
    }, 0);
  }, [atividades]);

  const daysLeftToExpire = useMemo(() => {
    const expiresAt = planInfo?.plan_expires_at;
    if (!expiresAt) return null;
    const expiresMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) return null;
    const diffMs = expiresMs - Date.now();
    if (diffMs <= 0) return null; // já expirou (downgrade automático)
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [planInfo?.plan_expires_at]);

  const shouldShowPlanExpiryBanner =
    (planInfo?.subscription_plan ?? "FREE") !== "FREE" &&
    daysLeftToExpire != null &&
    daysLeftToExpire <= 3;

  const formatTotalMinutos = () => {
    if (totalMinutosTreino <= 0) return "—";
    if (totalMinutosTreino < 60) return `${totalMinutosTreino} min`;
    const horas = Math.floor(totalMinutosTreino / 60);
    const minutos = totalMinutosTreino % 60;
    if (minutos === 0) return `${horas} h`;
    return `${horas} h ${minutos} min`;
  };

  const formatTotalDistancia = () => {
    if (totalDistanciaKm <= 0) return "—";
    if (distanceUnit === "mi") {
      const totalDistanciaMi = totalDistanciaKm * 0.621371;
      return `${totalDistanciaMi.toFixed(1)} mi`;
    }
    return `${totalDistanciaKm.toFixed(1)} km`;
  };

  return (
    <main className="safe-bottom-floating-nav flex min-h-screen flex-col bg-background px-4 pt-6">
      {shouldShowPlanExpiryBanner && daysLeftToExpire != null && (
        <div className="mb-4">
          <PlanExpiryBanner daysLeft={daysLeftToExpire} onRenew={() => navigate("/aluno/perfil/plano")} />
        </div>
      )}
      {/* Header do Perfil */}
      <header className="mb-4 flex items-center gap-3">
        <BackIconButton to="/aluno/dashboard" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Área do Aluno</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-semibold">Perfil</h1>
           <p className="mt-1 text-xs text-muted-foreground">Resumo do seu perfil no Nexfit.</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 pb-4">
        {/* Bloco header do usuário */}
        <section className="space-y-3">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              {avatarUrl && (
                <AvatarImage src={avatarUrl} alt="Foto de perfil" onError={handleAvatarError} />
              )}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{displayName}</span>
               <span className="text-[11px] text-muted-foreground">Este é o seu hub de perfil no Nexfit.</span>
            </div>
          </div>
        </section>

        {/* Bloco Estatísticas Gerais */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">Estatísticas gerais</h2>
          <p className="text-[11px] text-muted-foreground">Visão rápida do seu histórico de uso.</p>

          <div className="grid grid-cols-2 gap-3">
            <Card className="border border-accent/40 bg-card/80">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium">Total de atividades</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">Todas as sessões registradas</CardDescription>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-xl font-semibold text-foreground">{totalAtividades > 0 ? totalAtividades : "—"}</p>
              </CardContent>
            </Card>

            <Card className="border border-accent/40 bg-card/80">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium">Tempo total de treino</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">Soma das sessões concluídas</CardDescription>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-xl font-semibold text-foreground">{formatTotalMinutos()}</p>
              </CardContent>
            </Card>

            <Card className="border border-accent/40 bg-card/80">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium">Distância total</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">Somente atividades com GPS</CardDescription>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-xl font-semibold text-foreground">{formatTotalDistancia()}</p>
              </CardContent>
            </Card>

            <Card className="border border-accent/40 bg-card/80">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium">Perfil metabólico</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">Dados do seu onboarding</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Peso</p>
                    <p className="text-sm font-semibold text-foreground">
                      {perfilMetabolico?.peso_kg ? `${perfilMetabolico.peso_kg.toFixed(1)} kg` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Altura</p>
                    <p className="text-sm font-semibold text-foreground">
                      {perfilMetabolico?.altura_cm ? `${perfilMetabolico.altura_cm.toFixed(0)} cm` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">IMC</p>
                    <p className="text-sm font-semibold text-primary">{imc ? imc.toFixed(1) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Objetivo</p>
                    <p className="text-[11px] font-medium text-foreground line-clamp-2">
                      {perfilMetabolico?.objetivo || "Defina seu foco no onboarding."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Bloco Histórico de Atividades */}
        <section className="space-y-2">
          <HubServiceButton title="Seu histórico" icon={Activity} onClick={() => navigate("/aluno/historico")} />
        </section>

        {/* Bloco Meu Plano */}
        <section className="space-y-2">
          <HubServiceButton title="Meu plano" icon={CreditCard} onClick={() => navigate("/aluno/perfil/plano")} />
        </section>

        {/* Bloco Configurações */}
        <section className="space-y-3 pb-4">
          <HubServiceButton title="Editar perfil" icon={Settings2} onClick={() => navigate("/aluno/perfil/editar")} />
          <HubServiceButton title="Preferências" icon={Settings2} onClick={() => navigate("/aluno/perfil/preferencias")} />
        </section>
      </div>
    </main>
  );
};

export default AlunoPerfilPage;
