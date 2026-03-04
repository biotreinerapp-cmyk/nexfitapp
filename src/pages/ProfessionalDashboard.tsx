import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";
import { GreetingCard } from "@/components/dashboard/GreetingCard";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import logoNexfit from "@/assets/nexfit-logo.png";
import {
    User,
    LogOut,
    Calendar,
    MessageCircle,
    DollarSign,
    ImageIcon,
    Megaphone,
    Zap,
    ChevronRight,
    Clock,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Dumbbell,
    Briefcase,
    Apple,
    Users,
    Eye,
    Mail,
} from "lucide-react";
import { getSpecialtyLabel } from "@/lib/professionalSpecialties";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfessionalProfile {
    id: string;
    name: string;
    specialty: string;
    profile_image_url: string | null;
    cover_image_url: string | null;
    lp_unlocked: boolean;
    base_price: number | null;
}

interface HireRequest {
    id: string;
    status: string;
    message: string;
    created_at: string;
    student_id: string;
    professional_id: string;
    profiles: {
        display_name: string;
        nome?: string | null;
        avatar_url?: string | null;
        email?: string | null;
        peso_kg?: number | null;
        altura_cm?: number | null;
        objetivo?: string | null;
    };
}

interface StudentBinding {
    id: string;
    student_id: string;
    hire_id: string | null;
    status: string;
    created_at: string;
    profiles: {
        display_name: string;
        nome?: string | null;
        avatar_url?: string | null;
        email?: string | null;
        objetivo?: string | null;
        nivel?: string | null;
    };
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Pendente", color: "text-yellow-400", icon: Clock },
    awaiting_verification: { label: "Verificando Pagamento", color: "text-blue-400", icon: Clock },
    accepted: { label: "Aceito", color: "text-green-400", icon: CheckCircle2 },
    rejected: { label: "Rejeitado", color: "text-red-400", icon: XCircle },
    completed: { label: "Concluído", color: "text-blue-400", icon: CheckCircle2 },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfessionalDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
    const [hires, setHires] = useState<HireRequest[]>([]);
    const [bindings, setBindings] = useState<StudentBinding[]>([]);

    const isNutritionist = profile?.specialty?.toLowerCase().includes("nutri") ||
        profile?.specialty?.toLowerCase().includes("diet");

    useEffect(() => {
        document.title = "Painel do Profissional - Nexfit";
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) return;

        try {
            // Load professional profile
            const { data: profileData, error: profileError } = await supabase
                .from("professionals")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (profileError) {
                if (profileError.code === "PGRST116") {
                    navigate("/professional/register");
                    return;
                }
                throw profileError;
            }

            setProfile(profileData as ProfessionalProfile);

            // Load hire requests — join profiles for student data including email + body metrics
            const { data: hiresData } = await (supabase as any)
                .from("professional_hires")
                .select(`
                    id,
                    status,
                    message,
                    created_at,
                    student_id,
                    professional_id,
                    profiles!professional_hires_student_id_fkey(display_name, nome, avatar_url, email, peso_kg, altura_cm, objetivo)
                `)
                .eq("professional_id", profileData.id)
                .order("created_at", { ascending: false })
                .limit(30);

            setHires((hiresData || []) as HireRequest[]);

            // Load active student bindings
            const { data: bindingsData } = await (supabase as any)
                .from("professional_student_bindings")
                .select(`
                    id,
                    student_id,
                    hire_id,
                    status,
                    created_at,
                    profiles!professional_student_bindings_student_id_fkey(display_name, nome, avatar_url, email, objetivo, nivel)
                `)
                .eq("professional_id", profileData.id)
                .eq("status", "active")
                .order("created_at", { ascending: false });

            setBindings((bindingsData || []) as StudentBinding[]);
        } catch (error: any) {
            console.error("Load error:", error);
            toast({
                title: "Erro ao carregar dados",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = "/auth";
    };

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </main>
        );
    }

    if (!profile) return null;

    const pendingHires = hires.filter(h => h.status === "pending" || h.status === "awaiting_verification");

    return (
        <main className="min-h-screen bg-black pb-28 safe-bottom-floating-nav px-4 pt-4">
            <header className="flex flex-col gap-3 mb-6">
                <div className="flex items-center justify-between">
                    <img
                        src={logoNexfit}
                        alt="Logomarca Nexfit"
                        className="h-14 w-auto opacity-80"
                    />
                    <div className="flex items-center gap-2">
                        <NotificationCenter />
                        <button
                            onClick={handleLogout}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                            title="Sair"
                            aria-label="Sair"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <GreetingCard
                    name={profile.name}
                    avatarUrl={profile.profile_image_url}
                    onAvatarError={() => { }}
                    subtitle={getSpecialtyLabel(profile.specialty)}
                    customBadge={
                        <div className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 backdrop-blur-xl shadow-[0_0_15px_-3px_rgba(var(--primary),0.2)]">
                            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">
                                Profissional
                            </span>
                        </div>
                    }
                />
            </header>

            {/* ── Pending Hire Requests ─────────────────────────────────────── */}
            {pendingHires.length > 0 && (
                <section className="mt-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400">
                            <Clock className="h-4 w-4 text-yellow-400 shrink-0" />
                            Aguardando Resposta ({pendingHires.length})
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {pendingHires.map((hire) => (
                            <HireCard
                                key={hire.id}
                                hire={hire}
                                professionalId={profile.id}
                                onUpdate={loadData}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Meus Alunos (active bindings) ────────────────────────────── */}
            {bindings.length > 0 && (
                <section className="mt-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400">
                            <Users className="h-4 w-4 text-primary shrink-0" />
                            Meus Alunos ({bindings.length})
                        </h2>
                        <div className="h-px flex-1 bg-white/5 ml-4" />
                    </div>
                    <div className="space-y-3">
                        {bindings.map((binding) => (
                            <StudentBindingCard
                                key={binding.id}
                                binding={binding}
                                onViewEvolution={() => navigate(`/professional/student/${binding.student_id}`)}
                                onOpenChat={() => navigate("/professional/chat")}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Premium Hub Buttons ───────────────────────────────────────── */}
            <section className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-widest text-[#56FF02] drop-shadow-[0_0_8px_rgba(86,255,2,0.4)]">
                        Seus Módulos
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Agenda */}
                    <button
                        onClick={() => navigate("/professional/agenda")}
                        className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-blue-400 shadow-inner">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white leading-none">Agenda</h3>
                            <p className="text-[10px] text-zinc-400 font-medium">Gestão de Sessões</p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
                            <Calendar className="h-10 w-10 rotate-12 text-blue-400" />
                        </div>
                    </button>

                    {/* Criar Treinos / Receitas */}
                    <button
                        onClick={() => navigate("/professional/treinos")}
                        className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-primary shadow-inner">
                            {isNutritionist ? <Apple className="h-6 w-6" /> : <Dumbbell className="h-6 w-6" />}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white leading-none">
                                {isNutritionist ? "Criar Receitas" : "Criar Treinos"}
                            </h3>
                            <p className="text-[10px] text-zinc-400 font-medium">
                                {isNutritionist ? "Planos Alimentares" : "Montagem de Fichas"}
                            </p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
                            {isNutritionist ? (
                                <Apple className="h-10 w-10 rotate-12 text-primary" />
                            ) : (
                                <Dumbbell className="h-10 w-10 rotate-12 text-primary" />
                            )}
                        </div>
                    </button>

                    {/* Evolução */}
                    <button
                        onClick={() => navigate("/professional/evolucao")}
                        className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-pink-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-pink-400 shadow-inner">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white leading-none">Evolução</h3>
                            <p className="text-[10px] text-zinc-400 font-medium">Gráficos de Resultados</p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
                            <TrendingUp className="h-10 w-10 rotate-12 text-pink-400" />
                        </div>
                    </button>

                    {/* Chat / Alunos */}
                    <button
                        onClick={() => navigate("/professional/chat")}
                        className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-purple-400 shadow-inner">
                            <MessageCircle className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white leading-none">Alunos</h3>
                            <p className="text-[10px] text-zinc-400 font-medium">Chat e Evolução</p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
                            <MessageCircle className="h-10 w-10 rotate-12 text-purple-400" />
                        </div>
                    </button>

                    {/* Financeiro */}
                    <button
                        onClick={() => navigate("/professional/financeiro")}
                        className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-emerald-400 shadow-inner">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white leading-none">Financeiro</h3>
                            <p className="text-[10px] text-zinc-400 font-medium">Ganhos e Relatórios</p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
                            <DollarSign className="h-10 w-10 rotate-12 text-emerald-400" />
                        </div>
                    </button>

                    {/* Minha Consultoria */}
                    <button
                        onClick={() => navigate("/professional/consultoria")}
                        className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-cyan-400 shadow-inner">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white leading-none">Consultoria</h3>
                            <p className="text-[10px] text-zinc-400 font-medium">Sua Metodologia</p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
                            <Briefcase className="h-10 w-10 rotate-12 text-cyan-400" />
                        </div>
                    </button>

                    {/* Página Pública (LP) */}
                    <button
                        onClick={() => navigate("/professional/lp-editor")}
                        className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-orange-400 shadow-inner">
                            <ImageIcon className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white leading-none">Página Pública</h3>
                            <p className="text-[10px] text-zinc-400 font-medium">Sua Landing Page</p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
                            <ImageIcon className="h-10 w-10 rotate-12 text-orange-400" />
                        </div>
                    </button>

                    {/* Nexfit ADS banner */}
                    <button
                        onClick={() => navigate("/professional/ads")}
                        className="group relative col-span-2 flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 p-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99] backdrop-blur-md"
                    >
                        <div className="flex w-full items-center justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner">
                                <Megaphone className="h-6 w-6" />
                            </div>
                            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 tracking-widest text-[9px]">IMPULSIONAR PERFIL</Badge>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-sm font-black italic text-white leading-none flex items-center gap-2">NEXFIT <span className="text-primary">ADS</span> <Zap className="h-4 w-4 text-primary fill-primary" /></h3>
                            <p className="text-xs text-zinc-400 font-medium mt-1">Destaque seu perfil no topo para milhares <br />de alunos em busca de profissionais.</p>
                        </div>
                        <div className="absolute top-4 right-10 opacity-5 transition-opacity group-hover:opacity-10">
                            <Megaphone className="h-24 w-24 rotate-12 text-primary" />
                        </div>
                    </button>
                </div>
            </section>

            {/* ── Solicitações Recentes ─────────────────────────────────────── */}
            <section className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                        Solicitações Recentes
                    </h2>
                    <div className="h-px flex-1 bg-white/5 ml-4" />
                </div>
                {hires.length === 0 ? (
                    <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-8 text-center backdrop-blur-md">
                        <p className="text-xs text-zinc-500">
                            Nenhuma solicitação ainda. Quando alunos te contratarem, aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {hires.slice(0, 5).map((hire) => (
                            <HireCard
                                key={hire.id}
                                hire={hire}
                                professionalId={profile.id}
                                onUpdate={loadData}
                            />
                        ))}
                    </div>
                )}
            </section>

            <ProfessionalFloatingNavIsland />
        </main>
    );
}

// ─── HireCard ─────────────────────────────────────────────────────────────────

function HireCard({
    hire,
    professionalId,
    onUpdate,
}: {
    hire: HireRequest;
    professionalId: string;
    onUpdate: () => void;
}) {
    const { toast } = useToast();
    const [updating, setUpdating] = useState(false);
    const statusInfo = STATUS_CONFIG[hire.status] || STATUS_CONFIG.pending;
    const StatusIcon = statusInfo.icon;

    const handleUpdateStatus = async (newStatus: "accepted" | "rejected") => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from("professional_hires")
                .update({ status: newStatus })
                .eq("id", hire.id);

            if (error) throw error;

            if (newStatus === "accepted") {
                // 1. Create formal binding (upsert to avoid duplicates)
                await (supabase as any)
                    .from("professional_student_bindings")
                    .upsert({
                        professional_id: professionalId,
                        student_id: hire.student_id,
                        hire_id: hire.id,
                        status: "active",
                    }, { onConflict: "professional_id,student_id" });

                // 2. Create chat room if not yet exists
                const { data: existingRoom } = await supabase
                    .from("professional_chat_rooms")
                    .select("id")
                    .eq("professional_id", hire.professional_id)
                    .eq("student_id", hire.student_id)
                    .maybeSingle();

                if (!existingRoom) {
                    await supabase
                        .from("professional_chat_rooms")
                        .insert({
                            professional_id: hire.professional_id,
                            student_id: hire.student_id,
                            last_message_at: new Date().toISOString(),
                        });
                }

                toast({
                    title: "✅ Solicitação aceita!",
                    description: `Vínculo criado com ${hire.profiles?.nome || hire.profiles?.display_name || "o aluno"}.`,
                });
            } else {
                toast({
                    title: "Solicitação recusada.",
                    description: "A solicitação foi recusada com sucesso.",
                });
            }

            onUpdate();
        } catch (error: any) {
            console.error("handleUpdateStatus error:", error);
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setUpdating(false);
        }
    };

    const studentName = hire.profiles?.nome || hire.profiles?.display_name || "Aluno";

    return (
        <div className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-4 backdrop-blur-md transition-all hover:bg-white/[0.05]">
            <div className="flex flex-col gap-3">
                {/* Header row */}
                <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/5">
                        {hire.profiles?.avatar_url ? (
                            <img src={hire.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-5 w-5 text-zinc-400" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-bold text-white truncate">
                                {studentName}
                            </p>
                            <Badge variant="outline" className={`${statusInfo.color} border-current/20 bg-current/5 text-[9px] h-4 uppercase font-black px-1.5`}>
                                <StatusIcon className="h-2.5 w-2.5 mr-0.5" /> {statusInfo.label}
                            </Badge>
                        </div>

                        {/* Student details */}
                        {hire.profiles?.email && (
                            <div className="flex items-center gap-1 mb-1">
                                <Mail className="h-3 w-3 text-zinc-600 shrink-0" />
                                <p className="text-[10px] text-zinc-500 truncate">{hire.profiles.email}</p>
                            </div>
                        )}

                        <p className="text-xs text-white/50 line-clamp-1 mb-1">
                            {hire.message || "Contratação via Telemedicina"}
                        </p>

                        {/* Body metrics */}
                        {(hire.profiles?.peso_kg || hire.profiles?.altura_cm || hire.profiles?.objetivo) && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {hire.profiles.peso_kg && (
                                    <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[9px] font-bold text-zinc-400 uppercase">
                                        {hire.profiles.peso_kg} kg
                                    </span>
                                )}
                                {hire.profiles.altura_cm && (
                                    <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[9px] font-bold text-zinc-400 uppercase">
                                        {hire.profiles.altura_cm} cm
                                    </span>
                                )}
                                {hire.profiles.objetivo && (
                                    <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary uppercase">
                                        {hire.profiles.objetivo}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2 mt-1.5">
                            <Clock className="h-3 w-3 text-zinc-600" />
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tight">
                                {new Date(hire.created_at).toLocaleString("pt-BR", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action buttons for pending */}
                {(hire.status === "pending" || hire.status === "awaiting_verification") && (
                    <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                        <button
                            onClick={() => window.location.href = `/professional/student/${hire.student_id}`}
                            className="flex h-9 items-center justify-center rounded-xl bg-white/5 text-xs font-bold text-white hover:bg-white/10 transition-colors px-3 gap-1"
                        >
                            <Eye className="h-3.5 w-3.5" /> Ver Perfil
                        </button>
                        <button
                            onClick={() => handleUpdateStatus("accepted")}
                            disabled={updating}
                            className="flex flex-1 h-9 items-center justify-center rounded-xl bg-[#56FF02]/10 text-[#56FF02] text-xs font-bold hover:bg-[#56FF02]/20 transition-colors disabled:opacity-50 gap-1"
                        >
                            <CheckCircle2 className="h-4 w-4" /> Aceitar
                        </button>
                        <button
                            onClick={() => handleUpdateStatus("rejected")}
                            disabled={updating}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                            <XCircle className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Accepted state — quick actions */}
                {hire.status === "accepted" && (
                    <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                        <button
                            onClick={() => window.location.href = `/professional/student/${hire.student_id}`}
                            className="flex flex-1 h-9 items-center justify-center rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors gap-1"
                        >
                            <TrendingUp className="h-3.5 w-3.5" /> Ver Evolução
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── StudentBindingCard ───────────────────────────────────────────────────────

function StudentBindingCard({
    binding,
    onViewEvolution,
    onOpenChat,
}: {
    binding: StudentBinding;
    onViewEvolution: () => void;
    onOpenChat: () => void;
}) {
    const studentName = binding.profiles?.nome || binding.profiles?.display_name || "Aluno";

    return (
        <div className="group relative overflow-hidden rounded-[24px] border border-primary/10 bg-gradient-to-br from-primary/5 to-transparent p-4 backdrop-blur-md transition-all hover:border-primary/20">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/5">
                    {binding.profiles?.avatar_url ? (
                        <img src={binding.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <User className="h-5 w-5 text-zinc-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{studentName}</p>
                    {binding.profiles?.email && (
                        <p className="text-[10px] text-zinc-500 truncate">{binding.profiles.email}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                        {binding.profiles?.objetivo && (
                            <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary uppercase">
                                {binding.profiles.objetivo}
                            </span>
                        )}
                        {binding.profiles?.nivel && (
                            <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[9px] font-bold text-zinc-400 uppercase">
                                {binding.profiles.nivel}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                    <button
                        onClick={onViewEvolution}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Ver Evolução"
                    >
                        <TrendingUp className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onOpenChat}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                        title="Chat"
                    >
                        <MessageCircle className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
