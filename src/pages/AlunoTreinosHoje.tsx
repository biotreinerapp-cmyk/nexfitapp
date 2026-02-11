import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import defaultExerciseImage from "@/assets/default-exercise.png";
import { BackIconButton } from "@/components/navigation/BackIconButton";

interface BibliotecaExercicio {
  id: string;
  nome: string | null;
  body_part: string | null;
  target_muscle: string | null;
  equipment: string | null;
  video_url: string | null;
  instrucoes: string[] | null;
}

interface AgendaTreinoRow {
  id: string;
  dia_semana: number | null;
  exercicios: any | null;
}

interface AgendaExercicioDia {
  exercicio_id: string;
  nome: string | null;
  body_part: string | null;
  target_muscle: string | null;
  equipment: string | null;
  video_url: string | null;
  instrucoes: string[] | null;
  series: number;
  repeticoes: number;
}

const diasSemanaLabel = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

const AlunoTreinosHojePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [criandoRotina, setCriandoRotina] = useState(false);
  const [exerciciosHoje, setExerciciosHoje] = useState<AgendaExercicioDia[]>([]);
  const [isRestDay, setIsRestDay] = useState(false);
  const [selected, setSelected] = useState<AgendaExercicioDia | null>(null);

  const hoje = useMemo(() => new Date(), []);
  const diaIndex = hoje.getDay();

  const carregarOuCriarAgenda = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: agendaExistente, error: agendaError } = await supabase
        .from("agenda_treinos")
        .select("id, dia_semana, exercicios")
        .eq("aluno_id", user.id);

      if (agendaError) {
        throw agendaError;
      }

      let agenda = (agendaExistente as AgendaTreinoRow[] | null) ?? [];

      if (!agenda.length) {
        setCriandoRotina(true);

        const { data: perfil, error: perfilError } = await supabase
          .from("profiles")
          .select("objetivo")
          .eq("id", user.id)
          .maybeSingle();

        if (perfilError) throw perfilError;

        const objetivo = (perfil?.objetivo || "").toLowerCase();

        let query = supabase
          .from("biblioteca_exercicios")
          .select("id, nome, body_part, target_muscle, equipment, video_url, instrucoes");

        if (objetivo.includes("massa")) {
          query = query.in("equipment", ["dumbbell", "barbell", "cable"]);
        }

        const fetchBiblioteca = async () => {
          const { data: exerciciosBase, error: exError } = await query.limit(100);
          if (exError) throw exError;
          return (exerciciosBase as BibliotecaExercicio[] | null) ?? [];
        };

        let listaBase = await fetchBiblioteca();

        if (!listaBase.length) {
          const now = Date.now();
          const throttleMs = 15 * 60 * 1000;
          const storageKey = "biotreiner:last_sync_exercises_attempt";

          let lastAttempt = 0;
          try {
            lastAttempt = Number(localStorage.getItem(storageKey) ?? 0);
          } catch {
            // ignore
          }

          if (lastAttempt && now - lastAttempt < throttleMs) {
            toast({
              title: "Biblioteca vazia",
              description:
                "A biblioteca ainda está vazia e a sincronização automática foi tentada há pouco. Tente novamente em alguns minutos.",
              variant: "destructive",
            });
            setIsRestDay(true);
            setExerciciosHoje([]);
            return;
          }

          try {
            localStorage.setItem(storageKey, String(now));
          } catch {
            // ignore
          }

          toast({
            title: "Sincronizando biblioteca…",
            description: "Estamos importando exercícios automaticamente. Isso pode levar alguns segundos.",
          });

          const { data: syncData, error: syncError } = await supabase.functions.invoke("sync-exercises", {
            body: {},
          });

          if (syncError) {
            toast({
              title: "Falha ao sincronizar",
              description: syncError.message,
              variant: "destructive",
            });
            setIsRestDay(true);
            setExerciciosHoje([]);
            return;
          }

          const imported = Number((syncData as any)?.imported ?? 0);
          const details = (syncData as any)?.details as string | undefined;

          if (imported > 0) {
            toast({
              title: "Biblioteca sincronizada",
              description: `${imported} exercícios importados. Gerando sua rotina…`,
            });
            listaBase = await fetchBiblioteca();
          } else {
            toast({
              title: "Biblioteca ainda vazia",
              description:
                details ??
                "Não foi possível importar exercícios automaticamente. Verifique a configuração/limites da API e tente novamente.",
              variant: "destructive",
            });
            setIsRestDay(true);
            setExerciciosHoje([]);
            return;
          }
        }

        if (!listaBase.length) {
          toast({
            title: "Biblioteca vazia",
            description: "Não foi possível carregar exercícios para gerar sua rotina.",
            variant: "destructive",
          });
          setIsRestDay(true);
          setExerciciosHoje([]);
          return;
        }
        const novaAgenda: Omit<AgendaTreinoRow, "id">[] = [] as any;

        for (let offset = 0; offset < 7; offset++) {
          const dia = (diaIndex + offset) % 7;

          // Domingo como dia de descanso
          if (dia === 0) {
            novaAgenda.push({ dia_semana: dia, exercicios: [] });
            continue;
          }

          const embaralhados = [...listaBase].sort(() => Math.random() - 0.5);
          const selecionados: AgendaExercicioDia[] = embaralhados.slice(0, 5).map((ex) => {
            const anyEx = ex as any;
            const normalizedVideoUrl = ex.video_url ?? anyEx.gifUrl ?? null;

            console.log("URL base do exercício ao criar agenda:", {
              id: ex.id,
              nome: ex.nome,
              video_url: ex.video_url,
              gifUrl: anyEx.gifUrl,
              normalizedVideoUrl,
            });

            return {
              exercicio_id: ex.id,
              nome: ex.nome,
              body_part: ex.body_part,
              target_muscle: ex.target_muscle,
              equipment: ex.equipment,
              video_url: normalizedVideoUrl,
              instrucoes: ex.instrucoes ?? [],
              series: objetivo.includes("massa") ? 4 : 3,
              repeticoes: objetivo.includes("massa") ? 10 : 15,
            };
          });

          novaAgenda.push({ dia_semana: dia, exercicios: selecionados });
        }

        const { error: insertError } = await (supabase as any)
          .from("agenda_treinos")
          .insert(
            novaAgenda.map((row) => ({
              aluno_id: user.id,
              dia_semana: row.dia_semana,
              exercicios: row.exercicios,
            })),
          );

        if (insertError) throw insertError;

        const { data: agendaNova, error: agendaNovaError } = await supabase
          .from("agenda_treinos")
          .select("id, dia_semana, exercicios")
          .eq("aluno_id", user.id);

        if (agendaNovaError) throw agendaNovaError;
        agenda = (agendaNova as AgendaTreinoRow[] | null) ?? [];

        toast({
          title: "Rotina criada",
          description: "Geramos automaticamente sua Semana de Treinos.",
        });
      }

      const hojeRow = agenda.find((row) => row.dia_semana === diaIndex) || null;

      if (!hojeRow || !hojeRow.exercicios) {
        setIsRestDay(true);
        setExerciciosHoje([]);
        return;
      }

      const exerciciosBrutos = Array.isArray(hojeRow.exercicios) ? hojeRow.exercicios : [];

      if (!exerciciosBrutos.length) {
        setIsRestDay(true);
        setExerciciosHoje([]);
        return;
      }

      // Normaliza dados vindos da agenda ou diretamente da API, convertendo gifUrl -> video_url
      const exerciciosDia: AgendaExercicioDia[] = exerciciosBrutos.map((raw: any) => ({
        exercicio_id: raw.exercicio_id ?? raw.id,
        nome: raw.nome ?? null,
        body_part: raw.body_part ?? null,
        target_muscle: raw.target_muscle ?? null,
        equipment: raw.equipment ?? null,
        video_url: raw.video_url ?? raw.gifUrl ?? null,
        instrucoes: raw.instrucoes ?? [],
        series: raw.series ?? 3,
        repeticoes: raw.repeticoes ?? 15,
      }));

      setIsRestDay(false);
      setExerciciosHoje(exerciciosDia);
    } catch (error: any) {
      console.error("Erro ao carregar treinos do dia", error);
      toast({
        title: "Erro nos treinos do dia",
        description: error.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setCriandoRotina(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregarOuCriarAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const hojeLabel = diasSemanaLabel[diaIndex];

  return (
    <main className="safe-bottom-floating-nav flex min-h-screen flex-col bg-background px-4 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <BackIconButton to="/aluno/dashboard" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Treino de Hoje</p>
          <h1 className="mt-1 page-title-gradient text-2xl font-semibold">{hojeLabel}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Sua rotina personalizada com base no seu objetivo.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Carregando seus treinos de hoje...
        </div>
      ) : isRestDay ? (
        <section className="mt-8 space-y-4">
          <Card className="border border-border bg-card/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4 text-primary" />
                Dia de recuperação ativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Hoje é seu dia de descanso programado. Use esse tempo para alongar, caminhar leve ou apenas recarregar as
                energias.
              </p>
              <p>
                Lembre-se: é durante a recuperação que seu corpo consolida os ganhos de treino. Amanhã voltamos com força
                total.
              </p>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="space-y-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Lista de exercícios do dia
          </p>

          <div className="space-y-3">
            {exerciciosHoje.map((ex) => {
              const anyEx = ex as any;
              const gifUrl = ex.video_url ?? anyEx.gifUrl ?? defaultExerciseImage;
              console.log("URL do GIF (lista):", gifUrl, "video_url:", ex.video_url, "gifUrl:", anyEx.gifUrl);

              return (
                <Card
                  key={ex.exercicio_id}
                  className="flex cursor-pointer overflow-hidden border border-border/70 bg-card/90 transition hover:border-primary hover:shadow-lg"
                  onClick={() => setSelected(ex)}
                >
                  <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {gifUrl ? (
                      <img
                        src={gifUrl}
                        alt={ex.nome ?? "Exercício"}
                        className="h-full w-full rounded-md object-cover"
                        loading="lazy"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        // @ts-expect-error: non-standard prop for clarity, ignored by browser
                        unoptimized="true"
                      />
                    ) : (
                      <div className="h-full w-full animate-pulse rounded-md bg-muted" />
                    )}
                  </div>
                  <CardContent className="flex flex-1 flex-col justify-center gap-1 p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{ex.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ex.body_part && <span>{ex.body_part}</span>}
                      {ex.target_muscle && <span>{ex.body_part ? " • " : ""}{ex.target_muscle}</span>}
                    </p>
                    <p className="text-[11px] font-medium text-primary">
                      {ex.series} séries x {ex.repeticoes} repetições
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

        {selected && (
          <section className="safe-bottom-content fixed inset-x-0 bottom-0 z-20 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-border/70 bg-background p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.95)]">
            <div className="mb-4 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Player de exercício</p>
                  <div className="space-y-2">
                    <h2 className="line-clamp-2 text-xl font-bold leading-snug text-foreground">{selected.nome}</h2>
                    {selected.series && selected.repeticoes && (
                      <p className="text-xs font-medium text-primary">
                        {selected.series} séries x {selected.repeticoes} repetições
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.body_part && (
                      <span className="rounded-full border border-border bg-background/30 px-2.5 py-1 text-[11px] text-muted-foreground">
                        {selected.body_part}
                      </span>
                    )}
                    {selected.target_muscle && (
                      <span className="rounded-full border border-border bg-background/20 px-2.5 py-1 text-[11px] text-muted-foreground">
                        {selected.target_muscle}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(null)}
                  className="shrink-0 text-xs"
                >
                  Fechar
                </Button>
              </div>

            <div className="space-y-3">
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-black/60">
                {(() => {
                  const anySelected = selected as any;
                  const gifUrl = selected.video_url ?? anySelected.gifUrl ?? defaultExerciseImage;
                  console.log(
                    "URL do GIF (modal):",
                    gifUrl,
                    "video_url:",
                    selected.video_url,
                    "gifUrl:",
                    anySelected.gifUrl,
                  );

                  return gifUrl ? (
                    <img
                      src={gifUrl}
                      alt={selected.nome ?? "Exercício"}
                      className="h-56 w-full object-cover"
                      loading="lazy"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      // @ts-expect-error: non-standard prop for clarity, ignored by browser
                      unoptimized="true"
                    />
                  ) : (
                    <div className="h-56 w-full animate-pulse bg-muted" />
                  );
                })()}
              </div>

              <div className="flex flex-col items-center gap-3">
                <Button
                  className="w-full py-3 text-sm font-semibold"
                  size="lg"
                  onClick={async () => {
                    if (!user) return;

                    const { data, error } = await (supabase as any)
                      .from("workout_sessions")
                      .insert({
                        user_id: user.id,
                        exercise_name: selected.nome || "Treino Academia",
                        target_muscles: selected.target_muscle ? [selected.target_muscle] : null,
                        series: selected.series,
                        repetitions: selected.repeticoes,
                        status: "em_andamento",
                        iniciado_em: new Date().toISOString(),
                      })
                      .select()
                      .single();

                    if (error) {
                      toast({
                        title: "Erro ao iniciar",
                        description: error.message,
                        variant: "destructive",
                      });
                      return;
                    }

                    navigate("/aluno/treino-ativo", {
                      state: {
                        sessaoId: data.id,
                        exercicio: selected,
                      },
                    });
                  }}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Iniciar Treino
                </Button>
              </div>

              {selected.instrucoes && selected.instrucoes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Instruções</p>
                  <ul className="max-h-32 space-y-1 overflow-y-auto pr-1 text-xs text-muted-foreground">
                    {selected.instrucoes.map((step, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        <span className="leading-snug">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default AlunoTreinosHojePage;
