import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { CheckCircle2, XCircle, Clock, MapPin, ShoppingBag, User, Package, Calendar, ChevronRight } from "lucide-react";

interface OrderDetail {
  id: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  delivery_address: string | null;
  delivery_city: string | null;
  created_at: string;
  pix_payload: string | null;
  user_id: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: Clock },
  accepted: { label: "Aceito", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircle },
};

export default function LojaOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [buyerName, setBuyerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    document.title = "Detalhes do Pedido - Nexfit Lojista";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user || !orderId) return;

      const { data: orderData, error } = await (supabase as any)
        .from("marketplace_orders")
        .select("id, status, subtotal, discount_amount, shipping_cost, total, delivery_address, delivery_city, created_at, pix_payload, user_id")
        .eq("id", orderId)
        .maybeSingle();

      if (error || !orderData) {
        toast({ title: "Pedido não encontrado", variant: "destructive" });
        navigate("/loja/dashboard", { replace: true });
        return;
      }

      setOrder(orderData as OrderDetail);

      // Fetch items
      const { data: itemsData } = await (supabase as any)
        .from("marketplace_order_items")
        .select("id, product_name, product_image, quantity, unit_price, subtotal")
        .eq("order_id", orderId);

      setItems((itemsData ?? []) as OrderItem[]);

      // Fetch buyer name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, nome")
        .eq("id", orderData.user_id)
        .maybeSingle();

      if (profile) {
        setBuyerName((profile as any).display_name || (profile as any).nome || "Aluno");
      }

      setLoading(false);
    };
    void load();
  }, [user, orderId, toast, navigate]);

  const handleUpdateStatus = async (newStatus: "accepted" | "rejected") => {
    if (!order) return;
    setUpdating(true);

    const { error } = await (supabase as any)
      .from("marketplace_orders")
      .update({ status: newStatus })
      .eq("id", order.id);

    if (error) {
      toast({ title: "Erro ao atualizar pedido", description: error.message, variant: "destructive" });
    } else {
      setOrder({ ...order, status: newStatus });
      toast({
        title: newStatus === "accepted" ? "Pedido aceito!" : "Pedido rejeitado",
        description: newStatus === "accepted" ? "O aluno será notificado." : "O pedido foi marcado como rejeitado.",
      });
    }

    setUpdating(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  if (!order) return null;

  const statusInfo = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
  const StatusIcon = statusInfo.icon;
  const date = new Date(order.created_at);
  const formattedDate = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 safe-bottom-floating-nav relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

      <header className="mb-6 flex items-center gap-3 relative z-10">
        <BackIconButton to="/loja/dashboard" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Detalhes do Pedido</p>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white uppercase tracking-tight">#{order.id.slice(0, 8)}</h1>
            <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${statusInfo.color}`}>
              <StatusIcon className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase tracking-wide">{statusInfo.label}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4 relative z-10">
        {/* Buyer & Date */}
        <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Cliente</p>
              <p className="text-base font-bold text-white mb-0.5">{buyerName}</p>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Calendar className="h-3 w-3" />
                <p className="text-xs">{formattedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <ShoppingBag className="h-3.5 w-3.5" />
            Itens do pedido
          </div>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 border border-white/10">
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-zinc-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.product_name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {item.quantity}x R$ {item.unit_price.toFixed(2)}
                  </p>
                </div>
                <p className="text-sm font-black text-white">R$ {item.subtotal.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery */}
        {(order.delivery_address || order.delivery_city) && (
          <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <MapPin className="h-3.5 w-3.5" />
              Endereço de entrega
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-white leading-relaxed">{order.delivery_address}</p>
                <p className="text-xs text-zinc-400 mt-1">{order.delivery_city}</p>
              </div>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="font-medium text-white">R$ {order.subtotal.toFixed(2)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-primary">
                <span>Desconto</span>
                <span className="font-bold">- R$ {order.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-400">
              <span>Frete</span>
              <span className="font-medium text-white">{order.shipping_cost > 0 ? `R$ ${order.shipping_cost.toFixed(2)}` : "A combinar"}</span>
            </div>
            <div className="my-2 h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <span className="text-base font-black uppercase tracking-tight text-white">Total</span>
              <span className="text-xl font-black text-primary">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {order.status === "pending" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              className="h-14 rounded-2xl border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-bold uppercase tracking-wide"
              onClick={() => handleUpdateStatus("rejected")}
              disabled={updating}
            >
              <XCircle className="h-5 w-5 mr-2" />
              Rejeitar
            </Button>
            <Button
              className="h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-wide hover:bg-primary/90 shadow-[0_0_20px_rgba(86,255,2,0.2)]"
              onClick={() => handleUpdateStatus("accepted")}
              disabled={updating}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Aceitar
            </Button>
          </div>
        )}
      </div>

      <LojaFloatingNavIsland />
    </main>
  );
}
