import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";

interface Store {
  id: string;
  nome: string;
  descricao: string | null;
  cover_image_url: string | null;
  banner_image_url: string | null;
  desconto_percent: number;
}

const categoryTitles: Record<string, string> = {
  suplementos: "Suplementos",
  roupas_fitness: "Roupas Fitness",
  artigos_esportivos: "Artigos Esportivos",
  comidas_fitness: "Comidas Fitness",
};

export default function MarketplaceStoresPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${categoryTitles[category || ""]} - Marketplace Nexfit`;
  }, [category]);

  useEffect(() => {
    const fetchStores = async () => {
      if (!category) return;

      const { data, error } = await supabase
        .from("marketplace_stores")
        .select("*")
        .eq("store_type", category)
        .eq("status", "aprovado")
        .order("nome");

      if (!error && data) {
        setStores(data);
      }
      setLoading(false);
    };

    fetchStores();
  }, [category]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="safe-bottom-floating-nav min-h-screen bg-background text-foreground">
      {/* Premium Sticky Header */}
      <div className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <BackIconButton to="/marketplace" />
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight">{categoryTitles[category || ""]}</h1>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Parceiros Certificados Nexfit
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 px-3 py-1 text-[10px] font-bold tracking-wider">
            {stores.length} {stores.length === 1 ? 'LOJA DISPONÍVEL' : 'LOJAS DISPONÍVEIS'}
          </Badge>
          <p className="text-[10px] text-muted-foreground">ORDENADO POR NOME</p>
        </div>
        {stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="mb-4 rounded-full bg-muted/50 p-6">
              <span className="text-4xl">🏪</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma loja disponível nesta categoria.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
      <FloatingNavIsland />
    </div>
  );
}

function StoreCard({ store, navigate }: { store: Store; navigate: any }) {
  const bannerUrl = store.banner_image_url || store.cover_image_url;

  return (
    <div
      onClick={() => navigate(`/marketplace/loja/${store.id}`)}
      className="group relative cursor-pointer overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10"
    >
      <div className="relative aspect-[16/8] overflow-hidden">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={store.nome}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/50 text-xl font-bold opacity-20">
            {store.nome}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      <div className="relative -mt-10 p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{store.nome}</h3>
            {store.descricao && (
              <p className="line-clamp-1 text-[11px] font-medium text-muted-foreground opacity-80">{store.descricao}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-primary text-black hover:bg-primary font-bold shadow-lg shadow-primary/20 text-[10px] px-2 py-0.5">
              -{store.desconto_percent}%
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
          <div className="flex -space-x-2 overflow-hidden opacity-50">
            <div className="inline-block h-5 w-5 rounded-full ring-2 ring-background bg-primary/20" />
            <div className="inline-block h-5 w-5 rounded-full ring-2 ring-background bg-primary/40" />
            <div className="inline-block h-5 w-5 rounded-full ring-2 ring-background bg-primary/60" />
          </div>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Ver Produtos <span className="text-lg">→</span>
          </span>
        </div>
      </div>
    </div>
  );
}
