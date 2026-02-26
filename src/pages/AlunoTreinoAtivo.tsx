import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Timer, Activity, Flame, Zap, Play, Pause, Dumbbell, Target, Weight, Info, ChevronDown, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ActivityType } from "@/lib/activityTypes";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { SecureVideo } from "@/components/ui/SecureVideo";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { cn } from "@/lib/utils";
import { SpotifyButton } from "@/components/ui/SpotifyButton";
import { useBluetoothHeartRate } from "@/hooks/useBluetoothHeartRate";
import { useUserProfile } from "@/hooks/useUserProfile";
import { translateInstructions } from "@/lib/translateExercise";
import { Watch, BluetoothSearching, BluetoothConnected } from "lucide-react";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { enqueueStrengthSession } from "@/lib/offlineQueue";

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || "7abffdb721mshe6edf9169775d83p1212ffjsn4c407842489b";

interface TreinoAtivoState {
  sessaoId?: string;
  exercicio?: {
    exercicio_id: string;
    nome: string | null;
    body_part: string | null;
    target_muscle: string | null;
    equipment: string | null;
    video_url: string | null;
    instrucoes?: string[] | null;
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
  metValue: 5.0,
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

  const { heartRate: bleHeartRate, isConnected: isBleConnected, isConnecting: isBleConnecting, connect: connectBle, disconnect: disconnectBle } = useBluetoothHeartRate();
  const { profile } = useUserProfile();
  const { isOnline } = useConnectionStatus({ silent: true });

  const getYouTubeId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url?.match(regex);
    return match ? match[1] : null;
  };

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

      // HEART RATE: Prioriza Wearable (BLE), se não usa simulação
      if (isBleConnected && bleHeartRate) {
        setBpm(bleHeartRate);
      } else {
        setBpm((prev) => {
          const variation = Math.round((Math.random() - 0.5) * 8);
          return Math.min(185, Math.max(65, prev + variation));
        });
      }

      // CALORIES: MET * Weight * Time (Scientific Formula)
      const weight = profile?.peso_kg || 75; // Default 75kg
      const met = musculacaoActivityType.metValue;
      const caloriesPerSecond = (met * weight * 3.5) / 12000;

      setCalories((prev) => prev + caloriesPerSecond);

      setIntensity((prev) => {
        if (bpm > 155) return "Alta";
        if (bpm > 120) return "Moderada";
        return "Leve";
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, bpm, profile, isBleConnected, bleHeartRate]);

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

    if (finalizeOnceRef.current || isFinalizing) return;
    finalizeOnceRef.current = true;
    setIsFinalizing(true);

    const finalizadoEm = new Date().toISOString();
    const caloriasArredondadas = Math.round(calories);

    // ─── Helper: limpar cache local ──────────────────────────────────────────
    const clearLocalCache = () => {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(`biotreiner_strength_${user.id}_${sessaoId}`);
        } catch (e) {
          console.warn("[AlunoTreinoAtivo] Falha ao limpar cache do treino ativo", e);
        }
      }
    };

    // ─── Helper: navegar para resumo ────────────────────────────────────────
    const navigateToSummary = () => {
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
    };

    // ─── OFFLINE: salvar na fila IndexedDB ───────────────────────────────────
    if (!isOnline) {
      try {
        await enqueueStrengthSession({
          id: sessaoId,
          userId: user.id,
          exercicioNome: exercicio.nome || "Treino de Força",
          series: exercicio.series,
          repetitions: exercicio.repeticoes,
          totalReps: totalReps || exercicio.series * exercicio.repeticoes,
          bpmMedio: bpm,
          caloriasEstimadas: caloriasArredondadas,
          finalizadoEm,
        });

        clearLocalCache();
        toast({
          title: "Treino salvo localmente",
          description: "Sem conexão. Seus dados serão sincronizados assim que você voltar online.",
        });
        navigateToSummary();
      } catch (err: any) {
        console.error("[AlunoTreinoAtivo] Erro ao salvar offline:", err);
        toast({
          title: "Erro ao salvar offline",
          description: "Não foi possível salvar o treino. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsFinalizing(false);
        finalizeOnceRef.current = false;
      }
      return;
    }

    // ─── ONLINE: fluxo normal via Supabase ───────────────────────────────────
    try {
      const { error } = await supabase
        .from("workout_sessions")
        .update({
          status: "finalizada",
          finalizado_em: finalizadoEm,
          series: exercicio.series,
          repetitions: exercicio.repeticoes,
          total_reps: totalReps || exercicio.series * exercicio.repeticoes,
          bpm_medio: bpm,
          calorias_estimadas: caloriasArredondadas,
          confirmado: true,
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

      clearLocalCache();
      toast({
        title: "Treino confirmado",
        description: "Seu treino foi registrado e confirmado para a frequência semanal.",
      });
      navigateToSummary();
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
    // pb-36 reserves space for the sticky footer bar
    <div className="flex min-h-screen flex-col bg-background px-4 pt-6 pb-36">

      {/* ── Compact Header ── */}
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BackIconButton to="/aluno/treinos" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-none mb-0.5">Treino Ativo</p>
            {/* ① Compact title — text-lg instead of text-2xl */}
            <h1 className="text-base font-black tracking-tight uppercase leading-tight text-foreground truncate max-w-[200px]">
              {exercicio?.nome || "Série Ativa"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <SpotifyButton className={cn(isRunning && "animate-pulse border-[#1DB954]/40 shadow-[0_0_15px_rgba(29,185,84,0.2)]")} />
          <Button
            variant="ghost"
            size="icon"
            onClick={isBleConnected ? disconnectBle : connectBle}
            className={cn(
              "h-9 w-9 rounded-xl transition-all active:scale-90",
              isBleConnected
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-white/5 text-muted-foreground border border-white/5",
              isBleConnecting && "animate-pulse"
            )}
          >
            {isBleConnecting ? <BluetoothSearching className="h-4 w-4" /> : isBleConnected ? <BluetoothConnected className="h-4 w-4" /> : <Watch className="h-4 w-4" />}
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-primary">
            <Activity className="h-4 w-4 animate-pulse" />
          </div>
        </div>
      </header>

      {exercicio && (
        <section className="flex flex-1 flex-col gap-4">

          {/* ② YouTube / Video Player — 16:9, fills width */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-black/40">
            <div className="aspect-video w-full">
              {exercicio.video_url && exercicio.video_url.endsWith(".mp4") ? (
                <SecureVideo
                  src={exercicio.video_url}
                  apiKey={RAPIDAPI_KEY}
                  className="h-full w-full object-cover"
                  autoPlay loop muted playsInline
                />
              ) : exercicio.video_url && getYouTubeId(exercicio.video_url) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(exercicio.video_url)}?autoplay=1&mute=0&modestbranding=1&rel=0`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <img
                  src={exercicio.video_url || "/default-exercise.png"}
                  alt={exercicio.nome || "Exercício"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Overlay pill — series × reps */}
              <div className="absolute top-3 left-3">
                <div className="flex items-center gap-1.5 rounded-xl bg-black/70 px-3 py-1.5 backdrop-blur-md border border-white/10">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-black text-white">
                    {exercicio.series} × {exercicio.repeticoes}
                  </span>
                </div>
              </div>
            </div>

            {/* ③ Status row under video — real data */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-3.5 w-3.5 text-primary shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none">Grupo</p>
                  <p className="text-xs font-black text-foreground capitalize">
                    {exercicio.target_muscle || exercicio.body_part || "Força Geral"}
                  </p>
                </div>
              </div>
              <div className="h-6 w-px bg-white/5" />
              <div className="flex items-center gap-2">
                <Weight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none">Equipamento</p>
                  <p className="text-xs font-bold text-muted-foreground capitalize">
                    {exercicio.equipment || "Peso Corporal"}
                  </p>
                </div>
              </div>
              <div className="h-6 w-px bg-white/5" />
              <div className="flex items-center gap-2">
                <Timer className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 leading-none">Tempo</p>
                  <p className="text-xs font-black text-foreground tabular-nums">{formattedTime}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid (BPM · Kcal · Intensidade) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="relative overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.03] p-3 text-center">
              <Activity className="absolute -right-1 -top-1 h-8 w-8 text-primary/10" />
              <p className="text-[8px] font-black uppercase tracking-widest text-primary/60 mb-0.5">BPM</p>
              <p className="text-lg font-black text-foreground tabular-nums">{bpm}</p>
            </div>
            <div className="relative overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.03] p-3 text-center">
              <Flame className="absolute -right-1 -top-1 h-8 w-8 text-orange-500/10" />
              <p className="text-[8px] font-black uppercase tracking-widest text-orange-500/60 mb-0.5">Kcal</p>
              <p className="text-lg font-black text-foreground tabular-nums">{Math.round(calories)}</p>
            </div>
            <div className="relative overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.03] p-3 text-center">
              <Target className="absolute -right-1 -top-1 h-8 w-8 text-emerald-500/10" />
              <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60 mb-0.5">Nível</p>
              <p className="text-sm font-black text-emerald-400">{intensity}</p>
            </div>
          </div>

          {/* Series progress + Rep counter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Série <span className="text-primary">{currentSet}</span> de {exercicio.series}
              </p>
              <div className="flex items-center gap-1">
                {[...Array(exercicio.series)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      i + 1 < currentSet ? "w-6 bg-primary" :
                        i + 1 === currentSet ? "w-10 bg-primary animate-pulse" :
                          "w-6 bg-white/10"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="relative flex min-h-[120px] items-center justify-between rounded-[28px] border border-white/5 bg-white/[0.02] p-5 backdrop-blur-3xl">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Reps na série</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter text-foreground">{repsInCurrentSet}</span>
                  <span className="text-lg font-bold text-muted-foreground/20 italic">/ {exercicio.repeticoes}</span>
                </div>
              </div>
              <Button
                className="h-20 w-20 rounded-[28px] bg-primary text-black shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] hover:scale-105 active:scale-95 transition-all"
                onClick={handleAddRep}
              >
                <span className="text-3xl font-black">+1</span>
              </Button>
            </div>
          </div>

          {/* ④ Execution Guide — Accordion (closed by default) */}
          {exercicio.instrucoes && exercicio.instrucoes.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="guide" className="rounded-[24px] border border-white/5 bg-white/[0.02] px-4 overflow-hidden">
                <AccordionTrigger className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-3.5 w-3.5" />
                    Guia de Execução
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3">
                    {translateInstructions(exercicio.instrucoes).map((step, idx) => (
                      <div key={idx} className="flex gap-3 items-start border-l border-white/5 pl-3">
                        <span className="text-[10px] font-black text-primary/40 pt-0.5 shrink-0">{String(idx + 1).padStart(2, "0")}</span>
                        <p className="text-xs leading-relaxed text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

        </section>
      )}

      {/* ⑤ Sticky action bar — always visible at bottom */}
      {exercicio && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-background/90 backdrop-blur-xl px-4 py-3 pb-safe">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline-premium"
              className="py-6 rounded-2xl text-sm font-black"
              onClick={handleToggleTimer}
            >
              {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isRunning ? "Pausar" : "Retomar"}
            </Button>
            <Button
              className="variant-premium py-6 rounded-2xl text-sm font-black"
              onClick={handleFinalizar}
              loading={isFinalizing}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Finalizar
            </Button>
          </div>
        </div>
      )}

      <FloatingNavIsland />
    </div>
  );
};

export default AlunoTreinoAtivoPage;
