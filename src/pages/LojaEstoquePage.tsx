import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Warehouse, AlertTriangle, Plus, Minus, Crown, Search, Package, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProductStock {
  id: string;
  nome: string;
  stock: number;
  min_stock_alert: number;
  image_url: string | null;
}

const LojaEstoquePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(true); // Default to true to avoid flash
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Estoque - Nexfit Lojista";
  }, []);

  const loadStock = useCallback(async () => {
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

      if (!isStorePro) {
        setLoading(false);
        return;
      }

      const { data } = await (supabase as any)
        .from("marketplace_products")
        .select("id, nome, stock, min_stock_alert, image_url")
        .eq("store_id", store.id)
        .order("nome");

      if (data) setProducts(data as ProductStock[]);
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadStock(); }, [loadStock]);

  const updateQuantity = async (id: string, newStock: number) => {
    if (newStock < 0) return;
    setUpdating(id);
    try {
      const { error } = await (supabase as any)
        .from("marketplace_products")
        .update({ stock: newStock })
        .eq("id", id);

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
      toast({ title: "Estoque atualizado" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const filteredProducts = products.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.stock <= p.min_stock_alert).length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  if (!isPro) {
    return (
      <main className="min-h-screen bg-black px-4 pb-28 pt-6 safe-bottom-floating-nav">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Estoque</p>
          <h1 className="mt-1 text-2xl font-black text-white uppercase tracking-tight">Gestão de Estoque</h1>
        </header>

        <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/20 blur-xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10 backdrop-blur-md">
              <Lock className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="space-y-3 max-w-xs">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              Recurso PRO
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              O controle de estoque avançado com alertas de reposição é exclusivo para assinantes PRO.
            </p>
          </div>

          <Button
            onClick={() => navigate("/loja/plano")}
            className="mt-2 h-12 w-full max-w-xs rounded-xl bg-primary text-base font-bold text-black hover:bg-primary/90 uppercase tracking-widest shadow-[0_0_20px_rgba(86,255,2,0.3)] transition-all hover:shadow-[0_0_30px_rgba(86,255,2,0.5)]"
          >
            Quero ser PRO
          </Button>
        </div>

        <LojaFloatingNavIsland />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 safe-bottom-floating-nav">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Estoque</p>
        <h1 className="mt-1 text-2xl font-black text-white uppercase tracking-tight">Gestão de Estoque</h1>
      </header>

      <div className="grid gap-4 mb-6">
        <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${lowStockCount > 0 ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">Produtos em alerta</p>
              <p className="text-2xl font-black text-white">{lowStockCount}</p>
            </div>
          </div>
          {lowStockCount > 0 && (
            <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Atenção: Estoque baixo detectado</p>
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Buscar produto..."
            className="h-12 rounded-xl border-white/5 bg-white/5 pl-11 text-white placeholder:text-zinc-600 focus:border-primary/50 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredProducts.map((p) => (
          <div key={p.id} className="relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06]">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white/5 border border-white/5">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.nome} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-6 w-6 text-zinc-700" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate pr-2">{p.nome}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold ${p.stock <= p.min_stock_alert ? 'text-red-500' : 'text-zinc-400'}`}>
                    Qtd: {p.stock}
                  </span>
                  {p.stock <= p.min_stock_alert && (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-500">
                      Baixo
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/5">
                <button
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${updating === p.id ? 'opacity-50' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                  onClick={() => updateQuantity(p.id, p.stock - 1)}
                  disabled={updating === p.id}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="w-px h-4 bg-white/10" />
                <button
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${updating === p.id ? 'opacity-50' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                  onClick={() => updateQuantity(p.id, p.stock + 1)}
                  disabled={updating === p.id}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-8 text-center">
            <Warehouse className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-500">
              {searchTerm ? "Nenhum produto encontrado." : "Estoque vazio."}
            </p>
          </div>
        )}
      </div>

      <LojaFloatingNavIsland />
    </main>
  );
};

export default LojaEstoquePage;
