import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLAN_LABEL } from "@/lib/subscriptionPlans";

export const MarketplacePaywall = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acesso Premium</CardTitle>
          <CardDescription className="text-base">
            O Marketplace está disponível apenas para membros dos planos {PLAN_LABEL.ADVANCE} e {PLAN_LABEL.ELITE}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <h4 className="mb-2 font-semibold text-foreground">Benefícios exclusivos:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Descontos de até 20% em suplementos</li>
              <li>✓ Acesso a roupas fitness e artigos esportivos</li>
              <li>✓ Produtos selecionados de parceiros aprovados</li>
            </ul>
          </div>
          <Button onClick={() => navigate("/aluno/dashboard")} className="w-full" size="lg">
            Ver Planos Disponíveis
          </Button>
          <Button onClick={() => navigate("/aluno/dashboard")} variant="ghost" className="w-full">
            Voltar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
