import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    User,
    LogOut,
    Sparkles,
    Users,
    CheckCircle2,
    Clock,
    XCircle,
    Eye,
    DollarSign,
    Lock,
    Unlock,
    Calendar as CalendarIcon,
    Image as ImageIcon
} from "lucide-react";
import { getSpecialtyLabel } from "@/lib/professionalSpecialties";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";

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
    profiles: {
        display_name: string;
    };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Pendente", color: "text-yellow-400", icon: Clock },
    accepted: { label: "Aceito", color: "text-green-400", icon: CheckCircle2 },
    rejected: { label: "Rejeitado", color: "text-red-400", icon: XCircle },
    completed: { label: "Concluído", color: "text-blue-400", icon: CheckCircle2 },
};

export default function ProfessionalDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
    const [hires, setHires] = useState<HireRequest[]>([]);
    const [lpViews, setLpViews] = useState(0);

    useEffect(() => {
        document.title = "Dashboard Profissional - Nexfit";
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
                    // No profile found, redirect to registration
                    navigate("/professional/register");
                    return;
                }
                throw profileError;
            }

            setProfile(profileData as ProfessionalProfile);

            // Load hire requests
            const { data: hiresData } = await supabase
                .from("professional_hires")
                .select(`
          id,
          status,
          message,
          created_at,
          student_id,
          profiles!professional_hires_student_id_fkey(display_name)
        `)
                .eq("professional_id", profileData.id)
                .order("created_at", { ascending: false })
                .limit(20);

            setHires((hiresData || []) as any);

            // Load LP views if LP exists
            if (profileData.lp_unlocked) {
                const { data: lpData } = await supabase
                    .from("professional_landing_pages")
                    .select("views_count")
                    .eq("professional_id", profileData.id)
                    .eq("is_active", true)
                    .single();

                if (lpData) {
                    setLpViews(lpData.views_count || 0);
                }
            }
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
        navigate("/auth", { replace: true });
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!profile) return null;

    const pendingHires = hires.filter(h => h.status === "pending");
    const acceptedHires = hires.filter(h => h.status === "accepted");

    const stats = [
        {
            icon: Users,
            label: "Alunos Ativos",
            value: String(acceptedHires.length),
            color: "text-blue-400",
            path: "/professional/chat"
        },
        {
            icon: CalendarIcon,
            label: "Sua Agenda",
            value: "Ver Sessões",
            color: "text-purple-400",
            path: "/professional/agenda"
        },
        {
            icon: DollarSign,
            label: "Ganhos Totais",
            value: profile.base_price ? `R$ ${(acceptedHires.length * profile.base_price).toFixed(2)}` : "R$ 0,00",
            color: "text-primary",
            path: "/professional/financeiro"
        },
        {
            icon: Clock,
            label: "Pendentes",
            value: String(pendingHires.length),
            color: "text-yellow-400",
            path: "/professional/dashboard"
        },
    ];

    return (
        <main className="min-h-screen bg-black pb-28">
            {/* Header Card */}
            <section className="relative px-4 pt-4">
                <div className="relative flex min-h-[140px] flex-col justify-end overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
                    {profile.cover_image_url && (
                        <div className="absolute inset-0 z-0">
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                            <img
                                src={profile.cover_image_url}
                                alt="Cover"
                                className="h-full w-full object-cover opacity-60"
                            />
                        </div>
                    )}

                    <div className="relative z-10 flex items-end gap-4">
                        <div className="relative h-20 w-20 rounded-2xl border-2 border-white/10 bg-black/40 backdrop-blur-md overflow-hidden shadow-2xl">
                            {profile.profile_image_url ? (
                                <img
                                    src={profile.profile_image_url}
                                    alt={profile.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <User className="h-8 w-8 text-primary" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">
                                Profissional
                            </p>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none drop-shadow-md">
                                {profile.name}
                            </h1>
                            <p className="text-xs text-white/60 mt-1">
                                {getSpecialtyLabel(profile.specialty)}
                            </p>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </section>

            {/* LP Management Shortcut */}
            <section className="px-4 mt-6">
                <Card className="border-primary/20 bg-primary/5 border-dashed">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Sua Página Pública</h3>
                                <p className="text-[10px] text-white/50">Personalize sua landing page manual</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => navigate("/professional/lp-editor")}
                            size="sm"
                            className="bg-primary text-black hover:bg-primary/90 rounded-lg text-xs"
                        >
                            Configurar
                        </Button>
                    </CardContent>
                </Card>
            </section>



            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 px-4 mt-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <button
                            key={stat.label}
                            onClick={() => navigate(stat.path)}
                            className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-md transition-all hover:bg-white/[0.06] text-left"
                        >
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <Icon className={`h-4 w-4 ${stat.color}`} />
                                    <span className="text-[9px] uppercase tracking-wider text-zinc-400">
                                        {stat.label}
                                    </span>
                                </div>
                                <p className="text-xl font-black text-white">{stat.value}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Pending Hire Requests */}
            {pendingHires.length > 0 && (
                <section className="mt-8 px-4">
                    <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        Aguardando Resposta ({pendingHires.length})
                    </h2>
                    <div className="space-y-3">
                        {pendingHires.map((hire) => (
                            <HireCard key={hire.id} hire={hire} onUpdate={loadData} />
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Hires */}
            <section className="mt-8 px-4">
                <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-400">
                    Solicitações Recentes
                </h2>
                {hires.length === 0 ? (
                    <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-8 text-center backdrop-blur-md">
                        <p className="text-xs text-zinc-500">
                            Nenhuma solicitação ainda. Quando alunos te contratarem, aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {hires.slice(0, 10).map((hire) => (
                            <HireCard key={hire.id} hire={hire} onUpdate={loadData} />
                        ))}
                    </div>
                )}
            </section>

            {/* Floating Navigation */}
            <ProfessionalFloatingNavIsland />
        </main>
    );
}

// Hire Card Component
function HireCard({ hire, onUpdate }: { hire: HireRequest; onUpdate: () => void }) {
    const { toast } = useToast();
    const [updating, setUpdating] = useState(false);
    const statusInfo = STATUS_CONFIG[hire.status] || STATUS_CONFIG.pending;
    const StatusIcon = statusInfo.icon;

    const handleUpdateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from("professional_hires")
                .update({ status: newStatus })
                .eq("id", hire.id);

            if (error) throw error;

            toast({
                title: "Status atualizado",
                description: `Solicitação ${newStatus === "accepted" ? "aceita" : "rejeitada"} com sucesso.`,
            });

            onUpdate();
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-white truncate">
                            {hire.profiles?.display_name || "Aluno"}
                        </p>
                        <Badge variant="outline" className={`${statusInfo.color} border-current`}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusInfo.label}
                        </Badge>
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2 mb-2">
                        {hire.message || "Sem mensagem"}
                    </p>
                    <p className="text-[10px] text-white/40">
                        {new Date(hire.created_at).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short"
                        })}
                    </p>
                </div>

                {hire.status === "pending" && (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-green-500/50 text-green-400 hover:bg-green-500/10"
                            onClick={() => handleUpdateStatus("accepted")}
                            disabled={updating}
                        >
                            Aceitar
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-red-500/50 text-red-400 hover:bg-red-500/10"
                            onClick={() => handleUpdateStatus("rejected")}
                            disabled={updating}
                        >
                            Rejeitar
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
