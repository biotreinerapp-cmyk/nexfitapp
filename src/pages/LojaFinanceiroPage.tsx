import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, CreditCard, Sparkles } from "lucide-react";

const LojaFinanceiroPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Financeiro - Nexfit Lojista";
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 pb-8 pt-6 safe-bottom-floating-nav">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Financeiro</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Resumo financeiro</h1>
      </header>

      <div className="grid gap-3">
        <Card className="border border-border/20 bg-card/80">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendas do mês</p>
              <p className="text-lg font-bold text-foreground">R$ 0,00</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/20 bg-card/80">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pedidos no mês</p>
              <p className="text-lg font-bold text-foreground">0</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/20 bg-card/80">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor pendente</p>
              <p className="text-lg font-bold text-foreground">R$ 0,00</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Destaque CTA */}
      <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Destaque sua loja</p>
            <p className="text-[11px] text-muted-foreground">Apareça no banner do app e alcance mais clientes</p>
          </div>
        </div>
        <Button
          className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
          onClick={() => navigate("/loja/destaque")}
        >
          Ver pacotes de divulgação
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Dados financeiros detalhados serão exibidos aqui conforme os pedidos forem realizados.
      </p>

      <LojaFloatingNavIsland />
    </main>
  );
};

export default LojaFinanceiroPage;
