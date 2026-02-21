import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, CreditCard, Sparkles, Crown, Calendar, Lock, ArrowUpRight, BarChart3 } from "lucide-react";
import { useStorePlanModules } from "@/hooks/useStorePlanModules";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface FinanceStats {
  totalSales: number;
  orderCount: number;
  pendingValue: number;
  dailyData: { date: string; amount: number }[];
}

const LojaFinanceiroPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const { hasModule, isLoading: isPlanLoading } = useStorePlanModules();
  const isPro = hasModule("financeiro");
  const [stats, setStats] = useState<FinanceStats>({
    totalSales: 0,
    orderCount: 0,
    pendingValue: 0,
    dailyData: []
  });

  useEffect(() => {
    document.title = "Financeiro - Nexfit Lojista";
  }, []);

  const loadFinanceData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: store } = await (supabase as any)
        .from("marketplace_stores")
        .select("id, subscription_plan")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (!store) return;

      // Load financial data regardless (stats are shown to all)

      const { data: orders } = await (supabase as any)
        .from("marketplace_orders")
        .select("total, status, created_at")
        .eq("store_id", store.id)
        .order('created_at', { ascending: true });

      if (orders) {
        const confirmedOrders = orders.filter((o: any) =>
          o.status === "delivered" || o.status === "paid" || o.status === "accepted"
        );

        const totalSales = confirmedOrders.reduce((acc: number, o: any) => acc + (o.total || 0), 0);

        const pendingValue = orders
          .filter((o: any) => o.status === "pending")
          .reduce((acc: number, o: any) => acc + (o.total || 0), 0);

        // Aggregate daily data for the last 30 days
        const last30Days: Record<string, number> = {};
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          last30Days[dateStr] = 0;
        }

        confirmedOrders.forEach((o: any) => {
          const dateStr = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          if (last30Days[dateStr] !== undefined) {
            last30Days[dateStr] += (o.total || 0);
          }
        });

        const dailyData = Object.entries(last30Days).map(([date, amount]) => ({
          date,
          amount
        }));

        setStats({
          totalSales,
          orderCount: orders.length,
          pendingValue,
          dailyData
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadFinanceData(); }, [loadFinanceData]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  if (loading || isPlanLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 safe-bottom-floating-nav">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Financeiro</p>
            <h1 className="mt-1 text-2xl font-black text-white uppercase tracking-tight">Gestão Financeira</h1>
          </div>
          {!isPro && (
            <button onClick={() => navigate("/loja/plano")} className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors">
              <Crown className="h-3 w-3" /> PRO
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-3 mb-6">
        <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-md">
          <div className="absolute top-0 right-0 p-4 opacity-50">
            <div className="h-20 w-20 rounded-full bg-primary/20 blur-2xl" />
          </div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/10">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">Vendas Confirmadas</p>
              <p className="text-2xl font-black text-white">{formatBRL(stats.totalSales)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-4 backdrop-blur-md">
            <div className="flex flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-zinc-400">Total Pedidos</p>
                <p className="text-xl font-black text-white">{stats.orderCount}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-4 backdrop-blur-md">
            <div className="flex flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-zinc-400">Em Análise</p>
                <p className="text-xl font-black text-white">{formatBRL(stats.pendingValue)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RELATÓRIOS PRO SECTION REMOVED AS IT IS NOW UNLOCKED */}
      <div className="mt-8 space-y-4">
        <div className="overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-white/5 bg-white/5 px-5 py-4">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Relatório Simplificado</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-sm text-zinc-400">Faturamento Bruto</span>
              <span className="text-sm font-bold text-white">{formatBRL(stats.totalSales + stats.pendingValue)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-sm text-zinc-400">Custos Operacionais</span>
              <span className="text-sm font-bold text-red-400">R$ 0,00</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-white">Resultado Líquido</span>
              <span className="text-base font-black text-primary">{formatBRL(stats.totalSales)}</span>
            </div>
          </div>
          <div className="bg-primary/5 px-5 py-3">
            <p className="text-[10px] text-zinc-500 italic">
              * Baseado nos pedidos entregues e pagos.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Desempenho de Vendas</h3>
            </div>
          </div>

          <div className="h-[200px] w-full">
            <ChartContainer config={{
              amount: { label: "Vendas", color: "hsl(var(--primary))" }
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                    minTickGap={20}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={<ChartTooltipContent hideLabel />}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar
                    dataKey="amount"
                    radius={[4, 4, 0, 0]}
                  >
                    {stats.dailyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.amount > 0 ? "var(--primary)" : "rgba(255,255,255,0.1)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
            <p className="text-[10px] text-zinc-500 italic uppercase tracking-wider">Últimos 30 dias</p>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[10px] text-zinc-400 font-bold uppercase">Volume de Vendas</span>
            </div>
          </div>
        </div>
      </div>


      <div className="mt-8 space-y-4">
        {/* RELATÓRIOS PRO SECTION */}
        <div className="overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] backdrop-blur-md relative">
          {!isPro && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md bg-black/70">
              <Lock className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">Relatórios Avançados</h3>
              <p className="text-xs text-zinc-400 mb-4 px-4">Histórico detalhado e exportação de dados para gestão contábil.</p>
              <button
                className="w-full max-w-[200px] rounded-xl bg-primary py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(86,255,2,0.3)]"
                onClick={() => navigate("/loja/plano")}
              >
                Assinar Interprise
              </button>
            </div>
          )}
          <div className={`p-6 ${!isPro ? 'opacity-30 select-none pointer-events-none' : ''}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-300">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Histórico de Transações</h3>
                <p className="text-[10px] text-zinc-500">Exporte sua movimentação completa</p>
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/20 transition-colors border border-white/5">
              <ArrowUpRight className="h-4 w-4" /> Baixar Extrato (CSV)
            </button>
          </div>
        </div>
      </div>

      <LojaFloatingNavIsland />
    </main >
  );
};

export default LojaFinanceiroPage;
