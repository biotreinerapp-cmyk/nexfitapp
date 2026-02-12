import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Star, Zap } from "lucide-react";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  price_cents: number;
  features: string[];
  badge_label: string | null;
  sort_order: number;
}

const ICONS = [Zap, Star, Sparkles];

const LojaDestaquePage = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Destaque sua Loja - Nexfit";
    const load = async () => {
      const { data } = await supabase
        .from("highlight_offers")
        .select("id, title, description, duration_days, price_cents, features, badge_label, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setOffers((data as unknown as Offer[]) ?? []);
      setLoading(false);
    };
    void load();
  }, []);

  const formatPrice = (cents: number) => {
    const val = (cents / 100).toFixed(2).replace(".", ",");
    return `R$ ${val}`;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Hero gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative z-10 px-4 pb-12 pt-6">
        <BackIconButton onClick={() => navigate("/loja/financeiro")} />

        {/* Hero text */}
        <div className="mt-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 shadow-lg shadow-primary/20">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Destaque sua loja
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Apareça no banner principal do app e alcance milhares de alunos ativos todos os dias.
          </p>
        </div>

        {/* Offers */}
        <div className="mt-8 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-muted/30" />
            ))
          ) : offers.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card/60 p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum pacote disponível no momento.</p>
              <p className="mt-1 text-xs text-muted-foreground">Em breve teremos novidades!</p>
            </div>
          ) : (
            offers.map((offer, idx) => {
              const Icon = ICONS[idx % ICONS.length];
              const isPopular = offer.badge_label?.toLowerCase().includes("popular");
              return (
                <div
                  key={offer.id}
                  className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                    isPopular
                      ? "border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg shadow-primary/10"
                      : "border-border/40 bg-card/80"
                  }`}
                >
                  {/* Badge */}
                  {offer.badge_label && (
                    <Badge
                      className={`absolute right-4 top-4 text-[10px] font-semibold ${
                        isPopular
                          ? "border-primary/30 bg-primary/20 text-primary"
                          : "border-border/50 bg-muted/60 text-muted-foreground"
                      }`}
                      variant="outline"
                    >
                      {offer.badge_label}
                    </Badge>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isPopular ? "bg-primary/20" : "bg-muted/40"
                    }`}>
                      <Icon className={`h-5 w-5 ${isPopular ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-foreground">{offer.title}</h3>
                      {offer.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{offer.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">{formatPrice(offer.price_cents)}</span>
                    <span className="text-xs text-muted-foreground">/ {offer.duration_days} dias</span>
                  </div>

                  {/* Features */}
                  {offer.features.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {offer.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* CTA */}
                  <Button
                    className={`mt-4 w-full ${
                      isPopular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted/60 text-foreground hover:bg-muted/80"
                    }`}
                    size="sm"
                  >
                    Solicitar destaque
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom note */}
        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Após a solicitação, nossa equipe entrará em contato para confirmar o período e o pagamento.
        </p>
      </div>
    </main>
  );
};

export default LojaDestaquePage;
