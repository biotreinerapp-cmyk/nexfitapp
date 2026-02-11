import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { BackIconButton } from "@/components/navigation/BackIconButton";

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
  roupas: "Roupas Fitness",
  artigos: "Artigos Esportivos",
  artigos_esportivos: "Artigos Esportivos",
  roupas_fitness: "Roupas Fitness",
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
    <div className="safe-bottom-floating-nav min-h-screen bg-background">
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <BackIconButton to="/marketplace" />
            <div>
              <h1 className="page-title-gradient text-2xl font-bold">{categoryTitles[category || ""]}</h1>
               <p className="text-sm text-muted-foreground">Parceiros selecionados Nexfit</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {stores.length === 0 ? (
          <Card className="border-border/50 bg-card/30">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma loja disponível nesta categoria no momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {stores.map((store) => (
              <Card
                key={store.id}
                onClick={() => navigate(`/marketplace/loja/${store.id}`)}
                className="group cursor-pointer border-border/50 bg-card/30 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
              >
                <CardContent className="p-4">
                  <AspectRatio ratio={16 / 9} className="mb-3 overflow-hidden rounded-lg bg-muted">
                  {(store.banner_image_url || store.cover_image_url) ? (
                      <img
                        src={store.banner_image_url || store.cover_image_url!}
                        alt={store.nome}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        {store.nome}
                      </div>
                    )}
                  </AspectRatio>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="mb-1 font-semibold text-foreground">{store.nome}</h3>
                      {store.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{store.descricao}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">
                      até {store.desconto_percent}% OFF
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
