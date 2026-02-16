import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Video,
    Clock,
    User,
    Loader2,
    Lock,
    Stethoscope,
    ExternalLink
} from "lucide-react";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval,
    parseISO
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agendamento {
    id: string;
    data_hora: string;
    status: string;
    profissional_nome: string;
    consulta_link: string | null;
}

export default function AlunoConsultasPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const [loading, setLoading] = useState(true);
    const { isElite, isMaster, loading: loadingPlan } = useUserPlan();
    const canAccess = isElite || isMaster;

    useEffect(() => {
        if (canAccess && user) {
            fetchAgendamentos();
        }
    }, [user, canAccess]);

    const fetchAgendamentos = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("telemedicina_agendamentos")
                .select("id, data_hora, status, profissional_nome, consulta_link")
                .eq("aluno_id", user.id)
                .order("data_hora", { ascending: true });

            if (error) throw error;
            setAgendamentos((data as any) || []);
        } catch (error: any) {
            console.error("Fetch agendamentos error:", error);
            toast({
                title: "Erro ao carregar agenda",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const calendarGrid = useMemo(() => {
        const startMonth = startOfMonth(currentMonth);
        const endMonth = endOfMonth(startMonth);
        const startDate = startOfWeek(startMonth);
        const endDate = endOfWeek(endMonth);

        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);

    const getAgendamentosForDay = (day: Date) => {
        return agendamentos.filter(a => isSameDay(parseISO(a.data_hora), day));
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    if (loadingPlan) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!canAccess) {
        return (
            <main className="flex h-screen bg-black overflow-hidden flex-col items-center justify-center p-8 text-center">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                    <Lock className="h-12 w-12" />
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Agenda Bloqueada</h1>
                <p className="text-zinc-500 max-w-md mb-8">
                    A visualização de agenda e marcação de consultas é exclusiva para o plano Elite. Comece agora sua jornada premium!
                </p>
                <Button onClick={() => navigate("/aluno/planos")} className="bg-primary text-black hover:bg-primary/90 rounded-full px-8 h-12 font-bold uppercase tracking-wider">
                    Ver Planos
                </Button>
                <FloatingNavIsland />
            </main>
        );
    }

    return (
        <main className="flex flex-col min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <header className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/dashboard")} className="text-zinc-400">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Agenda</h1>
                    </div>
                    <Button
                        onClick={() => navigate("/telemedicina")}
                        className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-full text-xs font-bold uppercase tracking-wider"
                    >
                        Nova Consulta
                    </Button>
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-lg font-bold capitalize">
                        {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9 border-white/10 bg-white/5 hover:bg-white/10">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9 border-white/10 bg-white/5 hover:bg-white/10">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Calendar Content */}
            <div className="p-4 flex-1">
                {/* Desktop/Tablet Grid View */}
                <div className="hidden sm:grid grid-cols-7 border border-white/10 rounded-2xl overflow-hidden bg-white/5">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                        <div key={day} className="p-4 text-center text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-white/5 bg-zinc-900/50">
                            {day}
                        </div>
                    ))}
                    {calendarGrid.map((day, i) => {
                        const dayAgendamentos = getAgendamentosForDay(day);
                        const isToday = isSameDay(day, new Date());
                        const isCurrentMonth = isSameMonth(day, currentMonth);

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "min-h-[120px] p-2 border-r border-b border-white/5 transition-colors",
                                    !isCurrentMonth && "opacity-20 bg-zinc-900/20",
                                    isToday && "bg-primary/5"
                                )}
                            >
                                <div className="flex justify-end p-1">
                                    <span className={cn(
                                        "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                                        isToday && "bg-primary text-black"
                                    )}>
                                        {format(day, "d")}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {dayAgendamentos.map(a => (
                                        <button
                                            key={a.id}
                                            onClick={() => { }} // Could open modal
                                            className="w-full text-left p-1.5 rounded-lg bg-zinc-800 text-[10px] font-medium border border-white/5 hover:border-primary/50 transition-all truncate"
                                        >
                                            <div className="flex items-center gap-1 text-primary">
                                                <Clock className="h-3 w-3" />
                                                {format(parseISO(a.data_hora), "HH:mm")}
                                            </div>
                                            <div className="truncate text-white/80">{a.profissional_nome}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Mobile List View */}
                <div className="sm:hidden space-y-4">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-zinc-500">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-xs uppercase font-bold tracking-widest">Sincronizando Agenda...</p>
                        </div>
                    ) : agendamentos.length === 0 ? (
                        <Card className="border border-white/10 bg-zinc-900 overflow-hidden rounded-3xl">
                            <CardContent className="p-10 text-center space-y-6">
                                <div className="h-20 w-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                                    <CalendarIcon className="h-10 w-10 text-zinc-600" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-lg font-bold text-white uppercase tracking-tight">Sua agenda está vazia</p>
                                    <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                                        Você ainda não possui consultas agendadas. Que tal marcar um horário com nossos especialistas?
                                    </p>
                                </div>
                                <Button
                                    onClick={() => navigate("/telemedicina")}
                                    className="w-full bg-primary text-black hover:bg-primary/90 rounded-2xl h-12 font-bold uppercase tracking-wider text-xs"
                                >
                                    <Stethoscope className="mr-2 h-4 w-4" /> Marcar Consulta
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        agendamentos.map(a => {
                            const date = parseISO(a.data_hora);
                            const isPast = date < new Date();

                            return (
                                <Card key={a.id} className={cn(
                                    "border border-white/10 bg-zinc-900 rounded-[32px] overflow-hidden transition-all active:scale-95",
                                    isPast && "opacity-60 grayscale"
                                )}>
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-4 flex-1">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-primary border border-white/5">
                                                        <span className="text-[10px] uppercase font-black">{format(date, "MMM", { locale: ptBR })}</span>
                                                        <span className="text-lg font-bold leading-none">{format(date, "d")}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black uppercase tracking-tight">{a.profissional_nome}</p>
                                                        <div className="flex items-center gap-4 mt-1 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(date, "HH:mm")}</span>
                                                            <span className="flex items-center gap-1 uppercase tracking-widest"><CalendarIcon className="h-3 w-3" /> {format(date, "eeee", { locale: ptBR })}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {a.consulta_link ? (
                                                        <Button
                                                            asChild
                                                            className="flex-1 bg-primary text-black hover:bg-primary/90 rounded-2xl h-12 font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20"
                                                        >
                                                            <a href={a.consulta_link} target="_blank" rel="noopener noreferrer">
                                                                <Video className="mr-2 h-4 w-4" /> Entrar na Sala
                                                            </a>
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            disabled
                                                            className="flex-1 bg-white/5 text-zinc-600 rounded-2xl h-12 font-bold uppercase tracking-wider text-xs border border-white/10"
                                                        >
                                                            Link em breve
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>

            <FloatingNavIsland />
        </main>
    );
}
