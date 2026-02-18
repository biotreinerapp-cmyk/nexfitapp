import { useEffect, useMemo, useState } from "react";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { useNavigate, useParams } from "react-router-dom";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceKm } from "@/lib/formatters";
import { getActivityTypeById } from "@/lib/activityTypes";
import { BackIconButton } from "@/components/navigation/BackIconButton";

type HistoryDetail = {
  id: string;
  activity_type: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  distance_km: number | null;
  calories: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  pace_avg: number | null;
  gps_points: any | null;
  intensity: any | null;
  equipment: string[] | null;
  notes: string | null;
  extras: any | null;
};

const formatDuration = (durationSeconds: number | null) => {
  if (!durationSeconds || durationSeconds <= 0) return "—";
  const minutes = Math.round(durationSeconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h${m ? ` ${m} min` : ""}`;
};

const AlunoHistoricoDetalhePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<HistoryDetail | null>(null);

  const load = async () => {
    if (!user || !id) return;
    setLoading(true);

    // Primário: tabela unificada
    const { data: whData, error: whError } = await (supabase as any)
      .from("workout_history")
      .select(
        "id, activity_type, started_at, ended_at, duration_seconds, distance_km, calories, avg_hr, max_hr, pace_avg, gps_points, intensity, equipment, notes, extras",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (whError) {
      console.error("Erro ao carregar detalhe do histórico (workout_history)", whError);
    }

    if (whData) {
      setItem((whData as any) ?? null);
      setLoading(false);
      return;
    }

    // Fallback: tabelas legadas (IDs antigos)
    const [cardioResp, muscuResp] = await Promise.all([
      (supabase as any)
        .from("atividade_sessao")
        .select(
          "id, tipo_atividade, iniciado_em, finalizado_em, distance_km, calorias_estimadas, bpm_medio, pace_avg, route",
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      (supabase as any)
        .from("workout_sessions")
        .select(
          "id, iniciado_em, finalizado_em, calorias_estimadas, series, repetitions, total_reps, target_muscles, exercise_name",
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (cardioResp.error) {
      console.error("Erro ao carregar detalhe legado (atividade_sessao)", cardioResp.error);
    }
    if (muscuResp.error) {
      console.error("Erro ao carregar detalhe legado (workout_sessions)", muscuResp.error);
    }

    if (cardioResp.data) {
      const row = cardioResp.data as any;
      const mapped: HistoryDetail = {
        id: row.id,
        activity_type: row.tipo_atividade,
        started_at: row.iniciado_em,
        ended_at: row.finalizado_em,
        duration_seconds: null,
        distance_km: row.distance_km ?? null,
        calories: row.calorias_estimadas ?? null,
        avg_hr: row.bpm_medio ?? null,
        max_hr: null,
        pace_avg: row.pace_avg ?? null,
        gps_points: row.route ?? null,
        intensity: null,
        equipment: null,
        notes: null,
        extras: { legacy_source: "atividade_sessao" },
      };
      setItem(mapped);
      setLoading(false);
      return;
    }

    if (muscuResp.data) {
      const row = muscuResp.data as any;
      const mapped: HistoryDetail = {
        id: row.id,
        activity_type: "musculacao",
        started_at: row.iniciado_em,
        ended_at: row.finalizado_em,
        duration_seconds: null,
        distance_km: null,
        calories: row.calorias_estimadas ?? null,
        avg_hr: null,
        max_hr: null,
        pace_avg: null,
        gps_points: null,
        intensity: null,
        equipment: row.target_muscles ?? null,
        notes: row.exercise_name ? `Exercício: ${row.exercise_name}` : null,
        extras: {
          legacy_source: "workout_sessions",
          sets_data: null,
          summary: {
            series: row.series ?? null,
            repetitions: row.repetitions ?? null,
            total_reps: row.total_reps ?? null,
          },
        },
      };
      setItem(mapped);
      setLoading(false);
      return;
    }

    setItem(null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const isMusculacao = useMemo(() => {
    const key = (item?.activity_type ?? "").toLowerCase();
    return key === "musculacao" || key.includes("muscul") || key.includes("força") || key.includes("forca");
  }, [item?.activity_type]);

  const setsData = useMemo(() => {
    const raw = item?.extras?.sets_data;
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    return null;
  }, [item?.extras]);

  const hasGps = useMemo(() => {
    const points = item?.gps_points;
    return Array.isArray(points) && points.length > 0;
  }, [item?.gps_points]);

  const handleCompartilhar = () => {
    if (!item) return;

    // elapsedSeconds é obrigatório na tela de personalização
    const elapsedSeconds = (() => {
      if (typeof item.duration_seconds === "number" && item.duration_seconds > 0) return item.duration_seconds;
      const start = item.started_at ? new Date(item.started_at).getTime() : NaN;
      const end = item.ended_at ? new Date(item.ended_at).getTime() : NaN;
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) return Math.round((end - start) / 1000);
      return null;
    })();

    if (!elapsedSeconds) {
      toast.error("Não foi possível identificar a duração desta atividade para compartilhar.");
      return;
    }

    const activityType =
      getActivityTypeById((item.activity_type ?? "").toLowerCase().trim()) ?? undefined;
    const gpsRoute = Array.isArray(item.gps_points)
      ? item.gps_points
        .map((p: any) => {
          const lat = typeof p?.lat === "number" ? p.lat : typeof p?.latitude === "number" ? p.latitude : null;
          const lng = typeof p?.lng === "number" ? p.lng : typeof p?.longitude === "number" ? p.longitude : null;
          if (lat == null || lng == null) return null;
          return {
            lat,
            lng,
            timestamp: typeof p?.timestamp === "number" ? p.timestamp : undefined,
          };
        })
        .filter(Boolean)
      : undefined;

    navigate("/aluno/atividade-personalizar", {
      replace: false,
      state: {
        sessaoId: item.id,
        atividadeNome: item.activity_type,
        elapsedSeconds,
        bpmMedio: item.avg_hr ?? undefined,
        caloriasEstimadas: item.calories ?? undefined,
        activityType,
        // Para atividades com GPS, reaproveitamos os dados já salvos no histórico
        distanceKm: item.distance_km ?? undefined,
        paceAvg: item.pace_avg ?? undefined,
        gpsRoute: gpsRoute && gpsRoute.length > 0 ? gpsRoute : undefined,
      },
    });
  };

  return (
    <main className="safe-bottom-main flex min-h-screen flex-col bg-background px-4 pt-6 pb-32">
      <header className="mb-4 flex items-center gap-3">
        <BackIconButton onClick={() => navigate(-1)} />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Área do Aluno</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-semibold">Detalhes da atividade</h1>
          <p className="mt-1 text-xs text-muted-foreground">Visualize seus dados e ações rápidas.</p>
        </div>
      </header>

      {loading ? (
        <p className="text-[11px] text-muted-foreground">Carregando...</p>
      ) : !item ? (
        <p className="text-[11px] text-muted-foreground">Atividade não encontrada (workout_history e tabelas legadas).</p>
      ) : (
        <section className="space-y-3">
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">{item.activity_type}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Duração</span>
                <span className="text-foreground">{formatDuration(item.duration_seconds)}</span>
              </div>

              {!isMusculacao && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Distância</span>
                    <span className="text-foreground">{formatDistanceKm(item.distance_km)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Calorias</span>
                    <span className="text-foreground">{item.calories != null ? `${item.calories}` : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>FC média</span>
                    <span className="text-foreground">{item.avg_hr != null ? `${item.avg_hr} bpm` : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>FC máx</span>
                    <span className="text-foreground">{item.max_hr != null ? `${item.max_hr} bpm` : "—"}</span>
                  </div>
                </>
              )}

              {isMusculacao && (
                <>
                  {setsData ? (
                    <div className="mt-2 rounded-lg border border-border/60 bg-background/40 p-3">
                      <p className="text-xs font-semibold text-foreground">Séries (em estruturação)</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Encontramos <span className="font-medium text-foreground">{setsData.length}</span> registro(s) em
                        <code className="mx-1 rounded bg-muted px-1 py-0.5">extras.sets_data</code>.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Séries/Reps ainda não disponíveis. Em breve vamos salvar isso em
                      <code className="mx-1 rounded bg-muted px-1 py-0.5">extras.sets_data</code>.
                    </p>
                  )}

                  {item.calories != null && item.calories > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Calorias</span>
                      <span className="text-foreground">{Math.round(item.calories)} kcal</span>
                    </div>
                  )}
                </>
              )}

              {hasGps && (
                <div className="mt-2 rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-xs font-semibold text-foreground">Resumo do cardio (GPS)</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Pace médio</span>
                      <span className="text-foreground">
                        {item.pace_avg != null ? `${Number(item.pace_avg).toFixed(2)} min/km` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Pontos GPS</span>
                      <span className="text-foreground">{Array.isArray(item.gps_points) ? item.gps_points.length : "—"}</span>
                    </div>
                  </div>
                </div>
              )}

              {item.notes && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-foreground">Notas</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Ações</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={handleCompartilhar}
              >
                <Share2 className="h-4 w-4" />
                Compartilhar / gerar imagem
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
      <FloatingNavIsland />
    </main>
  );
};

export default AlunoHistoricoDetalhePage;
