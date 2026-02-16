import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, Download, ArrowUpRight, Loader2 } from "lucide-react";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FinanceStats {
    totalRevenue: number;
    availableBalance: number;
    activeClients: number;
    pendingRequests: number;
    recentTransactions: any[];
}

export default function ProfessionalFinanceiroPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<FinanceStats>({
        totalRevenue: 0,
        availableBalance: 0,
        activeClients: 0,
        pendingRequests: 0,
        recentTransactions: [],
    });

    const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawCycle, setWithdrawCycle] = useState<"15" | "30">("30");
    const [pixKey, setPixKey] = useState("");
    const [pixType, setPixType] = useState("cpf");
    const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

    useEffect(() => {
        loadFinancialData();
    }, [user]);

    const loadFinancialData = async () => {
        if (!user) return;
        try {
            // Get professional ID and balance
            const { data: prof } = await supabase
                .from("professionals")
                .select("id, base_price, balance")
                .eq("user_id", user.id)
                .single();

            if (!prof) return;

            // Get paid hires
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
                .eq("professional_id", prof.id);

            if (hires) {
                const paidHires = hires.filter(h => h.is_paid);
                const pendingHires = hires.filter(h => h.status === "pending");

                // Revenue is sum of paid_amount - platform_fee
                const totalRevenue = paidHires.reduce((sum, h) => sum + (Number(h.paid_amount || 0) - Number(h.platform_fee || 0)), 0);

                setStats({
                    totalRevenue,
                    availableBalance: Number(prof.balance || 0),
                    activeClients: paidHires.length,
                    pendingRequests: pendingHires.length,
                    recentTransactions: paidHires.slice(0, 5).map(h => ({
                        id: h.id,
                        name: h.profiles?.display_name || "Aluno",
                        amount: Number(h.paid_amount || 0) - Number(h.platform_fee || 0),
                        date: new Date(h.created_at).toLocaleDateString("pt-BR"),
                        type: "Contratação"
                    })),
                });
            }

        } catch (error: any) {
            console.error("Load finance error:", error);
            toast({
                title: "Erro ao carregar dados financeiros",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black pb-28 pt-6 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <header>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">
                        Financeiro
                    </p>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Ganhos & Gestão</h1>
                </header>

                <div className="grid grid-cols-2 gap-3">
                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2 text-primary">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Saldo Disponível</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-black text-white">R$ {stats.availableBalance.toFixed(2)}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">
                                Pronto para saque
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2 text-green-400">
                                <TrendingUp className="h-4 w-4" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Receita Total</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-black text-white">R$ {stats.totalRevenue.toFixed(2)}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">Líquido (pós taxas)</p>
                        </CardContent>
                    </Card>
                </div>

                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Transações Recentes</h2>
                        <button className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                            <Download className="h-3 w-3" /> Exportar
                        </button>
                    </div>

                    <div className="space-y-3">
                        {stats.recentTransactions.length === 0 ? (
                            <div className="p-8 text-center border border-white/5 bg-white/[0.03] rounded-3xl">
                                <p className="text-xs text-zinc-500">Nenhuma transação registrada ainda.</p>
                            </div>
                        ) : (
                            stats.recentTransactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-4 rounded-3xl border border-white/5 bg-white/[0.03] backdrop-blur-md">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                            <ArrowUpRight className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{tx.name}</p>
                                            <p className="text-[10px] text-zinc-500">{tx.type} • {tx.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-primary">+ R$ {tx.amount.toFixed(2)}</p>
                                        <Badge variant="outline" className="text-[8px] h-4 border-primary/30 text-primary">Efetuado</Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <Card className="border-white/10 bg-gradient-to-br from-zinc-900 to-black overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <DollarSign className="h-24 w-24" />
                    </div>
                    <CardContent className="p-6 space-y-4">
                        <h3 className="text-white font-bold">Solicitar Saque</h3>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            O ciclo de saque pode ser de 15 dias (taxa de 8%) ou 30 dias (taxa de 5%).
                            As solicitações são processadas manualmente pelo administrador.
                        </p>
                        <Button
                            className="w-full bg-primary text-black hover:bg-primary/90"
                            disabled={stats.availableBalance < 50}
                            onClick={() => setShowWithdrawDialog(true)}
                        >
                            {stats.availableBalance < 50
                                ? "Saldo mínimo R$ 50,00"
                                : "Solicitar Saque"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Withdraw Dialog */}
                <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                    <DialogContent className="bg-zinc-900 border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle>Solicitação de Saque</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                Escolha o ciclo de saque e informe seus dados PIX.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="space-y-2">
                                <Label>Ciclo de Saque</Label>
                                <RadioGroup
                                    value={withdrawCycle}
                                    onValueChange={(val: any) => setWithdrawCycle(val)}
                                    className="grid grid-cols-2 gap-4"
                                >
                                    <div className={`p-4 rounded-2xl border transition-all ${withdrawCycle === "15" ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5'}`}>
                                        <Label htmlFor="c15" className="flex flex-col cursor-pointer">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold">15 Dias</span>
                                                <RadioGroupItem value="15" id="c15" />
                                            </div>
                                            <span className="text-[10px] text-zinc-400">Taxa de 8%</span>
                                        </Label>
                                    </div>
                                    <div className={`p-4 rounded-2xl border transition-all ${withdrawCycle === "30" ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5'}`}>
                                        <Label htmlFor="c30" className="flex flex-col cursor-pointer">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold">30 Dias</span>
                                                <RadioGroupItem value="30" id="c30" />
                                            </div>
                                            <span className="text-[10px] text-zinc-400">Taxa de 5%</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Tipo de Chave PIX</Label>
                                    <RadioGroup value={pixType} onValueChange={setPixType} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="cpf" id="cpf" />
                                            <Label htmlFor="cpf" className="text-xs">CPF/CNPJ</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="email" id="email" />
                                            <Label htmlFor="email" className="text-xs">Email</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="phone" id="phone" />
                                            <Label htmlFor="phone" className="text-xs">Celular</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pixKey">Sua Chave PIX</Label>
                                    <Input
                                        id="pixKey"
                                        value={pixKey}
                                        onChange={(e) => setPixKey(e.target.value)}
                                        placeholder="Digite sua chave aqui"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="amount">Valor do Saque (Máx: R$ {stats.availableBalance.toFixed(2)})</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="0,00"
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400">Valor Bruto</span>
                                    <span className="text-white">R$ {Number(withdrawAmount || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-red-400">
                                    <span>Taxa do Ciclo ({withdrawCycle === "15" ? '8%' : '5%'})</span>
                                    <span>- R$ {(Number(withdrawAmount || 0) * (withdrawCycle === "15" ? 0.08 : 0.05)).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t border-white/5 pt-2">
                                    <span>Valor Líquido</span>
                                    <span className="text-primary">R$ {(Number(withdrawAmount || 0) * (withdrawCycle === "15" ? 0.92 : 0.95)).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                className="w-full bg-primary text-black hover:bg-primary/90"
                                disabled={submittingWithdraw || !withdrawAmount || Number(withdrawAmount) < 50 || Number(withdrawAmount) > stats.availableBalance || !pixKey}
                                onClick={async () => {
                                    setSubmittingWithdraw(true);
                                    try {
                                        const amount = Number(withdrawAmount);
                                        const feePercent = withdrawCycle === "15" ? 8 : 5;
                                        const feeAmount = amount * (feePercent / 100);
                                        const netAmount = amount - feeAmount;

                                        // Get professional ID again to be sure
                                        const { data: prof } = await supabase
                                            .from("professionals")
                                            .select("id")
                                            .eq("user_id", user?.id)
                                            .single();

                                        const { error } = await supabase.from("professional_withdrawals").insert({
                                            professional_id: prof?.id,
                                            amount,
                                            fee_percent: feePercent,
                                            fee_amount: feeAmount,
                                            net_amount: netAmount,
                                            pix_key: pixKey,
                                            pix_type: pixType,
                                            status: "pending"
                                        });

                                        if (error) throw error;

                                        // Deduct from balance
                                        const { error: updateError } = await supabase
                                            .from("professionals")
                                            .update({ balance: stats.availableBalance - amount })
                                            .eq("id", prof?.id);

                                        if (updateError) throw updateError;

                                        toast({
                                            title: "Solicitação enviada!",
                                            description: "Seu saque será processado em breve.",
                                        });
                                        setShowWithdrawDialog(false);
                                        loadFinancialData();
                                    } catch (err: any) {
                                        toast({
                                            title: "Erro ao solicitar saque",
                                            description: err.message,
                                            variant: "destructive"
                                        });
                                    } finally {
                                        setSubmittingWithdraw(false);
                                    }
                                }}
                            >
                                {submittingWithdraw ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirmar Solicitação"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <ProfessionalFloatingNavIsland />
        </main>
    );
}
