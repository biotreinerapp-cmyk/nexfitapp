import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewsNotificationsAdminPanel() {
  return (
    <Card className="border border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Notificações</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie avisos em formato de notificação (push/in-app) para os alunos.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          Este painel será conectado à estrutura de notificações na próxima etapa.
        </p>
        <p className="text-xs text-muted-foreground">
          Dica: podemos suportar segmentação por plano (Gratuito / Advance / Elite) e agendamento.
        </p>
      </CardContent>
    </Card>
  );
}
