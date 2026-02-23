import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";
import {
    Dumbbell,
    Flame,
    Timer,
    Target,
    Scale,
    TrendingUp,
    Activity,
    Zap,
    Loader2
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ProfessionalStudentEvolutionPage = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [treinosSemana, setTreinosSemana] = useState(0);
    const [caloriasSemana, setCaloriasSemana] = useState(0);
    const [minutosSemana, setMinutosSemana] = useState(0);
    const [treinosSemanaAnterior, setTreinosSemanaAnterior] = useState(0);

    const [totalSeries, setTotalSeries] = useState(0);
    const [totalDistancia, setTotalDistancia] = useState(0);
    const [paceMedio, setPaceMedio] = useState(0);
    const [musculosFoco, setMusculosFoco] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!studentId || !user) return;

        const carregarDadosEstudante = async () => {
            try {
                const hoje = new Date();
                const seteDiasAtras = new Date();
                seteDiasAtras.setDate(hoje.getDate() - 6);
                const catorzeDiasAtras = new Date();
                catorzeDiasAtras.setDate(hoje.getDate() - 13);

                const [cardioResp, muscuResp, profileResp] = await Promise.all([
                    supabase
                        .from("atividade_sessao")
                        .select("id, iniciado_em, finalizado_em, calorias_estimadas, distance_km, pace_avg")
                        .eq("user_id", studentId)
                        .eq("status", "finalizada")
                        .gte("iniciado_em", catorzeDiasAtras.toISOString()),
                    supabase
                        .from("workout_sessions")
                        .select("id, iniciado_em, finalizado_em, calorias_estimadas, series, target_muscles")
                        .eq("user_id", studentId)
                        .eq("status", "finalizada")
                        .gte("iniciado_em", catorzeDiasAtras.toISOString()),
                    supabase
                        .from("profiles")
                        .select("display_name, peso_kg, altura_cm, objetivo, nivel")
                        .eq("id", studentId)
                        .single()
                ]);

                if (profileResp.data) setStudentProfile(profileResp.data);

                const cardioData = (cardioResp.data as any[] | null) ?? [];
                const muscuData = (muscuResp.data as any[] | null) ?? [];

                const calcularMinutos = (iniciado_em?: string | null, finalizado_em?: string | null) => {
                    if (!iniciado_em || !finalizado_em) return 0;
                    const inicio = new Date(iniciado_em);
                    const fim = new Date(finalizado_em);
                    return Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 60000));
                };

                const todasSessoes = [...cardioData, ...muscuData];

                let treinosSemanaAtual = 0;
                let treinosSemanaPassada = 0;
                let minutosSemanaAtual = 0;
                let caloriasSemanaAtual = 0;
                let seriesSemanaAtual = 0;
                let distanciaSemanaAtual = 0;
                let countPace = 0;
                let sumPace = 0;
                const muscleMap: Record<string, number> = {};

                todasSessoes.forEach((sessao: any) => {
                    const { iniciado_em, finalizado_em, calorias_estimadas, series, distance_km, pace_avg, target_muscles } = sessao;
                    if (!iniciado_em) return;

                    const inicio = new Date(iniciado_em);
                    const minutos = calcularMinutos(iniciado_em, finalizado_em);

                    if (inicio >= seteDiasAtras && inicio <= hoje) {
                        treinosSemanaAtual += 1;
                        minutosSemanaAtual += minutos;
                        caloriasSemanaAtual += calorias_estimadas ?? 0;
                        seriesSemanaAtual += series ?? 0;
                        distanciaSemanaAtual += distance_km ?? 0;
                        if (pace_avg) {
                            sumPace += pace_avg;
                            countPace++;
                        }
                        if (target_muscles && Array.isArray(target_muscles)) {
                            target_muscles.forEach(m => {
                                muscleMap[m] = (muscleMap[m] || 0) + 1;
                            });
                        }
                    } else if (inicio >= catorzeDiasAtras && inicio < seteDiasAtras) {
                        treinosSemanaPassada += 1;
                    }
                });

                const topMuscles = Object.entries(muscleMap)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([m]) => m);

                setTreinosSemana(treinosSemanaAtual);
                setTreinosSemanaAnterior(treinosSemanaPassada);
                setMinutosSemana(minutosSemanaAtual);
                setCaloriasSemana(caloriasSemanaAtual);
                setTotalSeries(seriesSemanaAtual);
                setTotalDistancia(distanciaSemanaAtual);
                setPaceMedio(countPace > 0 ? sumPace / countPace : 0);
                setMusculosFoco(topMuscles);
                setIsLoading(false);
            } catch (error) {
                console.error("Error loading student data:", error);
                setIsLoading(false);
            }
        };

        carregarDadosEstudante();
    }, [studentId, user]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const metaSemanal = 4;
    const progressoConsistencia = Math.min(100, (treinosSemana / metaSemanal) * 100);

    const StatCard = ({ title, value, unit, icon: Icon, colorClass, delay = "0" }: { title: string, value: string | number, unit?: string, icon: LucideIcon, colorClass: string, delay?: string }) => (
        <div
            className={cn(
                "group relative flex flex-col gap-1 overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-b from-white/[0.08] to-transparent p-4 transition-all hover:border-white/10 active:scale-[0.98] backdrop-blur-xl",
                "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
            )}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl bg-black/20 shadow-inner mb-2", colorClass)}>
                <Icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none">{title}</p>
            <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-foreground">{value}</span>
                {unit && <span className="text-[10px] font-medium text-muted-foreground">{unit}</span>}
            </div>
            <div className={cn("absolute -right-4 -top-4 h-16 w-16 opacity-0 blur-2xl transition-opacity group-hover:opacity-20", colorClass.replace('text-', 'bg-'))} />
        </div>
    );

    return (
        <main className="min-h-screen flex flex-col bg-black px-4 pb-32 pt-6">
            <header className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BackIconButton />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Evolução do Aluno</p>
                        <h1 className="text-2xl font-black tracking-tighter text-white truncate max-w-[200px]">
                            {studentProfile?.display_name || "Carregando..."}
                        </h1>
                    </div>
                </div>
            </header>

            <section className="flex-1 space-y-6 max-w-lg mx-auto w-full">
                {/* Sumário Semanal */}
                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        title="Minutos"
                        value={minutosSemana}
                        unit="min"
                        icon={Timer}
                        colorClass="text-blue-400"
                        delay="100"
                    />
                    <StatCard
                        title="Calorias"
                        value={caloriasSemana}
                        unit="kcal"
                        icon={Flame}
                        colorClass="text-orange-400"
                        delay="200"
                    />
                    <StatCard
                        title="Treinos"
                        value={treinosSemana}
                        unit="totais"
                        icon={Zap}
                        colorClass="text-emerald-400"
                        delay="300"
                    />
                    <div
                        className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 transition-all animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
                        style={{ animationDelay: "400ms" }}
                    >
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-primary/60">Consistência</p>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-xl font-black text-foreground">{treinosSemana}</span>
                                <span className="text-[10px] font-medium text-muted-foreground">/ {metaSemanal}</span>
                            </div>
                        </div>
                        <Progress value={progressoConsistencia} className="h-1.5 mt-2 bg-primary/10" />
                        <div className="absolute -right-2 -top-2 opacity-10 rotate-12">
                            <Target className="h-16 w-16 text-primary" />
                        </div>
                    </div>
                </div>

                {/* Biometria */}
                {studentProfile && (
                    <div className="space-y-3">
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Composição Corporal</h2>
                        <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent p-5 backdrop-blur-xl">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-zinc-600 uppercase">Peso</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-white">{studentProfile.peso_kg || '--'}</span>
                                        <span className="text-[11px] font-bold text-zinc-500">kg</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-zinc-600 uppercase">Altura</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-white">{studentProfile.altura_cm || '--'}</span>
                                        <span className="text-[11px] font-bold text-zinc-500">cm</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                                <div>
                                    <p className="text-[9px] font-black text-zinc-600 uppercase">Objetivo</p>
                                    <p className="text-xs font-bold text-primary italic uppercase">{studentProfile.objetivo || 'Não definido'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-zinc-600 uppercase text-right">Nível</p>
                                    <p className="text-xs font-bold text-white text-right uppercase">{studentProfile.nivel || 'Iniciante'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Performance */}
                <div className="space-y-4">
                    <div className="space-y-3">
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Performance</h2>
                        <div className="grid gap-3">
                            {/* Força */}
                            <div className="group relative overflow-hidden rounded-[28px] border border-emerald-500/10 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 backdrop-blur-xl">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-4 flex-1">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500/60">Séries Concluídas</p>
                                            <p className="text-3xl font-black text-emerald-400">{totalSeries}</p>
                                        </div>
                                        {musculosFoco.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {musculosFoco.map((m, i) => (
                                                    <span key={i} className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 capitalize">
                                                        {m}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Dumbbell className="h-8 w-8 text-emerald-500/20" />
                                </div>
                            </div>

                            {/* Cardio */}
                            <div className="group relative overflow-hidden rounded-[28px] border border-blue-500/10 bg-gradient-to-br from-blue-500/5 to-transparent p-5 backdrop-blur-xl">
                                <div className="flex items-start justify-between">
                                    <div className="grid grid-cols-2 gap-8 flex-1">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-blue-500/60">Distância</p>
                                            <div className="flex items-baseline gap-1">
                                                <p className="text-3xl font-black text-blue-400">{totalDistancia.toFixed(1)}</p>
                                                <span className="text-[11px] font-bold text-blue-500/60">km</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-blue-500/60">Pace Médio</p>
                                            <div className="flex items-baseline gap-1">
                                                <p className="text-3xl font-black text-blue-400">{paceMedio > 0 ? paceMedio.toFixed(1) : '--'}</p>
                                                <span className="text-[11px] font-bold text-blue-500/60">min/km</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Activity className="h-8 w-8 text-blue-500/20" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ProfessionalFloatingNavIsland />
        </main>
    );
};

export default ProfessionalStudentEvolutionPage;
