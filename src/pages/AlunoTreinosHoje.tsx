import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle, Target, Info, CheckCircle2, Dumbbell, Zap, Timer, ChevronRight, Activity } from "lucide-react";
import { SecureVideo } from "@/components/ui/SecureVideo";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { translateInstructions } from "@/lib/translateExercise";
import { cn } from "@/lib/utils";

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || "7abffdb721mshe6edf9169775d83p1212ffjsn4c407842489b";
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
              description: `${imported} exercícios importados.Gerando sua rotina…`,
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
    <main className="safe-bottom-main flex min-h-screen flex-col bg-background px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackIconButton to="/aluno/dashboard" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Treino de Hoje</p>
            <h1 className="page-title-gradient text-3xl font-black tracking-tighter">{hojeLabel}</h1>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-primary">
          <Dumbbell className="h-5 w-5" />
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Carregando seus treinos de hoje...
        </div>
      ) : isRestDay ? (
        <section className="mt-4 flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-primary/10 text-primary shadow-2xl shadow-primary/20">
              <Zap className="h-10 w-10" />
            </div>
            <div className="absolute -right-2 -top-2 flex h-8 w-8 animate-bounce items-center justify-center rounded-full bg-background border border-border shadow-lg">
              <span className="text-xs">🧘</span>
            </div>
          </div>

          <div className="max-w-[280px] space-y-3">
            <h2 className="text-xl font-black tracking-tight text-foreground uppercase tracking-widest">Recuperação Ativa</h2>
            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl">
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                Hoje é seu dia de descanso programado. Use esse tempo para alongar, caminhar leve ou apenas recarregar as energias.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                  Músculos em consolidacão
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            <span>Lista de exercícios</span>
            <span className="text-primary">{exerciciosHoje.length} totais</span>
          </div>

          <div className="space-y-3">
            {exerciciosHoje.map((ex, idx) => {
              const anyEx = ex as any;
              const gifUrl = ex.video_url ?? anyEx.gifUrl ?? defaultExerciseImage;

              return (
                <div
                  key={ex.exercicio_id}
                  className={cn(
                    "group relative flex cursor-pointer overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent p-3 transition-all active:scale-[0.98] backdrop-blur-xl",
                    "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                  )}
                  style={{ animationDelay: `${idx * 100}ms` }}
                  onClick={() => setSelected(ex)}
                >
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-black/40">
                    {gifUrl ? (
                      gifUrl.endsWith(".mp4") ? (
                        <SecureVideo
                          src={gifUrl}
                          exerciseId={ex.exercicio_id}
                          apiKey={RAPIDAPI_KEY}
                          className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={gifUrl}
                          alt={ex.nome ?? "Exercício"}
                          className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          loading="lazy"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                        />
                      )
                    ) : (
                      <div className="h-full w-full animate-pulse bg-white/5" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="flex flex-1 flex-col justify-center gap-1.5 pl-4 pr-2">
                    <p className="line-clamp-1 text-sm font-black text-foreground tracking-tight uppercase">{ex.nome}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                        {ex.target_muscle || ex.body_part || "Força"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5">
                        <Zap className="h-3 w-3 text-primary" />
                        <span className="text-[11px] font-black text-primary">{ex.series}x{ex.repeticoes}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-300">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setSelected(null)}
          />
          <section className="safe-bottom-content relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-[40px] border-t border-white/10 bg-[#182229]/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-500 fill-mode-both">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/10 mb-6" />

            <div className="px-6 pb-12">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Player de exercício</p>
                  <h2 className="text-2xl font-black leading-tight text-foreground uppercase tracking-tight">{selected.nome}</h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
                  <Target className="h-6 w-6" />
                </div>
              </div>

              <div className="relative mb-6 overflow-hidden rounded-[32px] border border-white/10 bg-black/40">
                {(() => {
                  const anySelected = selected as any;
                  const gifUrl = selected.video_url ?? anySelected.gifUrl ?? defaultExerciseImage;

                  return gifUrl ? (
                    gifUrl.endsWith(".mp4") ? (
                      <SecureVideo
                        src={gifUrl}
                        exerciseId={selected.exercicio_id}
                        apiKey={RAPIDAPI_KEY}
                        className="aspect-square w-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls={false}
                      />
                    ) : (
                      <img
                        src={gifUrl}
                        alt={selected.nome ?? "Exercício"}
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    )
                  ) : (
                    <div className="aspect-square w-full animate-pulse bg-white/5" />
                  );
                })()}

                <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                  <div className="flex items-center gap-2 rounded-2xl bg-black/60 px-4 py-2 backdrop-blur-md">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black text-white">{selected.series} séries</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-black/60 px-4 py-2 backdrop-blur-md">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black text-white">{selected.repeticoes} reps</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex flex-col gap-1 rounded-3xl border border-white/5 bg-white/[0.03] p-4 text-center">
                  <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Alvo principal</span>
                  <span className="text-xs font-bold text-foreground capitalize">{selected.target_muscle || "Corpo Todo"}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-3xl border border-white/5 bg-white/[0.03] p-4 text-center">
                  <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Equipamento</span>
                  <span className="text-xs font-bold text-foreground capitalize">{selected.equipment || "Nenhum"}</span>
                </div>
              </div>

              {selected.instrucoes && selected.instrucoes.length > 0 && (
                <div className="mb-8 space-y-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">
                    <Info className="h-3 w-3" />
                    Guia de Execução
                  </h3>
                  <div className="space-y-3">
                    {translateInstructions(selected.instrucoes).map((step, idx) => (
                      <div key={idx} className="flex gap-4 items-start border-l border-white/5 pl-4 ml-1">
                        <span className="text-[10px] font-black text-primary/40 pt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                        <p className="text-xs leading-relaxed text-muted-foreground font-medium">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  className="variant-premium w-full py-8 text-sm font-black uppercase tracking-widest rounded-3xl"
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
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Iniciar Série
                </Button>
                <Button
                  variant="ghost"
                  className="w-full py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                  onClick={() => setSelected(null)}
                >
                  Continuar explorando
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      <FloatingNavIsland />
    </main>
  );
};

export default AlunoTreinosHojePage;
