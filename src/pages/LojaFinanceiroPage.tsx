import { useEffect } from "react";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, CreditCard } from "lucide-react";

const LojaFinanceiroPage = () => {
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

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Dados financeiros detalhados serão exibidos aqui conforme os pedidos forem realizados.
      </p>

      <LojaFloatingNavIsland />
    </main>
  );
};

export default LojaFinanceiroPage;
