import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { ShoppingCart, Package, DollarSign, TrendingUp, LogOut } from "lucide-react";

interface StoreInfo {
  id: string;
  nome: string;
  profile_image_url: string | null;
}

const LojaDashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    document.title = "Painel do Lojista - Nexfit";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const { data: storeData, error } = await supabase
        .from("marketplace_stores")
        .select("id, nome, profile_image_url")
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

      // Count orders (from store_orders linked via stores table)
      // For now just set 0 since marketplace orders might not be linked yet
      setOrderCount(0);

      setLoading(false);
    };
    void load();
  }, [user, toast]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
        <LojaFloatingNavIsland />
      </main>
    );
  }

  if (!store) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma loja vinculada à sua conta. Contate o Admin Master.
        </p>
        <LojaFloatingNavIsland />
      </main>
    );
  }

  const stats = [
    { icon: ShoppingCart, label: "Pedidos hoje", value: "0", color: "text-primary" },
    { icon: DollarSign, label: "Vendas do mês", value: "R$ 0,00", color: "text-primary" },
    { icon: Package, label: "Produtos ativos", value: String(productCount), color: "text-primary" },
    { icon: TrendingUp, label: "Ticket médio", value: "R$ 0,00", color: "text-primary" },
  ];

  return (
    <main className="min-h-screen bg-background px-4 pb-8 pt-6 safe-bottom-floating-nav">
      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
        {store.profile_image_url ? (
          <img
            src={store.profile_image_url}
            alt={store.nome}
            className="h-12 w-12 rounded-full border border-border/20 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Painel do Lojista</p>
          <h1 className="text-xl font-semibold text-foreground">{store.nome}</h1>
        </div>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/auth", { replace: true });
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-border/20 bg-card/80">
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders placeholder */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Pedidos recentes</h2>
        <Card className="border border-border/20 bg-card/80">
          <CardContent className="py-8 text-center">
            <p className="text-xs text-muted-foreground">
              Nenhum pedido recente. Os pedidos dos alunos aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      </section>

      <LojaFloatingNavIsland />
    </main>
  );
};

export default LojaDashboardPage;
