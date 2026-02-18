import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Skull,
    Timer,
    Activity,
    Flame,
    Play,
    Pause,
    CheckCircle2,
    Dumbbell,
    ChevronDown,
    ChevronUp,
    Target,
    Clock,
    Weight,
    Info,
    Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { SpotifyButton } from "@/components/ui/SpotifyButton";
import { useBluetoothHeartRate } from "@/hooks/useBluetoothHeartRate";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Watch, BluetoothSearching, BluetoothConnected } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Exercise = {
    id: string;
    name: string;
    muscle_group: string;
    exercise_type: string;
    sets: number;
    reps: number;
    load: string;
    rest_seconds: number;
    rpe: number;
    technique_tip: string;
    notes: string;
};

type ExerciseProgress = {
    completedSets: number;
    repsInCurrentSet: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_COLORS: Record<string, string> = {
    Peito: "bg-red-500/20 text-red-400 border-red-500/30",
    Costas: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Ombros: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Bíceps: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Tríceps: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Pernas: "bg-green-500/20 text-green-400 border-green-500/30",
    Glúteos: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    Abdômen: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    Cardio: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    Outro: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const MET_MUSCULACAO = 5.0;

function formatRest(seconds: number): string {
    if (!seconds) return "";
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function ExerciseRow({
    ex,
    index,
    progress,
    isActive,
    onSelect,
    onAddRep,
    onCompleteSet,
}: {
    ex: Exercise;
    index: number;
    progress: ExerciseProgress;
    isActive: boolean;
    onSelect: () => void;
    onAddRep: () => void;
    onCompleteSet: () => void;
}) {
    const muscleColor = MUSCLE_COLORS[ex.muscle_group] ?? MUSCLE_COLORS["Outro"];
    const allSetsComplete = progress.completedSets >= ex.sets;

    return (
        <div
            className={cn(
                "rounded-3xl border transition-all overflow-hidden",
                isActive
                    ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10"
                    : allSetsComplete
                        ? "border-green-500/20 bg-green-500/5 opacity-70"
                        : "border-white/5 bg-white/[0.03]"
            )}
        >
            {/* Header */}
            <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={onSelect}
            >
                <span
                    className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                        allSetsComplete
                            ? "bg-green-500/20 text-green-400"
                            : isActive
                                ? "bg-primary text-black"
                                : "bg-white/10 text-zinc-400"
                    )}
                >
                    {allSetsComplete ? "✓" : index + 1}
                </span>

                <div className="flex-1 min-w-0">
                    <p className={cn("font-black text-sm uppercase italic truncate", isActive ? "text-white" : "text-zinc-300")}>
                        {ex.name || "Exercício sem nome"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        {ex.muscle_group && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${muscleColor}`}>
                                {ex.muscle_group}
                            </span>
                        )}
                        <span className="text-[10px] text-zinc-500">
                            {progress.completedSets}/{ex.sets} séries
                        </span>
                    </div>
                </div>

                {/* Progress dots */}
                <div className="flex gap-1 shrink-0">
                    {Array.from({ length: ex.sets }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-2 w-2 rounded-full transition-all",
                                i < progress.completedSets
                                    ? "bg-primary"
                                    : i === progress.completedSets && isActive
                                        ? "bg-primary/40 animate-pulse"
                                        : "bg-white/10"
                            )}
                        />
                    ))}
                </div>

                {isActive ? (
                    <ChevronUp className="h-4 w-4 text-primary shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-600 shrink-0" />
                )}
            </button>

            {/* Active exercise controls */}
            {isActive && !allSetsComplete && (
                <div className="px-4 pb-4 space-y-4 border-t border-primary/10 pt-4">
                    {/* Stats chips */}
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5">
                            <Dumbbell className="h-3 w-3 text-primary" />
                            <span className="text-xs font-black text-white">{ex.sets}×{ex.reps}</span>
                        </div>
                        {ex.load && (
                            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5">
                                <Weight className="h-3 w-3 text-zinc-400" />
                                <span className="text-xs font-bold text-white">{ex.load}</span>
                            </div>
                        )}
                        {ex.rest_seconds > 0 && (
                            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5">
                                <Clock className="h-3 w-3 text-zinc-400" />
                                <span className="text-xs font-bold text-white">{formatRest(ex.rest_seconds)}</span>
                            </div>
                        )}
                        {ex.rpe > 0 && (
                            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5">
                                <Target className="h-3 w-3 text-zinc-400" />
                                <span className="text-xs font-black text-primary">RPE {ex.rpe}</span>
                            </div>
                        )}
                    </div>

                    {/* Technique tip */}
                    {ex.technique_tip && (
                        <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2">
                            <Info className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                            <p className="text-[11px] text-primary/80 italic leading-relaxed">{ex.technique_tip}</p>
                        </div>
                    )}

                    {/* Rep counter */}
                    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/30 p-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                Série {progress.completedSets + 1} de {ex.sets}
                            </p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-5xl font-black text-white tabular-nums">
                                    {progress.repsInCurrentSet}
                                </span>
                                <span className="text-lg font-bold text-zinc-600">/ {ex.reps}</span>
                            </div>
                        </div>

                        <Button
                            className="h-20 w-20 rounded-[24px] bg-primary text-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all font-black text-3xl"
                            onClick={onAddRep}
                        >
                            +1
                        </Button>
                    </div>

                    {/* Complete set */}
                    <Button
                        variant="outline"
                        className="w-full rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold"
                        onClick={onCompleteSet}
                    >
                        <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                        Concluir série {progress.completedSets + 1}
                    </Button>

                    {/* Notes */}
                    {ex.notes && (
                        <p className="text-[11px] text-zinc-500 italic text-center">{ex.notes}</p>
                    )}
                </div>
            )}

            {/* Completed state */}
            {isActive && allSetsComplete && (
                <div className="px-4 pb-4 pt-2 text-center">
                    <p className="text-sm font-black text-green-400 uppercase italic">
                        ✓ Todas as séries concluídas!
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ModoRaizTreinoPage() {
    const { id, dayIndex } = useParams<{ id: string; dayIndex: string }>();
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { profile } = useUserProfile();
    const finalizeOnceRef = useRef(false);

    // BLE Heart Rate
    const {
        heartRate: bleHeartRate,
        isConnected: isBleConnected,
        isConnecting: isBleConnecting,
        connect: connectBle,
        disconnect: disconnectBle,
    } = useBluetoothHeartRate();

    // Timer & metrics
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [bpm, setBpm] = useState(90);
    const [calories, setCalories] = useState(0);
    const [intensity, setIntensity] = useState("Moderada");
    const [isFinalizing, setIsFinalizing] = useState(false);

    // Exercise tracking: map exerciseId -> progress
    const [activeExId, setActiveExId] = useState<string | null>(null);
    const [progress, setProgress] = useState<Record<string, ExerciseProgress>>({});

    // Load routine
    const { data: routine, isLoading } = useQuery({
        queryKey: ["manual_routine", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("manual_routines" as any)
                .select("*")
                .eq("id", id!)
                .single();
            if (error) throw error;
            return data as any;
        },
        enabled: !!user && !!id,
    });

    const dayIdx = parseInt(dayIndex ?? "0", 10);
    const day = routine?.days?.[dayIdx] as { name: string; exercises: Exercise[] } | undefined;
    const exercises = (day?.exercises ?? []) as Exercise[];

    // Initialize progress & active exercise when day loads
    useEffect(() => {
        if (exercises.length === 0) return;
        const initial: Record<string, ExerciseProgress> = {};
        exercises.forEach((ex) => {
            initial[ex.id] = { completedSets: 0, repsInCurrentSet: 0 };
        });
        setProgress(initial);
        setActiveExId(exercises[0]?.id ?? null);
    }, [routine, dayIdx]);

    // Timer
    useEffect(() => {
        if (!isRunning) return;
        const interval = window.setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);

            if (isBleConnected && bleHeartRate) {
                setBpm(bleHeartRate);
            } else {
                setBpm((prev) => {
                    const variation = Math.round((Math.random() - 0.5) * 8);
                    return Math.min(185, Math.max(65, prev + variation));
                });
            }

            const weight = profile?.peso_kg || 75;
            const caloriesPerSecond = (MET_MUSCULACAO * weight * 3.5) / 12000;
            setCalories((prev) => prev + caloriesPerSecond);

            setIntensity(() => {
                if (bpm > 155) return "Alta";
                if (bpm > 120) return "Moderada";
                return "Leve";
            });
        }, 1000);
        return () => window.clearInterval(interval);
    }, [isRunning, bpm, profile, isBleConnected, bleHeartRate]);

    const formattedTime = useMemo(() => {
        const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
        const s = (elapsedSeconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }, [elapsedSeconds]);

    // Exercise handlers
    const handleAddRep = (exId: string) => {
        setProgress((prev) => {
            const ex = exercises.find((e) => e.id === exId);
            if (!ex) return prev;
            const cur = prev[exId] ?? { completedSets: 0, repsInCurrentSet: 0 };
            const nextReps = cur.repsInCurrentSet + 1;
            return { ...prev, [exId]: { ...cur, repsInCurrentSet: nextReps } };
        });
    };

    const handleCompleteSet = (exId: string) => {
        setProgress((prev) => {
            const ex = exercises.find((e) => e.id === exId);
            if (!ex) return prev;
            const cur = prev[exId] ?? { completedSets: 0, repsInCurrentSet: 0 };
            const nextSets = cur.completedSets + 1;
            if (nextSets >= ex.sets) {
                toast({ title: "Exercício concluído!", description: "Todas as séries feitas. Próximo exercício!" });
                // Auto-advance to next exercise
                const currentIdx = exercises.findIndex((e) => e.id === exId);
                const nextEx = exercises[currentIdx + 1];
                if (nextEx) setActiveExId(nextEx.id);
            } else {
                toast({ title: `Série ${nextSets} de ${ex.sets} concluída!`, description: "Descanse e prepare-se." });
            }
            return { ...prev, [exId]: { completedSets: nextSets, repsInCurrentSet: 0 } };
        });
    };

    const totalSets = exercises.reduce((acc, ex) => acc + ex.sets, 0);
    const completedSets = exercises.reduce((acc, ex) => acc + (progress[ex.id]?.completedSets ?? 0), 0);
    const allDone = completedSets >= totalSets && totalSets > 0;

    const handleFinalizar = async () => {
        if (finalizeOnceRef.current || isFinalizing) return;
        finalizeOnceRef.current = true;
        setIsFinalizing(true);

        try {
            // Register a workout session for tracking
            const { data: session, error: sessionError } = await supabase
                .from("workout_sessions")
                .insert({
                    exercise_name: `${routine?.name ?? "Treino Raiz"} — ${day?.name ?? `Dia ${dayIdx + 1}`}`,
                    status: "finalizada",
                    finalizado_em: new Date().toISOString(),
                    total_reps: completedSets,
                    bpm_medio: bpm,
                    calorias_estimadas: Math.round(calories),
                    confirmado: true,
                } as any)
                .select("id")
                .single();

            if (sessionError) {
                console.warn("[ModoRaizTreino] Falha ao registrar sessão:", sessionError.message);
            }

            toast({ title: "Treino finalizado!", description: "Ótimo trabalho! 💪" });

            navigate("/aluno/atividade-personalizar", {
                replace: false,
                state: {
                    sessaoId: session?.id,
                    atividadeNome: `${routine?.name ?? "Treino Raiz"} — ${day?.name ?? `Dia ${dayIdx + 1}`}`,
                    elapsedSeconds,
                    bpmMedio: bpm,
                    caloriasEstimadas: calories,
                    activityType: {
                        id: "musculacao",
                        name: "Musculação",
                        category: "estacionario",
                        usesGps: false,
                        usesDistance: false,
                        metValue: MET_MUSCULACAO,
                    },
                    intensidade: intensity,
                },
            });
        } catch (err: any) {
            toast({ title: "Erro ao finalizar", description: err.message, variant: "destructive" });
        } finally {
            setIsFinalizing(false);
            finalizeOnceRef.current = false;
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Skull className="h-8 w-8 text-primary animate-pulse" />
            </div>
        );
    }

    if (!day) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-black gap-4">
                <p className="text-zinc-500">Dia de treino não encontrado.</p>
                <Button variant="outline" className="rounded-2xl border-white/10" onClick={() => navigate(-1)}>
                    Voltar
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pb-48">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-white/5 bg-black/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
                    <BackIconButton to={`/aluno/modo-raiz/${id}`} />
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Modo Raiz · Treino Ativo</p>
                        <h1 className="text-sm font-black uppercase italic text-white truncate">
                            {routine?.name} — {day.name}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <SpotifyButton className={cn(isRunning && "animate-pulse border-[#1DB954]/40")} />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={isBleConnected ? disconnectBle : connectBle}
                            className={cn(
                                "h-9 w-9 rounded-xl transition-all",
                                isBleConnected
                                    ? "bg-primary/20 text-primary border border-primary/40"
                                    : "bg-white/5 text-zinc-500 border border-white/5",
                                isBleConnecting && "animate-pulse"
                            )}
                        >
                            {isBleConnecting ? (
                                <BluetoothSearching className="h-4 w-4" />
                            ) : isBleConnected ? (
                                <BluetoothConnected className="h-4 w-4" />
                            ) : (
                                <Watch className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-lg px-4 pt-5 space-y-5">
                {/* Stats bar */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-center">
                        <Timer className="h-3.5 w-3.5 text-blue-400 mx-auto mb-1" />
                        <p className="text-sm font-black text-white tabular-nums">{formattedTime}</p>
                        <p className="text-[9px] text-zinc-600 uppercase font-bold">Tempo</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-center">
                        <Activity className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                        <p className="text-sm font-black text-white tabular-nums">{bpm}</p>
                        <p className="text-[9px] text-zinc-600 uppercase font-bold">BPM</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-center">
                        <Flame className="h-3.5 w-3.5 text-orange-400 mx-auto mb-1" />
                        <p className="text-sm font-black text-white tabular-nums">{Math.round(calories)}</p>
                        <p className="text-[9px] text-zinc-600 uppercase font-bold">kcal</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-center">
                        <Zap className="h-3.5 w-3.5 text-emerald-400 mx-auto mb-1" />
                        <p className="text-sm font-black text-white tabular-nums">{completedSets}/{totalSets}</p>
                        <p className="text-[9px] text-zinc-600 uppercase font-bold">Séries</p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                        <span>Progresso do treino</span>
                        <span className="text-primary font-black">
                            {totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                {/* Exercise list */}
                <div className="space-y-3">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                        Exercícios — {day.name}
                    </h2>
                    {exercises.map((ex, i) => (
                        <ExerciseRow
                            key={ex.id}
                            ex={ex}
                            index={i}
                            progress={progress[ex.id] ?? { completedSets: 0, repsInCurrentSet: 0 }}
                            isActive={activeExId === ex.id}
                            onSelect={() => setActiveExId(activeExId === ex.id ? null : ex.id)}
                            onAddRep={() => handleAddRep(ex.id)}
                            onCompleteSet={() => handleCompleteSet(ex.id)}
                        />
                    ))}
                </div>
            </main>

            {/* Sticky bottom controls */}
            <div className="fixed bottom-28 left-0 right-0 z-40 px-4">
                <div className="mx-auto max-w-lg flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold h-14"
                        onClick={() => setIsRunning((r) => !r)}
                    >
                        {isRunning ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                        {isRunning ? "Pausar" : isElapsed(elapsedSeconds) ? "Retomar" : "Iniciar"}
                    </Button>
                    <Button
                        className={cn(
                            "flex-1 rounded-2xl font-black uppercase italic h-14 gap-2 transition-all",
                            allDone
                                ? "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"
                                : "bg-primary text-black hover:bg-primary/90 shadow-lg shadow-primary/20"
                        )}
                        disabled={isFinalizing}
                        onClick={handleFinalizar}
                    >
                        <CheckCircle2 className="h-5 w-5" />
                        {allDone ? "Concluir!" : "Finalizar"}
                    </Button>
                </div>
            </div>

            <FloatingNavIsland />
        </div>
    );
}

function isElapsed(s: number) {
    return s > 0;
}
