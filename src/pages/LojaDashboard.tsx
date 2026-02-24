import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { GreetingCard } from "@/components/dashboard/GreetingCard";
import logoNexfit from "@/assets/nexfit-logo.png";
import { Package, DollarSign, TrendingUp, ShoppingBag, LogOut, Clock, CheckCircle2, XCircle, ChevronRight, User, Lock, Megaphone, Zap, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStorePlanModules } from "@/hooks/useStorePlanModules";

interface StoreInfo {
  id: string;
  nome: string;
  profile_image_url: string | null;
  banner_image_url: string | null;
  subscription_plan: string | null;
}

interface OrderRow {
  id: string;
  status: string;
  total: number;
  created_at: string;
  delivery_city: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-yellow-400", icon: Clock },
  accepted: { label: "Aceito", color: "text-[#56FF02]", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "text-red-500", icon: XCircle },
  cart: { label: "Carrinho", color: "text-zinc-500", icon: ShoppingBag },
};

const LojaDashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const { hasModule, isLoading: isPlanLoading } = useStorePlanModules();
  const isPro = hasModule("relatorios") || hasModule("financeiro") || hasModule("estoque");

  useEffect(() => {
    document.title = "Painel do Lojista - Nexfit";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const { data: storeData, error } = await (supabase as any)
        .from("marketplace_stores")
        .select("id, nome, profile_image_url, banner_image_url, subscription_plan")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (error) {
        toast({ title: "Erro ao carregar loja", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!storeData) {
        setLoading(false);
        return;
      }

      setStore(storeData as StoreInfo);

      // Count products
      const { count: pCount } = await supabase
        .from("marketplace_products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeData.id);

      setProductCount(pCount ?? 0);

      // Fetch orders (non-cart)
      const { data: ordersData } = await (supabase as any)
        .from("marketplace_orders")
        .select("id, status, total, created_at, delivery_city")
        .eq("store_id", storeData.id)
        .neq("status", "cart")
        .order("created_at", { ascending: false })
        .limit(50);

      const ordersList = (ordersData ?? []) as OrderRow[];
      setOrders(ordersList);

      // Calculate revenue from accepted orders
      const acceptedOrders = ordersList.filter((o) => o.status === "accepted");
      const total = acceptedOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
      setTotalRevenue(total);

      // Monthly revenue
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthOrders = acceptedOrders.filter((o) => o.created_at >= startOfMonth);
      const monthTotal = monthOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
      setMonthRevenue(monthTotal);

      // Fetch abandoned carts (last_cart_activity < 24h)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { data: abandonedData } = await (supabase as any)
        .from("marketplace_orders")
        .select(`
          id, 
          updated_at, 
          status,
          user:profiles(id, nome, avatar_url, whatsapp)
        `)
        .eq("store_id", storeData.id)
        .eq("status", "cart")
        .lt("updated_at", oneDayAgo.toISOString())
        .order("updated_at", { ascending: false });

      if (abandonedData) {
        setAbandonedCarts(abandonedData);
      }

      setLoading(false);
    };
    void load();
  }, [user, toast]);

  if (loading || isPlanLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  if (!store) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
        <p className="text-sm text-zinc-400">
          Nenhuma loja vinculada à sua conta. Contate o Admin Master.
        </p>
        <LojaFloatingNavIsland />
      </main>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const recentOrders = orders.slice(0, 10);

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
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.clear();
                window.location.href = "/auth";
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        <GreetingCard
          name={store.nome}
          avatarUrl={store.profile_image_url}
          onAvatarError={() => { }}
          subtitle="Acesse os módulos da sua loja abaixo"
          customBadge={
            <div className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 backdrop-blur-xl shadow-[0_0_15px_-3px_rgba(var(--primary),0.2)]">
              <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">
                Lojista
              </span>
            </div>
          }
        />
      </header>

      {/* Premium Hub Buttons */}
      <section className="mt-6 px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#56FF02] drop-shadow-[0_0_8px_rgba(86,255,2,0.4)]">
            Módulos da Loja
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Módulo de Pedidos (Livre) */}
          <button
            onClick={() => {
              navigate("/loja/pedidos");
            }}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-blue-400 shadow-inner">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white leading-none">Pedidos</h3>
              <p className="text-[10px] text-zinc-400 font-medium">Gestão de Vendas</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <ShoppingBag className="h-10 w-10 rotate-12 text-blue-400" />
            </div>
          </button>

          {/* Financeiro (Freemium) */}
          <button
            onClick={() => navigate("/loja/financeiro")}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-emerald-400 shadow-inner">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white leading-none">Financeiro</h3>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Faturamento e Relatórios</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <DollarSign className="h-10 w-10 rotate-12 text-emerald-400" />
            </div>
          </button>

          {/* Vitrine (Freemium) */}
          <button
            onClick={() => navigate("/loja/produtos")}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-purple-400 shadow-inner">
              <Package className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white leading-none">Vitrine</h3>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Top Vendas</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <Package className="h-10 w-10 rotate-12 text-purple-400" />
            </div>
          </button>

          {/* Estoque (Freemium) */}
          <button
            onClick={() => navigate("/loja/estoque")}
            className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-orange-400 shadow-inner">
              <Warehouse className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white leading-none">Estoque</h3>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Controle e Cadastro</p>
            </div>
            <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
              <Warehouse className="h-10 w-10 rotate-12 text-orange-400" />
            </div>
          </button>

          {/* Nexfit ADS (Upsell / Pack) */}
          <button
            onClick={() => {
              navigate("/loja/destaque");
            }}
            className="group relative col-span-2 flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 p-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99] backdrop-blur-md"
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner">
                <Megaphone className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 tracking-widest text-[9px]">IMPULSIONAR VENDAS</Badge>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black italic text-white leading-none flex items-center gap-2">NEXFIT <span className="text-primary">ADS</span> <Zap className="h-4 w-4 text-primary fill-primary" /></h3>
              <p className="text-xs text-zinc-400 font-medium mt-1">Destaque sua loja com banners exclusivos <br />no dashboard principal de todos os alunos.</p>
            </div>
            <div className="absolute top-4 right-10 opacity-5 transition-opacity group-hover:opacity-10">
              <Megaphone className="h-24 w-24 rotate-12 text-primary" />
            </div>
          </button>

        </div>
      </section>

      <LojaFloatingNavIsland />
    </main>
  );
};

export default LojaDashboardPage;
