import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ActivityType } from "@/lib/activityTypes";
import { BackIconButton } from "@/components/navigation/BackIconButton";

interface TreinoAtivoState {
  sessaoId?: string;
  exercicio?: {
    exercicio_id: string;
    nome: string | null;
    body_part: string | null;
    target_muscle: string | null;
    equipment: string | null;
    series: number;
    repeticoes: number;
  };
}

type StrengthCache = {
  userId: string;
  sessaoId: string;
  exercicio: TreinoAtivoState["exercicio"];
  currentSet: number;
  repsInCurrentSet: number;
  totalReps: number;
  elapsedSeconds: number;
  isRunning: boolean;
  bpm: number;
  calories: number;
  intensity: string;
  lastTickAt: number;
  updatedAt: string;
};

const musculacaoActivityType: ActivityType = {
  id: "musculacao",
  name: "Musculação",
  category: "estacionario",
  usesGps: false,
  usesDistance: false,
};

const AlunoTreinoAtivoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const state = (location.state as TreinoAtivoState | null) || null;
  const sessaoIdFromState = state?.sessaoId;
  const exercicioFromState = state?.exercicio;

  const [sessaoId, setSessaoId] = useState<string | undefined>(sessaoIdFromState);
  const [exercicio, setExercicio] = useState<TreinoAtivoState["exercicio"] | undefined>(exercicioFromState);

  const [currentSet, setCurrentSet] = useState(1);
  const [repsInCurrentSet, setRepsInCurrentSet] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const finalizeOnceRef = useRef(false);
  const [intensity, setIntensity] = useState("Moderada");
  const [bpm, setBpm] = useState(90);
  const [calories, setCalories] = useState(0);

  const getStrengthStorageKey = (userId: string, sessionId: string) => `biotreiner_strength_${userId}_${sessionId}`;

  // Restore após refresh (inclusive quando location.state some)
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;

    if (sessaoId && exercicio) return;

    try {
      const prefix = `biotreiner_strength_${user.id}_`;
      const candidates: StrengthCache[] = [];

      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as StrengthCache;
          if (parsed?.userId === user.id) candidates.push(parsed);
        } catch {
          // ignore
        }
      }

      if (!candidates.length) return;

      candidates.sort((a, b) => (b.lastTickAt ?? 0) - (a.lastTickAt ?? 0));
      const cached = candidates[0];
      if (!cached) return;

      setSessaoId(cached.sessaoId);
      setExercicio(cached.exercicio ?? undefined);

      const now = Date.now();
      const deltaSeconds = Math.max(0, Math.floor((now - cached.lastTickAt) / 1000));
      const catchUp = cached.isRunning;

      setCurrentSet(cached.currentSet ?? 1);
      setRepsInCurrentSet(cached.repsInCurrentSet ?? 0);
      setTotalReps(cached.totalReps ?? 0);
      setElapsedSeconds((cached.elapsedSeconds ?? 0) + (catchUp ? deltaSeconds : 0));
      setIsRunning(!!cached.isRunning);
      setBpm(cached.bpm ?? 90);
      setCalories((cached.calories ?? 0) + (catchUp ? deltaSeconds * 0.4 : 0));
      setIntensity(cached.intensity ?? "Moderada");
    } catch (e) {
      console.error("Falha ao restaurar treino ativo (musculação)", e);
    }
  }, [user, sessaoId, exercicio]);

  useEffect(() => {
    if (!sessaoId || !exercicio) {
      toast({
        title: "Sessão não encontrada",
        description: "Volte aos treinos do dia e selecione um exercício.",
        variant: "destructive",
      });
      navigate("/aluno/treinos", { replace: true });
    }
  }, [sessaoId, exercicio, navigate, toast]);

  // Timer + métricas
  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setBpm((prev) => {
        const variation = Math.round((Math.random() - 0.5) * 8);
        return Math.min(185, Math.max(65, prev + variation));
      });
      setCalories((prev) => prev + 0.4);
      setIntensity((prev) => {
        if (bpm > 155) return "Alta";
        if (bpm > 120) return "Moderada";
        return "Leve";
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, bpm]);

  // Persistência forte (para recover após refresh)
  useEffect(() => {
    if (!user || !sessaoId) return;
    if (typeof window === "undefined") return;

    const payload: StrengthCache = {
      userId: user.id,
      sessaoId,
      exercicio: exercicio ?? null,
      currentSet,
      repsInCurrentSet,
      totalReps,
      elapsedSeconds,
      isRunning,
      bpm,
      calories,
      intensity,
      lastTickAt: Date.now(),
      updatedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(getStrengthStorageKey(user.id, sessaoId), JSON.stringify(payload));
    } catch (e) {
      console.error("Falha ao persistir treino de musculação", e);
    }
  }, [user, sessaoId, exercicio, currentSet, repsInCurrentSet, totalReps, elapsedSeconds, isRunning, bpm, calories, intensity]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(elapsedSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [elapsedSeconds]);

  const handleAddRep = () => {
    if (!exercicio) return;

    setRepsInCurrentSet((prev) => {
      const next = prev + 1;
      setTotalReps((total) => total + 1);

      if (next >= exercicio.repeticoes) {
        if (currentSet < exercicio.series) {
          setCurrentSet((set) => set + 1);
          setRepsInCurrentSet(0);
          toast({
            title: "Série concluída",
            description: "Respire fundo e prepare-se para a próxima série.",
          });
        } else {
          toast({
            title: "Exercício concluído",
            description: "Você completou todas as séries planejadas.",
          });
        }
      }

      return next;
    });
  };

  const handleToggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const handleFinalizar = async () => {
    if (!user || !sessaoId || !exercicio) return;

    // Bloqueia clique duplo (state + ref síncrona)
    if (finalizeOnceRef.current || isFinalizing) return;
    finalizeOnceRef.current = true;
    setIsFinalizing(true);

    try {
      const { error } = await supabase
        .from("workout_sessions")
        .update({
          status: "finalizada",
          finalizado_em: new Date().toISOString(),
          series: exercicio.series,
          repetitions: exercicio.repeticoes,
          total_reps: totalReps || exercicio.series * exercicio.repeticoes,
          bpm_medio: bpm,
          calorias_estimadas: Math.round(calories),
          confirmado: true, // Confirmação explícita de treino concluído
        })
        .eq("id", sessaoId)
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: "Erro ao finalizar treino",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Limpa cache de persistência forte do treino de musculação para evitar restore indevido
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(`biotreiner_strength_${user.id}_${sessaoId}`);
        } catch (e) {
          console.warn("[AlunoTreinoAtivo] Falha ao limpar cache do treino ativo (musculação)", e);
        }
      }

      toast({
        title: "Treino confirmado",
        description: "Seu treino foi registrado e confirmado para a frequência semanal.",
      });

      navigate("/aluno/atividade-personalizar", {
        replace: false,
        state: {
          sessaoId,
          atividadeNome: exercicio.nome || "Treino de Força",
          elapsedSeconds,
          bpmMedio: bpm,
          caloriasEstimadas: calories,
          activityType: musculacaoActivityType,
          intensidade: intensity,
        },
      });
    } catch (error: any) {
      console.error("Erro ao finalizar workout_session", error);
      toast({
        title: "Erro inesperado",
        description: error.message ?? "Não foi possível salvar seu treino.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
      finalizeOnceRef.current = false;
    }
  };

  return (
    <main className="safe-bottom-content flex min-h-screen flex-col bg-background px-4 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <BackIconButton to="/aluno/treinos" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Treino Ativo</p>
          <h1 className="mt-1 page-title-gradient text-xl font-semibold">{exercicio?.nome || "Exercício"}</h1>
          {exercicio && (
            <p className="mt-1 text-xs text-muted-foreground">
              {exercicio.series} séries x {exercicio.repeticoes} repetições
            </p>
          )}
        </div>
      </header>

      {exercicio && (
        <section className="flex flex-1 flex-col gap-4">
          <Card className="border border-primary/40 bg-card/90">
            <CardHeader>
              <CardTitle className="text-sm">Progresso das séries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Imagem do grupo muscular trabalhado no exercício */}
              <div className="overflow-hidden rounded-xl border border-accent/40 bg-muted/10">
                <div className="flex items-center gap-3 p-3">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={exercicio?.body_part ? `/images/muscles/${exercicio.body_part}.png` : "/default-exercise.png"}
                      alt={
                        exercicio?.target_muscle
                          ? `Grupo muscular trabalhado: ${exercicio.target_muscle}`
                          : "Exercício em destaque"
                      }
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-1 flex-col text-xs">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Grupo muscular
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {exercicio.target_muscle || exercicio.body_part || "Musculatura alvo"}
                    </p>
                    {exercicio.equipment && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Equipamento: <span className="font-medium text-foreground">{exercicio.equipment}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dados de repetição da sessão atual */}
              <div className="space-y-1">
                <p>
                  Série atual: <span className="font-semibold">{currentSet}</span> de {exercicio.series}
                </p>
                <p>
                  Repetições na série: <span className="font-semibold">{repsInCurrentSet}</span> / {exercicio.repeticoes}
                </p>
                <p>
                  Total de repetições: <span className="font-semibold">{totalReps}</span>
                </p>
              </div>

              {/* Ações da sessão: cronômetro e incremento de repetições */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  variant={isRunning ? "outline" : "default"}
                  size="lg"
                  className="w-full"
                  onClick={handleToggleTimer}
                >
                  {isRunning ? "Pausar cronômetro" : "Iniciar cronômetro"}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  size="lg"
                  onClick={handleAddRep}
                >
                  +1 repetição
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-accent/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-sm">Intensidade e duração</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-xs">
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tempo</p>
                <span className="text-lg font-semibold tabular-nums">{formattedTime}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Frequência</p>
                <span className="text-lg font-semibold tabular-nums text-primary">{bpm} bpm</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Calorias</p>
                <span className="text-lg font-semibold tabular-nums text-accent">{Math.round(calories)} kcal</span>
              </div>
              <div className="col-span-3 mt-1 text-center text-[11px] text-muted-foreground">
                Intensidade estimada: <span className="font-semibold text-foreground">{intensity}</span>
              </div>
            </CardContent>
          </Card>

          <div className="mt-auto flex flex-col gap-2 pb-6">
            <Button className="w-full" size="lg" onClick={handleFinalizar} loading={isFinalizing}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Finalizar exercício e personalizar momento
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => navigate("/aluno/dashboard")}
            >
              Voltar para o dashboard
            </Button>
          </div>
        </section>
      )}
    </main>
  );
};

export default AlunoTreinoAtivoPage;
