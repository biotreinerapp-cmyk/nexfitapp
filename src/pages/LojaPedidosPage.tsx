import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { Clock, CheckCircle2, XCircle, ShoppingBag, ChevronRight, User, Lock, Search, Filter } from "lucide-react";
import { useStorePlanModules } from "@/hooks/useStorePlanModules";
import { Input } from "@/components/ui/input";

interface OrderRow {
    id: string;
    status: string;
    total: number;
    created_at: string;
    delivery_city: string | null;
    user: {
        nome: string | null;
    } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Pendente", color: "text-yellow-400", icon: Clock },
    accepted: { label: "Aceito", color: "text-[#56FF02]", icon: CheckCircle2 },
    rejected: { label: "Rejeitado", color: "text-red-500", icon: XCircle },
    cart: { label: "Carrinho", color: "text-zinc-500", icon: ShoppingBag },
};

export default function LojaPedidosPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [storeId, setStoreId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);

    const { hasModule, isLoading: isPlanLoading } = useStorePlanModules();

    useEffect(() => {
        document.title = "Pedidos - Nexfit Lojista";
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;

            const { data: storeData } = await (supabase as any)
                .from("marketplace_stores")
                .select("id")
                .eq("owner_user_id", user.id)
                .maybeSingle();

            if (!storeData) {
                setLoading(false);
                return;
            }

            setStoreId(storeData.id);

            // Fetch orders (non-cart)
            const { data: ordersData } = await (supabase as any)
                .from("marketplace_orders")
                .select(`
          id, status, total, created_at, delivery_city,
          user:profiles(nome)
        `)
                .eq("store_id", storeData.id)
                .neq("status", "cart")
                .order("created_at", { ascending: false });

            if (ordersData) setOrders(ordersData as OrderRow[]);

            // Fetch abandoned carts
            const oneDayAgo = new Date();
            oneDayAgo.setHours(oneDayAgo.getHours() - 24);

            const { data: abandonedData } = await (supabase as any)
                .from("marketplace_orders")
                .select(`
          id, 
          last_cart_activity, 
          status,
          user:profiles(id, nome, avatar_url, whatsapp)
        `)
                .eq("store_id", storeData.id)
                .eq("status", "cart")
                .lt("last_cart_activity", oneDayAgo.toISOString())
                .order("last_cart_activity", { ascending: false });

            if (abandonedData) setAbandonedCarts(abandonedData);

            setLoading(false);
        };

        loadData();
    }, [user]);

    if (loading || isPlanLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </main>
        );
    }

    if (!storeId) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
                <p className="text-sm text-zinc-400">Nenhuma loja vinculada à sua conta.</p>
                <LojaFloatingNavIsland />
            </main>
        );
    }

    const pendingOrders = orders.filter((o) => o.status === "pending");
    const historyOrders = orders.filter((o) => o.status !== "pending");

    return (
        <main className="min-h-screen bg-black pb-28 safe-bottom-floating-nav">
            {/* Premium Header */}
            <section className="px-4 pt-8 pb-6 bg-gradient-to-b from-blue-900/20 to-transparent">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                        <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none">Pedidos</h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mt-1">Gestão de Vendas</p>
                    </div>
                </div>
            </section>

            {/* Pending Orders Alert */}
            {pendingOrders.length > 0 && (
                <section className="px-4 mb-8">
                    <div className="rounded-[24px] border border-yellow-500/30 bg-yellow-500/5 p-4 backdrop-blur-md">
                        <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400">
                            <Clock className="h-4 w-4" />
                            Aguardando Ação ({pendingOrders.length})
                        </h2>
                        <div className="space-y-2">
                            {pendingOrders.map((order) => (
                                <OrderCard key={order.id} order={order} navigate={navigate} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Abandoned Carts Section */}
            <section className="px-4 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-orange-400" />
                        Carrinhos Abandonados
                    </h2>
                    {!hasModule("loja") && (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary flex items-center gap-1">
                            <Lock className="w-3 h-3" /> INTERPRISE
                        </span>
                    )}
                </div>

                {abandonedCarts.length === 0 ? (
                    <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-6 text-center backdrop-blur-md">
                        <p className="text-xs text-zinc-500 font-medium">Nenhum carrinho abandonado recentente.</p>
                    </div>
                ) : (
                    <div className="relative overflow-hidden rounded-[24px]">
                        {!hasModule("loja") && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md bg-black/60">
                                <Lock className="w-8 h-8 text-primary mb-3" />
                                <h3 className="text-sm font-bold text-white mb-1">Recupere Vendas Perdidas</h3>
                                <p className="text-xs text-zinc-400 mb-4">Assine o plano Interprise para ver quem abandonou o carrinho e chamar no WhatsApp.</p>
                                <button
                                    className="w-full rounded-xl bg-primary py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(86,255,2,0.3)]"
                                    onClick={() => navigate("/loja/plano")}
                                >
                                    Fazer Upgrade
                                </button>
                            </div>
                        )}
                        <div className={`space-y-2 ${!hasModule("loja") ? 'opacity-30 select-none pointer-events-none blur-[2px]' : ''}`}>
                            {abandonedCarts.map((cart) => (
                                <AbandonedCartCard
                                    key={cart.id}
                                    cart={cart}
                                    isPro={hasModule("loja")}
                                    navigate={navigate}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Orders History */}
            <section className="px-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Histórico de Pedidos</h2>
                    <div className="flex items-center gap-2">
                        <button className="flex h-8 items-center justify-center rounded-lg bg-white/5 px-3 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors">
                            <Filter className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {historyOrders.length === 0 ? (
                    <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-8 text-center backdrop-blur-md">
                        <p className="text-xs text-zinc-500">
                            Nenhum pedido finalizado ainda.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {historyOrders.map((order) => (
                            <OrderCard key={order.id} order={order} navigate={navigate} />
                        ))}
                    </div>
                )}
            </section>

            <LojaFloatingNavIsland />
        </main>
    );
}

function OrderCard({ order, navigate }: { order: OrderRow; navigate: any }) {
    const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
    const StatusIcon = statusInfo.icon;
    const date = new Date(order.created_at);
    const formatted = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

    return (
        <div
            className="group cursor-pointer overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] active:scale-[0.98]"
            onClick={() => navigate(`/loja/pedido/${order.id}`)}
        >
            <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${statusInfo.color}`}>
                    <StatusIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                        <p className="text-base font-bold text-white">R$ {order.total.toFixed(2)}</p>
                        <div className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-white/5 ${statusInfo.color}`}>
                            {statusInfo.label}
                        </div>
                    </div>
                    <p className="text-[10px] font-medium text-zinc-400 line-clamp-1">
                        {order.user?.nome || "Aluno"} • {order.delivery_city || "Sem cidade"}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-1">
                        {formatted}
                    </p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-white transition-colors" />
            </div>
        </div>
    );
}

function AbandonedCartCard({ cart, isPro, navigate }: any) {
    const date = new Date(cart.last_cart_activity);
    const formatted = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    const userName = cart.user?.nome || "Aluno";
    const userAvatar = cart.user?.avatar_url;
    const userWhatsapp = cart.user?.whatsapp;

    const handleNotify = (e: any) => {
        e.stopPropagation();
        if (!isPro) {
            navigate("/loja/plano");
            return;
        }
        if (!userWhatsapp) return;

        const message = `Olá ${userName}! Notamos que você deixou alguns itens no carrinho em nossa loja. Posso te ajudar a finalizar sua compra?`;
        window.open(`https://wa.me/55${userWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
    };

    return (
        <div className="relative overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.03] p-4">
            <div className="flex items-center gap-4">
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/10">
                    {userAvatar ? (
                        <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/10">
                            <User className="h-5 w-5 text-zinc-400" />
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-white">{userName}</p>
                    <p className="text-[10px] text-zinc-500">Abandono: {formatted}</p>
                </div>
                <button
                    className={`flex h-8 items-center rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider transition-all
            ${isPro
                            ? "bg-primary text-black hover:bg-primary/90"
                            : "bg-white/5 text-zinc-500 cursor-not-allowed"}`}
                    onClick={handleNotify}
                >
                    {isPro ? "Recuperar" : "Bloqueado"}
                </button>
            </div>
        </div>
    );
}
