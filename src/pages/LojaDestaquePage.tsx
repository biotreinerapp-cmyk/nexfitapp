import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Star, Zap, BarChart3, MousePointerClick, Tag, CalendarDays } from "lucide-react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  price_cents: number;
  features: string[];
  badge_label: string | null;
  sort_order: number;
  checkout_url: string | null;
}

interface StoreData {
  id: string;
  is_highlighted: boolean;
  highlight_expires_at: string | null;
  highlight_clicks: number;
  highlight_sales: number;
}

const ICONS = [Zap, Star, Sparkles];

const LojaDestaquePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<StoreData | null>(null);

  useEffect(() => {
    document.title = "Destaque sua Loja - Nexfit";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      // Load offers
      const { data } = await supabase
        .from("highlight_offers")
        .select("id, title, description, duration_days, price_cents, features, badge_label, sort_order, checkout_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      setOffers((data as unknown as Offer[]) ?? []);

      // Load store data
      const { data: sData } = await (supabase as any)
        .from("marketplace_stores")
        .select("id, is_highlighted, highlight_expires_at, highlight_clicks, highlight_sales")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (sData) {
        setStoreData(sData as StoreData);
      }

      setLoading(false);
    };
    void load();
  }, [user]);

  const handleSelectOffer = (offer: Offer) => {
    if (!offer.checkout_url) {
      toast({
        title: "Oferta indisponível",
        description: "O link de checkout ainda não foi configurado para este pacote.",
        variant: "destructive"
      });
      return;
    }
    window.open(offer.checkout_url, "_blank", "noopener,noreferrer");
  };

  const formatPrice = (cents: number) => {
    const val = (cents / 100).toFixed(2).replace(".", ",");
    return `R$ ${val}`;
  };

  const isAdsActive = () => {
    if (!storeData) return false;
    if (!storeData.is_highlighted) return false;
    if (!storeData.highlight_expires_at) return false;

    // Check if expires_at is in the future
    return isAfter(new Date(storeData.highlight_expires_at), new Date());
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  const active = isAdsActive();

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-28 pt-8 safe-bottom-floating-nav">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

      <div className="relative z-10">
        <header className="mb-6 flex items-center gap-3">
          <BackIconButton onClick={() => navigate("/loja/financeiro")} />
          <div className="flex-1 text-center pr-10">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Marketing</p>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Nexfit ADS</h1>
          </div>
        </header>

        {active && storeData ? (
          /* =========================================
             DASHBOARD VIEW (ACTIVE ADS)
             ========================================= */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Status Card */}
            <div className="relative overflow-hidden rounded-[24px] border border-primary/20 bg-primary/5 p-6 backdrop-blur-xl text-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 border border-primary/30 shadow-[0_0_30px_rgba(86,255,2,0.2)]">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Destaque Ativo</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Sua loja está aparecendo no topo para os alunos da plataforma.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 border border-white/5">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                  Válido até: <span className="text-white">{format(new Date(storeData.highlight_expires_at!), "dd 'de' MMM", { locale: ptBR })}</span>
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <MousePointerClick className="w-16 h-16 text-white" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointerClick className="h-4 w-4 text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cliques</span>
                  </div>
                  <p className="text-4xl font-black text-white">{storeData.highlight_clicks}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Tag className="w-16 h-16 text-white" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-green-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Vendas</span>
                  </div>
                  <p className="text-4xl font-black text-white">{storeData.highlight_sales}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-6 text-center backdrop-blur-xl">
              <p className="text-xs text-zinc-500 leading-relaxed">
                As métricas de cliques representam os alunos que abriram sua loja a partir do banner de destaque.
                Vendas contabilizam os pedidos concluídos por esses alunos.
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full rounded-xl border-white/10 bg-transparent text-xs text-zinc-400 hover:bg-white/5 hover:text-white uppercase tracking-widest"
                onClick={() => {
                  // Could implement plan extension later
                  toast({ title: "Em breve", description: "Renovação antecipada estará disponível em breve!" });
                }}
              >
                Renovar Destaque
              </Button>
            </div>
          </div>
        ) : (
          /* =========================================
             OFFERS VIEW (INACTIVE ADS)
             ========================================= */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero text */}
            <div className="mb-8 text-center relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
                Apareça no banner principal e alcance <span className="text-white font-bold">milhares de alunos ativos</span> todos os dias.
              </p>
            </div>

            {/* Offers */}
            <div className="space-y-4">
              {offers.length === 0 ? (
                <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
                  <p className="text-sm text-zinc-400">Nenhum pacote disponível no momento.</p>
                  <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wide">Em breve teremos novidades!</p>
                </div>
              ) : (
                offers.map((offer, idx) => {
                  const Icon = ICONS[idx % ICONS.length];
                  const isPopular = offer.badge_label?.toLowerCase().includes("popular");
                  return (
                    <div
                      key={offer.id}
                      className={`relative overflow-hidden rounded-[24px] border border-white/5 p-6 transition-all ${isPopular
                        ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-[0_0_30px_rgba(0,0,0,0.5)] border-primary/20"
                        : "bg-white/[0.03]"
                        } backdrop-blur-xl`}
                    >
                      {offer.badge_label && (
                        <div className="absolute right-0 top-0">
                          <div className={`px-3 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${isPopular ? "bg-primary text-black" : "bg-white/10 text-white"
                            }`}>
                            {offer.badge_label}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isPopular ? "bg-primary/20 text-primary" : "bg-white/5 text-zinc-400"}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">{offer.title}</h3>
                          {offer.description && <p className="mt-1 text-xs text-zinc-400">{offer.description}</p>}
                        </div>
                      </div>

                      <div className="mt-5 flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white drop-shadow-md">{formatPrice(offer.price_cents)}</span>
                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">/ {offer.duration_days} dias</span>
                      </div>

                      {offer.features.length > 0 && (
                        <ul className="mt-4 space-y-2">
                          {offer.features.map((f, fi) => (
                            <li key={fi} className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                              <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <Check className="h-2.5 w-2.5 text-primary" />
                              </div>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Button
                        className={`mt-6 w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all ${isPopular
                          ? "bg-primary text-black hover:bg-primary/90 shadow-primary/20 hover:shadow-primary/40"
                          : "bg-white/10 text-white hover:bg-white/20 hover:text-white"
                          }`}
                        onClick={() => handleSelectOffer(offer)}
                      >
                        Contratar destaque
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-zinc-600">
              Ativação via redirecionamento de checkout
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default LojaDestaquePage;
