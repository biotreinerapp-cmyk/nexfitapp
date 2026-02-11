import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { ShoppingCart, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ProductImageCarousel } from "@/components/marketplace/ProductImageCarousel";

interface Store {
  id: string;
  nome: string;
  descricao: string | null;
  cover_image_url: string | null;
  profile_image_url: string | null;
  banner_image_url: string | null;
  desconto_percent: number;
  store_type: string;
}

interface Product {
  id: string;
  nome: string;
  descricao: string | null;
  image_url: string | null;
  image_urls: string[];
  preco_original: number;
  preco_desconto: number;
}

export default function MarketplaceStorePage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      if (!storeId) return;

      const { data: storeData } = await supabase
        .from("marketplace_stores")
        .select("id, nome, descricao, cover_image_url, profile_image_url, banner_image_url, desconto_percent, store_type")
        .eq("id", storeId)
        .eq("status", "aprovado")
        .maybeSingle();

      if (storeData) {
        setStore(storeData as Store);
        document.title = `${storeData.nome} - Marketplace Nexfit`;

        const { data: productsData } = await (supabase as any)
          .from("marketplace_products")
          .select("id, nome, descricao, image_url, image_urls, preco_original, preco_desconto")
          .eq("store_id", storeId)
          .eq("ativo", true)
          .order("nome");

        if (productsData) setProducts(productsData as Product[]);
      }

      setLoading(false);
    };

    fetchStoreAndProducts();
  }, [storeId]);

  // Load cart count
  useEffect(() => {
    if (!user || !storeId) return;

    const loadCart = async () => {
      const { data: order } = await (supabase as any)
        .from("marketplace_orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("store_id", storeId)
        .eq("status", "cart")
        .maybeSingle();

      if (order) {
        const { data: items } = await (supabase as any)
          .from("marketplace_order_items")
          .select("quantity")
          .eq("order_id", order.id);

        if (items) {
          const total = (items as any[]).reduce((sum: number, i: any) => sum + (i.quantity ?? 0), 0);
          setCartCount(total);
        }
      }
    };

    loadCart();
  }, [user, storeId]);

  const handleAddToCart = async (product: Product) => {
    if (!user || !storeId) {
      toast({ title: "Faça login para adicionar ao carrinho", variant: "destructive" });
      return;
    }

    setAddingToCart(product.id);

    try {
      // Get or create cart order
      let { data: order } = await (supabase as any)
        .from("marketplace_orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("store_id", storeId)
        .eq("status", "cart")
        .maybeSingle();

      if (!order) {
        const { data: newOrder, error: orderErr } = await (supabase as any)
          .from("marketplace_orders")
          .insert({ user_id: user.id, store_id: storeId, status: "cart" })
          .select("id")
          .maybeSingle();

        if (orderErr) throw orderErr;
        order = newOrder;
      }

      if (!order) throw new Error("Erro ao criar pedido");

      // Check if product already in cart
      const { data: existingItem } = await (supabase as any)
        .from("marketplace_order_items")
        .select("id, quantity")
        .eq("order_id", order.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (existingItem) {
        await (supabase as any)
          .from("marketplace_order_items")
          .update({
            quantity: existingItem.quantity + 1,
            subtotal: (existingItem.quantity + 1) * product.preco_desconto,
          })
          .eq("id", existingItem.id);
      } else {
        await (supabase as any)
          .from("marketplace_order_items")
          .insert({
            order_id: order.id,
            product_id: product.id,
            product_name: product.nome,
            product_image: product.image_url,
            quantity: 1,
            unit_price: product.preco_desconto,
            subtotal: product.preco_desconto,
          });
      }

      setCartCount((prev) => prev + 1);
      toast({ title: "Adicionado ao carrinho", description: product.nome });
    } catch (err: any) {
      toast({ title: "Erro ao adicionar", description: err?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loja não encontrada.</p>
      </div>
    );
  }

  const bannerUrl = store.banner_image_url || store.cover_image_url;
  const profileUrl = store.profile_image_url;

  return (
    <div className="safe-bottom-floating-nav min-h-screen bg-background">
      {/* Banner */}
      <div className="relative w-full">
        <AspectRatio ratio={16 / 6} className="overflow-hidden bg-muted">
          {bannerUrl ? (
            <img src={bannerUrl} alt={`Banner ${store.nome}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <span className="text-lg font-bold text-muted-foreground">{store.nome}</span>
            </div>
          )}
        </AspectRatio>

        {/* Back button over banner */}
        <div className="absolute left-3 top-3">
          <BackIconButton to={`/marketplace/categoria/${store.store_type}`} />
        </div>

        {/* Cart button */}
        <button
          type="button"
          onClick={() => navigate(`/marketplace/loja/${storeId}/carrinho`)}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg"
        >
          <ShoppingCart className="h-4 w-4" />
          {cartCount > 0 && cartCount}
        </button>
      </div>

      {/* Store info with profile image */}
      <div className="container mx-auto px-4">
        <div className="relative -mt-8 flex items-end gap-4 pb-4">
          {/* Profile image */}
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted shadow-lg">
            {profileUrl ? (
              <img src={profileUrl} alt={store.nome} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">
                {store.nome.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 pt-8">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">{store.nome}</h1>
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                até {store.desconto_percent}% OFF
              </Badge>
            </div>
            {store.descricao && (
              <p className="mt-1 text-sm text-muted-foreground">{store.descricao}</p>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 pb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Produtos</h2>

        {products.length === 0 ? (
          <Card className="border-border/50 bg-card/30">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum produto disponível nesta loja no momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card
                key={product.id}
                className="group overflow-hidden border-border/50 bg-card/30 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  <ProductImageCarousel
                    images={product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : [])}
                    alt={product.nome}
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="mb-1 font-semibold text-foreground">{product.nome}</h3>
                  {product.descricao && (
                    <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{product.descricao}</p>
                  )}
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground line-through">
                        R$ {product.preco_original.toFixed(2)}
                      </span>
                      <span className="text-lg font-bold text-primary">
                        R$ {product.preco_desconto.toFixed(2)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => handleAddToCart(product)}
                      loading={addingToCart === product.id}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Carrinho
                    </Button>
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
