import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, CreditCard, Sparkles, Crown, Calendar, Lock, ArrowUpRight } from "lucide-react";

interface FinanceStats {
  totalSales: number;
  orderCount: number;
  pendingValue: number;
}

const LojaFinanceiroPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(true);
  const [stats, setStats] = useState<FinanceStats>({ totalSales: 0, orderCount: 0, pendingValue: 0 });

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

      const isStorePro = store.subscription_plan === "PRO";
      setIsPro(isStorePro);

      const { data: orders } = await (supabase as any)
        .from("marketplace_orders")
        .select("total, status")
        .eq("store_id", store.id);

      if (orders) {
        const totalSales = orders
          .filter((o: any) => o.status === "delivered" || o.status === "paid" || o.status === "accepted")
          .reduce((acc: number, o: any) => acc + (o.total || 0), 0);

        const pendingValue = orders
          .filter((o: any) => o.status === "pending")
          .reduce((acc: number, o: any) => acc + (o.total || 0), 0);

        setStats({
          totalSales,
          orderCount: orders.length,
          pendingValue,
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 safe-bottom-floating-nav">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Financeiro</p>
        <h1 className="mt-1 text-2xl font-black text-white uppercase tracking-tight">Gestão Financeira</h1>
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

      {!isPro ? (
        <div className="relative mt-8 overflow-hidden rounded-[32px] border border-primary/30 p-6 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-black to-black" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(86,255,2,0.15)]">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              Relatórios PRO
            </h2>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed max-w-[280px]">
              Desbloqueie relatórios de vendas consolidados, lucros por produto e taxas de conversão.
            </p>
            <Button
              onClick={() => navigate("/loja/plano")}
              className="w-full h-12 rounded-xl bg-primary text-base font-bold text-black hover:bg-primary/90 uppercase tracking-widest shadow-[0_0_20px_rgba(86,255,2,0.25)]"
            >
              Desbloquear Agora
            </Button>
          </div>
        </div>
      ) : (
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

          <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
                <Lock className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Gráficos Detalhados</h3>
            <p className="text-xs text-zinc-500 mb-4">Em breve você terá acesso a gráficos de evolução.</p>
            <Button disabled variant="outline" className="h-10 border-white/10 bg-white/5 text-zinc-500 text-xs uppercase tracking-wider">
              Em Desenvolvimento
            </Button>
          </div>
        </div>
      )}

      <LojaFloatingNavIsland />
    </main>
  );
};

export default LojaFinanceiroPage;
