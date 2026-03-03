import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfessionalPlanModules } from "@/hooks/useProfessionalPlanModules";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, Download, ArrowUpRight, Loader2, Lock, Filter, Calendar, Crown } from "lucide-react";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

interface FinanceStats {
    totalRevenue: number;
    availableBalance: number;
    activeClients: number;
    pendingRequests: number;
    recentTransactions: any[];
    chartData: any[];
}

export default function ProfessionalFinanceiroPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { hasModule, isLoading: isPlanLoading } = useProfessionalPlanModules();
    const isPro = hasModule("financeiro");

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<FinanceStats>({
        totalRevenue: 0,
        availableBalance: 0,
        activeClients: 0,
        pendingRequests: 0,
        recentTransactions: [],
        chartData: [],
    });

    const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawCycle, setWithdrawCycle] = useState<"15" | "30">("30");
    const [pixKey, setPixKey] = useState("");
    const [pixType, setPixType] = useState("cpf");
    const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

    useEffect(() => {
        if (isPro) {
            checkAccessAndLoadData();
        }
    }, [user, isPro]);

    const checkAccessAndLoadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Check if professional has access to financial module
            const { data: prof, error: profError } = await supabase
                .from("professionals")
                .select("id, balance")
                .eq("user_id", user.id)
                .single();

            if (profError || !prof) throw new Error("Profissional não encontrado");

            await loadFinancialData(prof.id, Number(prof.balance || 0));

        } catch (error: any) {
            console.error("Access/Load error:", error);
            // Don't toast access denied, UI will handle it
        } finally {
            setLoading(false);
        }
    };

    const loadFinancialData = async (profId: string, balance: number) => {
        try {
            // Get paid hires for revenue and charts
            const { data: hires } = await supabase
                .from("professional_hires")
                .select(`
                    id, 
                    status, 
                    created_at, 
                    paid_amount,
                    platform_fee,
                    is_paid,
                    profiles!professional_hires_student_id_fkey(display_name)
                `)
                .eq("professional_id", profId);

            if (hires) {
                const paidHires = hires.filter(h => h.is_paid);
                const pendingHires = hires.filter(h => h.status === "pending");

                const totalRevenue = paidHires.reduce((sum, h) => sum + (Number(h.paid_amount || 0) - Number(h.platform_fee || 0)), 0);

                // Group by day for the chart (last 7 days example)
                const chartData = Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                    const dayRevenue = paidHires
                        .filter(h => new Date(h.created_at).toDateString() === date.toDateString())
                        .reduce((sum, h) => sum + (Number(h.paid_amount || 0) - Number(h.platform_fee || 0)), 0);

                    return { name: dateStr, valor: dayRevenue };
                });

                setStats({
                    totalRevenue,
                    availableBalance: balance,
                    activeClients: paidHires.length,
                    pendingRequests: pendingHires.length,
                    recentTransactions: paidHires.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map(h => ({
                        id: h.id,
                        name: h.profiles?.display_name || "Aluno",
                        amount: Number(h.paid_amount || 0) - Number(h.platform_fee || 0),
                        date: new Date(h.created_at).toLocaleDateString("pt-BR"),
                        type: "Contratação"
                    })),
                    chartData
                });
            }
        } catch (error: any) {
            console.error("Load finance stats error:", error);
        }
    };

    if (loading || isPlanLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isPro) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                    <Lock className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Módulo Bloqueado</h1>
                    <p className="text-sm text-zinc-400 max-w-xs">
                        O módulo <strong>Financeiro</strong> não está incluído no seu plano atual.
                    </p>
                </div>
                <button
                    onClick={() => navigate("/professional/plano")}
                    className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-primary/90 transition-colors"
                >
                    <Crown className="h-4 w-4" /> Ver Planos
                </button>
                <ProfessionalFloatingNavIsland />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black pb-28 pt-6 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <header className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">
                            Painel Financeiro
                        </p>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Ganhos & Gestão</h1>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/20 mb-1">PLANO PRO</Badge>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl group hover:border-primary/30 transition-all">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2 text-primary">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Saldo Disponível</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-black text-white">R$ {stats.availableBalance.toFixed(2)}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">Pronto para saque</p>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl group hover:border-green-400/30 transition-all">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2 text-green-400">
                                <TrendingUp className="h-4 w-4" />
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Receita Acumulada</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-black text-white">R$ {stats.totalRevenue.toFixed(2)}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">Líquido (pós taxas)</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Chart Section */}
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-white text-sm font-black uppercase italic">Desempenho Semanal</CardTitle>
                            <CardDescription className="text-[10px]">Faturamento líquido dos últimos 7 dias</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500"><Filter className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EAFF00" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#EAFF00" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#ffffff40"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#ffffff40"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `R$${val}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                    itemStyle={{ color: '#EAFF00', fontSize: '10px', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#ffffff60', fontSize: '10px', marginBottom: '4px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="valor"
                                    stroke="#EAFF00"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Transactions */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> Transações Recentes
                        </h2>
                        <button className="text-[10px] font-bold text-primary uppercase flex items-center gap-1 hover:opacity-80 transition-all">
                            <Download className="h-3 w-3" /> Exportar Relatório
                        </button>
                    </div>

                    <div className="space-y-3">
                        {stats.recentTransactions.length === 0 ? (
                            <div className="p-12 text-center border border-dashed border-white/10 bg-white/[0.02] rounded-3xl">
                                <p className="text-xs text-zinc-600 italic">Nenhum pagamento recebido recentemente.</p>
                            </div>
                        ) : (
                            stats.recentTransactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-4 rounded-3xl border border-white/5 bg-white/[0.03] backdrop-blur-md group hover:bg-white/[0.05] transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <ArrowUpRight className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white uppercase tracking-tight">{tx.name}</p>
                                            <p className="text-[10px] text-zinc-500 font-medium">{tx.type} • {tx.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-primary italic">+ R$ {tx.amount.toFixed(2)}</p>
                                        <Badge variant="outline" className="text-[8px] h-4 border-green-500/30 text-green-400 bg-green-500/5">Pago</Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

            </div>
            <ProfessionalFloatingNavIsland />
        </main>
    );
}
