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
    Loader2,
    ShieldAlert,
    Mail,
    Ruler,
    Weight,
    User,
    MessageCircle,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────

const ProfessionalStudentEvolutionPage = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null); // null = checking

    // Weekly stats
    const [treinosSemana, setTreinosSemana] = useState(0);
    const [caloriasSemana, setCaloriasSemana] = useState(0);
    const [minutosSemana, setMinutosSemana] = useState(0);
    const [treinosSemanaAnterior, setTreinosSemanaAnterior] = useState(0);
    const [totalSeries, setTotalSeries] = useState(0);
    const [totalDistancia, setTotalDistancia] = useState(0);
    const [paceMedio, setPaceMedio] = useState(0);
    const [musculosFoco, setMusculosFoco] = useState<string[]>([]);
    const [ultimoTreino, setUltimoTreino] = useState<string | null>(null);

    useEffect(() => {
        if (!studentId || !user) return;
        verificarVinculoECarregar();
    }, [studentId, user]);

    const verificarVinculoECarregar = async () => {
        setIsLoading(true);
        try {
            // 1. Find the professional record for the logged-in user
            const { data: profData } = await supabase
                .from("professionals")
                .select("id")
                .eq("user_id", user!.id)
                .maybeSingle();

            if (!profData) {
                setHasAccess(false);
                return;
            }

            // 2. Check for an active binding
            const { data: binding } = await (supabase as any)
                .from("professional_student_bindings")
                .select("id")
                .eq("professional_id", profData.id)
                .eq("student_id", studentId)
                .eq("status", "active")
                .maybeSingle();

            if (!binding) {
                // Also allow viewing if there is an accepted hire (binding may not exist yet)
                const { data: acceptedHire } = await (supabase as any)
                    .from("professional_hires")
                    .select("id")
                    .eq("professional_id", profData.id)
                    .eq("student_id", studentId)
                    .eq("status", "accepted")
                    .maybeSingle();

                if (!acceptedHire) {
                    setHasAccess(false);
                    setIsLoading(false);
                    return;
                }
            }

            setHasAccess(true);

            // 3. Load student data
            await carregarDadosEstudante();
        } catch (error) {
            console.error("Error:", error);
            setHasAccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const carregarDadosEstudante = async () => {
        const hoje = new Date();
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(hoje.getDate() - 6);
        const catorzeDiasAtras = new Date();
        catorzeDiasAtras.setDate(hoje.getDate() - 13);

        const [cardioResp, muscuResp, profileResp, ultimoTreinoResp] = await Promise.all([
            supabase
                .from("atividade_sessao")
                .select("id, iniciado_em, finalizado_em, calorias_estimadas, distance_km, pace_avg")
                .eq("user_id", studentId!)
                .eq("status", "finalizada")
                .gte("iniciado_em", catorzeDiasAtras.toISOString()),
            supabase
                .from("workout_sessions")
                .select("id, iniciado_em, finalizado_em, calorias_estimadas, series, target_muscles")
                .eq("user_id", studentId!)
                .eq("status", "finalizada")
                .gte("iniciado_em", catorzeDiasAtras.toISOString()),
            supabase
                .from("profiles")
                .select("display_name, nome, peso_kg, altura_cm, objetivo, nivel, email, avatar_url")
                .eq("id", studentId!)
                .single(),
            supabase
                .from("workout_sessions")
                .select("iniciado_em")
                .eq("user_id", studentId!)
                .eq("status", "finalizada")
                .order("iniciado_em", { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);

        if (profileResp.data) setStudentProfile(profileResp.data);
        if (ultimoTreinoResp.data?.iniciado_em) {
            setUltimoTreino(
                new Date(ultimoTreinoResp.data.iniciado_em).toLocaleDateString("pt-BR", {
                    dateStyle: "short",
                })
            );
        }

        const cardioData = (cardioResp.data as any[] | null) ?? [];
        const muscuData = (muscuResp.data as any[] | null) ?? [];

        const calcularMinutos = (in_: string, fin_: string) => {
            if (!in_ || !fin_) return 0;
            return Math.max(1, Math.round((new Date(fin_).getTime() - new Date(in_).getTime()) / 60000));
        };

        const todasSessoes = [...cardioData, ...muscuData];
        let tw = 0, tp = 0, min = 0, cal = 0, ser = 0, dist = 0, cntPace = 0, sumPace = 0;
        const muscleMap: Record<string, number> = {};

        todasSessoes.forEach((s: any) => {
            if (!s.iniciado_em) return;
            const inicio = new Date(s.iniciado_em);
            const minutos = calcularMinutos(s.iniciado_em, s.finalizado_em);

            if (inicio >= seteDiasAtras && inicio <= hoje) {
                tw++;
                min += minutos;
                cal += s.calorias_estimadas ?? 0;
                ser += s.series ?? 0;
                dist += s.distance_km ?? 0;
                if (s.pace_avg) { sumPace += s.pace_avg; cntPace++; }
                if (s.target_muscles?.length) {
                    s.target_muscles.forEach((m: string) => { muscleMap[m] = (muscleMap[m] || 0) + 1; });
                }
            } else if (inicio >= catorzeDiasAtras && inicio < seteDiasAtras) {
                tp++;
            }
        });

        const topMuscles = Object.entries(muscleMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([m]) => m);

        setTreinosSemana(tw);
        setTreinosSemanaAnterior(tp);
        setMinutosSemana(min);
        setCaloriasSemana(cal);
        setTotalSeries(ser);
        setTotalDistancia(dist);
        setPaceMedio(cntPace > 0 ? sumPace / cntPace : 0);
        setMusculosFoco(topMuscles);
    };

    // ── Loading ────────────────────────────────────────────────────────────────
    if (isLoading || hasAccess === null) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // ── Access denied ──────────────────────────────────────────────────────────
    if (!hasAccess) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 mb-4">
                    <ShieldAlert className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-xl font-black text-white mb-2">Acesso Restrito</h1>
                <p className="text-sm text-zinc-500 max-w-[260px]">
                    Você só pode visualizar dados de alunos com os quais tem um vínculo ativo.
                </p>
                <button
                    onClick={() => navigate("/professional/dashboard")}
                    className="mt-8 h-11 px-6 rounded-2xl bg-primary/10 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-colors"
                >
                    Voltar ao Painel
                </button>
                <ProfessionalFloatingNavIsland />
            </main>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    const metaSemanal = 4;
    const progressoConsistencia = Math.min(100, (treinosSemana / metaSemanal) * 100);
    const displayName = studentProfile?.nome || studentProfile?.display_name || "Aluno";

    const StatCard = ({
        title, value, unit, icon: Icon, colorClass, delay = "0",
    }: {
        title: string; value: string | number; unit?: string;
        icon: LucideIcon; colorClass: string; delay?: string;
    }) => (
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
            {/* Header */}
            <header className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BackIconButton />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Evolução do Aluno</p>
                        <h1 className="text-2xl font-black tracking-tighter text-white truncate max-w-[200px]">
                            {displayName}
                        </h1>
                    </div>
                </div>
                {/* Quick chat link */}
                <button
                    onClick={() => navigate("/professional/chat")}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                    title="Abrir Chat"
                >
                    <MessageCircle className="h-5 w-5" />
                </button>
            </header>

            <section className="flex-1 space-y-6 max-w-lg mx-auto w-full">

                {/* ── Student info card ─────────────────────────────────────── */}
                {studentProfile && (
                    <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent p-5 backdrop-blur-xl animate-in fade-in duration-500">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 shrink-0 rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
                                {studentProfile.avatar_url ? (
                                    <img src={studentProfile.avatar_url} className="h-full w-full object-cover" alt="" />
                                ) : (
                                    <User className="h-6 w-6 text-zinc-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base font-black text-white leading-none mb-0.5">{displayName}</h2>
                                {studentProfile.email && (
                                    <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3 text-zinc-600 shrink-0" />
                                        <p className="text-[10px] text-zinc-500 truncate">{studentProfile.email}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Metrics row */}
                        <div className="mt-4 grid grid-cols-2 gap-3">
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
                            <div className="text-right">
                                <p className="text-[9px] font-black text-zinc-600 uppercase">Nível</p>
                                <p className="text-xs font-bold text-white uppercase">{studentProfile.nivel || 'Iniciante'}</p>
                            </div>
                            {ultimoTreino && (
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-zinc-600 uppercase">Último treino</p>
                                    <p className="text-xs font-bold text-zinc-400">{ultimoTreino}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Weekly Stats ──────────────────────────────────────────── */}
                <div>
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1 mb-3">Semana Atual</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard title="Minutos" value={minutosSemana} unit="min" icon={Timer} colorClass="text-blue-400" delay="100" />
                        <StatCard title="Calorias" value={caloriasSemana} unit="kcal" icon={Flame} colorClass="text-orange-400" delay="200" />
                        <StatCard title="Treinos" value={treinosSemana} unit="total" icon={Zap} colorClass="text-emerald-400" delay="300" />

                        {/* Consistency */}
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
                </div>

                {/* ── Performance ───────────────────────────────────────────── */}
                <div className="space-y-3">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Performance</h2>

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

                {/* Week comparison */}
                {treinosSemanaAnterior > 0 && (
                    <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Semana anterior</p>
                            <p className="text-2xl font-black text-zinc-400">{treinosSemanaAnterior} <span className="text-xs font-bold text-zinc-600">treinos</span></p>
                        </div>
                        <div className={cn("text-xs font-black uppercase tracking-widest", treinosSemana >= treinosSemanaAnterior ? "text-emerald-400" : "text-red-400")}>
                            {treinosSemana >= treinosSemanaAnterior
                                ? `▲ +${treinosSemana - treinosSemanaAnterior} esta semana`
                                : `▼ -${treinosSemanaAnterior - treinosSemana} esta semana`}
                        </div>
                    </div>
                )}
            </section>

            <ProfessionalFloatingNavIsland />
        </main>
    );
};

export default ProfessionalStudentEvolutionPage;
