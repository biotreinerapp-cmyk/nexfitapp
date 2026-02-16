import { useEffect, useMemo, useState } from "react";
import { Activity, CreditCard, Settings2, History, MapPin, Clock, Zap, User, ArrowUpRight, Award, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getActivityTypeById } from "@/lib/activityTypes";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { HubServiceButton } from "@/components/dashboard/HubServiceButton";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { PlanExpiryBanner } from "@/components/subscription/PlanExpiryBanner";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { cn } from "@/lib/utils";

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
    <main className="safe-bottom-main flex min-h-screen flex-col bg-background px-4 pb-24 pt-6">
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

      <div className="flex flex-1 flex-col gap-6 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Bloco header do usuário */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary/20 p-1 bg-white/5">
                {avatarUrl && (
                  <AvatarImage src={avatarUrl} className="rounded-full" alt="Foto de perfil" onError={handleAvatarError} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">{initial}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xl font-black text-foreground tracking-tight uppercase">{displayName}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground">Hub de Perfil Nexfit</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bloco Estatísticas Gerais */}
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Performance & Bio</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Total Atividades */}
            <div className="group relative overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl transition-all hover:bg-white/[0.06]">
              <Activity className="absolute -right-2 -top-2 h-12 w-12 text-primary/5" />
              <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-1">Atividades</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-black text-foreground tabular-nums">
                  {totalAtividades > 0 ? totalAtividades : "0"}
                </p>
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Sessões</span>
              </div>
            </div>

            {/* Tempo Total */}
            <div className="group relative overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl transition-all hover:bg-white/[0.06]">
              <Clock className="absolute -right-2 -top-2 h-12 w-12 text-orange-500/5" />
              <p className="text-[9px] font-black uppercase tracking-widest text-orange-500/60 mb-1">Volume Total</p>
              <div className="flex items-baseline gap-1">
                <p className="text-lg font-black text-foreground tabular-nums truncate max-w-full">
                  {formatTotalMinutos()}
                </p>
              </div>
            </div>

            {/* Distância */}
            <div className="group relative overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl transition-all hover:bg-white/[0.06]">
              <MapPin className="absolute -right-2 -top-2 h-12 w-12 text-blue-500/5" />
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-500/60 mb-1">Distância</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-black text-foreground tabular-nums">
                  {formatTotalDistancia().split(" ")[0]}
                </p>
                <span className="text-[9px] font-bold text-muted-foreground uppercase">{formatTotalDistancia().split(" ")[1]}</span>
              </div>
            </div>

            {/* Perfil Metabólico */}
            <div className="group relative overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl transition-all hover:bg-white/[0.06]">
              <Zap className="absolute -right-2 -top-2 h-12 w-12 text-emerald-500/5 transition-transform group-hover:scale-110" />
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60 mb-2">Metabólico</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Peso</p>
                  <p className="text-[11px] font-black text-foreground">
                    {perfilMetabolico?.peso_kg ? `${perfilMetabolico.peso_kg.toFixed(0)}kg` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-muted-foreground">IMC</p>
                  <p className="text-[11px] font-black text-emerald-400">{imc ? imc.toFixed(1) : "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bloco Ações Rápidas */}
        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1">Gerenciamento</h2>
          </div>

          <div className="grid gap-3">
            <HubServiceButton
              title="Seu Histórico"
              subtitle="Veja todas as suas sessões"
              icon={History}
              variant="premium"
              className="h-16 rounded-[24px]"
              rightSlot={<ArrowUpRight className="h-4 w-4 opacity-50" />}
              onClick={() => navigate("/aluno/historico")}
            />


            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => navigate("/aluno/perfil/editar")}
                className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 active:scale-95"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Editar Dados</span>
              </button>

              <button
                onClick={() => navigate("/aluno/perfil/preferencias")}
                className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 active:scale-95"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
                  <Settings2 className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Ajustes</span>
              </button>
            </div>
          </div>
        </section>
      </div>
      <FloatingNavIsland />
    </main>
  );
};

export default AlunoPerfilPage;
