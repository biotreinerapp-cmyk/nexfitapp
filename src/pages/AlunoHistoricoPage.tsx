import { useEffect, useMemo, useState } from "react";
import { Activity, Calendar as CalendarIcon, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVITY_TYPES, getActivityTypeById } from "@/lib/activityTypes";
import { formatDistanceKm } from "@/lib/formatters";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { withSchemaCacheRetry } from "@/lib/supabaseResilience";

type HistoricoItem = {
  id: string;
  activity_type: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  distance_km: number | null;
  calories: number | null;
  extras?: any | null;
  legacy_source?: "workout_history" | "atividade_sessao" | "workout_sessions";
};

const formatDuration = (durationSeconds: number | null, startedAt?: string, endedAt?: string | null) => {
  let seconds = durationSeconds ?? null;

  if (seconds == null && startedAt && endedAt) {
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      seconds = Math.round((end - start) / 1000);
    }
  }

  if (!seconds || seconds <= 0) return "—";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h${m ? ` ${m} min` : ""}`;
};

const PAGE_SIZE = 20;

const AlunoHistoricoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const defaultStart = useMemo(() => startOfDay(subDays(new Date(), 7)), []);
  const defaultEnd = useMemo(() => endOfDay(new Date()), []);

  const [atividades, setAtividades] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // Filtros
  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const [activityType, setActivityType] = useState<string>("all");
  const [privacy, setPrivacy] = useState<string>("all");

  const dateLabel = useMemo(() => {
    const start = format(startDate, "dd/MM/yyyy", { locale: ptBR });
    const end = format(endDate, "dd/MM/yyyy", { locale: ptBR });
    return `${start} → ${end}`;
  }, [startDate, endDate]);

  const buildWorkoutHistoryQuery = () => {
    if (!user) return null;

    // Nota: por performance, NÃO buscamos gps_points na lista.
    let q = (supabase as any)
      .from("workout_history")
      .select("id, activity_type, started_at, ended_at, duration_seconds, distance_km, calories, extras")
      .eq("user_id", user.id)
      .gte("started_at", startOfDay(startDate).toISOString())
      .lte("started_at", endOfDay(endDate).toISOString());

    if (activityType !== "all") q = q.eq("activity_type", activityType);
    if (privacy !== "all") q = q.eq("privacy", privacy);

    return q.order("started_at", { ascending: false });
  };

  const fetchPage = async (nextPage: number) => {
    const q = buildWorkoutHistoryQuery();
    if (!q) return { items: [] as HistoricoItem[], hasMore: false };

    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      const resp = await withSchemaCacheRetry<{ data: any[] | null }>(
        () => (q as any).range(from, to).throwOnError(),
        { label: `historico:workout_history:p${nextPage}` },
      );

      const data = (resp as any)?.data as any[] | null | undefined;

      const rows = ((data as any[] | null) ?? []).map((row) => ({
        id: row.id,
        activity_type: row.activity_type,
        started_at: row.started_at,
        ended_at: row.ended_at,
        duration_seconds: row.duration_seconds ?? null,
        distance_km: row.distance_km ?? null,
        calories: row.calories ?? null,
        extras: row.extras ?? null,
        legacy_source: "workout_history" as const,
      })) as HistoricoItem[];

      // Heurística simples: se veio página cheia, provavelmente ainda tem mais
      return { items: rows, hasMore: rows.length === PAGE_SIZE };
    } catch (error) {
      console.error("Erro ao carregar histórico (workout_history)", {
        error,
        filters: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), activityType, privacy },
        page: nextPage,
        range: { from, to },
      });
      return { items: [] as HistoricoItem[], hasMore: false };
    }

  };

  const resetAndFetch = async () => {
    if (!user) return;
    setLoading(true);
    setPage(0);

    // Primário: workout_history com filtros + paginação
    const first = await fetchPage(0);

    // Fallback legado (apenas se NÃO houver dados no período e filtros estiverem no padrão)
    // Mantemos simples para não reintroduzir lentidão.
    if (!first.items.length && activityType === "all" && privacy === "all") {
      const startIso = startOfDay(startDate).toISOString();
      const endIso = endOfDay(endDate).toISOString();

      const [cardioResp, muscuResp] = await Promise.all([
        (supabase as any)
          .from("atividade_sessao")
          .select("id, tipo_atividade, status, iniciado_em, finalizado_em, distance_km, calorias_estimadas")
          .eq("user_id", user.id)
          .eq("status", "finalizada")
          .gte("iniciado_em", startIso)
          .lte("iniciado_em", endIso)
          .order("finalizado_em", { ascending: false }),
        (supabase as any)
          .from("workout_sessions")
          .select("id, status, iniciado_em, finalizado_em, exercise_name, calorias_estimadas")
          .eq("user_id", user.id)
          .eq("status", "finalizada")
          .gte("iniciado_em", startIso)
          .lte("iniciado_em", endIso)
          .order("finalizado_em", { ascending: false }),
      ]);

      if (cardioResp.error) console.error("Erro ao carregar histórico legado (atividade_sessao)", cardioResp.error);
      if (muscuResp.error) console.error("Erro ao carregar histórico legado (workout_sessions)", muscuResp.error);

      const cardioData = (cardioResp.data as any[] | null) ?? [];
      const muscuData = (muscuResp.data as any[] | null) ?? [];

      const fallbackItems: HistoricoItem[] = [
        ...cardioData.map((row) => ({
          id: row.id,
          activity_type: row.tipo_atividade,
          started_at: row.iniciado_em,
          ended_at: row.finalizado_em,
          duration_seconds: null,
          distance_km: row.distance_km,
          calories: row.calorias_estimadas ?? null,
          extras: null,
          legacy_source: "atividade_sessao" as const,
        })),
        ...muscuData.map((row) => ({
          id: row.id,
          activity_type: "musculacao",
          started_at: row.iniciado_em,
          ended_at: row.finalizado_em,
          duration_seconds: null,
          distance_km: null,
          calories: row.calorias_estimadas ?? null,
          extras: null,
          legacy_source: "workout_sessions" as const,
        })),
      ].sort((a, b) => {
        const aDate = new Date(a.ended_at || a.started_at || 0).getTime();
        const bDate = new Date(b.ended_at || b.started_at || 0).getTime();
        return bDate - aDate;
      });

      setAtividades(fallbackItems);
      setHasMore(false);
      setLoading(false);
      return;
    }

    setAtividades(first.items);
    setHasMore(first.hasMore);
    setLoading(false);
  };

  useEffect(() => {
    void resetAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, startDate, endDate, activityType, privacy]);

  const handleLoadMore = async () => {
    if (loadingMore || loading || !hasMore) return;
    const nextPage = page + 1;

    setLoadingMore(true);
    const next = await fetchPage(nextPage);
    setAtividades((prev) => [...prev, ...next.items]);
    setPage(nextPage);
    setHasMore(next.hasMore);
    setLoadingMore(false);
  };

  const clearFilters = () => {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setActivityType("all");
    setPrivacy("all");
  };

  return (
    <main className="safe-bottom-content flex min-h-screen flex-col bg-background px-4 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <BackIconButton to="/aluno/perfil" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Área do Aluno</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-semibold">Seu histórico</h1>
        </div>
      </header>

      <section className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-card/80 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <p className="text-xs font-medium text-foreground">Filtros</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="text-[11px]">
              Limpar
            </Button>
          </div>

          <Separator className="my-3" />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="secondary" className="justify-start gap-2 text-left">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="truncate text-xs">{dateLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Data início</p>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(startOfDay(d))}
                    initialFocus
                  />
                  <Separator />
                  <p className="text-xs font-medium text-foreground">Data fim</p>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => d && setEndDate(endOfDay(d))}
                  />
                </div>
              </PopoverContent>
            </Popover>

            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={privacy} onValueChange={setPrivacy}>
              <SelectTrigger>
                <SelectValue placeholder="Privacidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="public">Públicas</SelectItem>
                <SelectItem value="private">Privadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground">Dica: use o filtro de datas para não carregar seu histórico inteiro.</p>
        </div>
      </section>

      <section className="flex-1 space-y-2 pb-4">
        <h2 className="text-sm font-medium text-foreground">Atividades registradas</h2>
        <p className="text-[11px] text-muted-foreground">Resultados do período selecionado, da mais recente para a mais antiga.</p>

        <div className="mt-2 space-y-2">
          {loading ? (
            <p className="text-[11px] text-muted-foreground">Carregando atividades...</p>
          ) : atividades.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhuma atividade encontrada nesse período.</p>
          ) : (
            atividades.map((sessao) => {
              const tipo = getActivityTypeById(sessao.activity_type);
              const nomeAtividade = tipo?.name ?? sessao.activity_type;

              const dataBase = sessao.ended_at ?? sessao.started_at;
              const data = dataBase ? new Date(dataBase) : null;
              const dataFormatada = data
                ? data.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "Data não informada";

              const duracaoTexto = formatDuration(sessao.duration_seconds, sessao.started_at, sessao.ended_at);

              const parts: string[] = [dataFormatada, duracaoTexto];

              if (sessao.distance_km != null && sessao.distance_km > 0) {
                parts.push(formatDistanceKm(sessao.distance_km));
              }

              if (sessao.calories != null && sessao.calories > 0) {
                parts.push(`${Math.round(sessao.calories)} kcal`);
              }

              const linhaSecundaria = parts.join(" • ");

              return (
                <div
                  key={sessao.id}
                  className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/80 px-3 py-2 text-left text-xs transition-colors hover:border-primary"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/aluno/historico/${sessao.id}`)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/50">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-medium text-foreground">{nomeAtividade}</span>
                      <span className="truncate text-[11px] text-muted-foreground">{linhaSecundaria}</span>
                    </div>
                  </button>

                  <div className="ml-2 flex items-center gap-2">
                    <span className="hidden text-[11px] text-muted-foreground sm:inline">Ver detalhes</span>
                  </div>
                </div>
              );
            })
          )}

          {!loading && atividades.length > 0 && (
            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={!hasMore || loadingMore}
                onClick={handleLoadMore}
                loading={loadingMore}
              >
                {hasMore ? "Carregar mais" : "Fim do histórico"}
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default AlunoHistoricoPage;

