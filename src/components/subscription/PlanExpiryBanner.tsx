import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  daysLeft: number;
  onRenew: () => void;
};

export const PlanExpiryBanner = ({ daysLeft, onRenew }: Props) => {
  return (
    <section
      aria-label="Aviso de expiração do plano"
      className="rounded-xl border border-warning/40 bg-warning/10 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-warning/40 bg-background/60 p-2 text-warning">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Atenção</p>
            <p className="text-sm text-foreground/90">
              Seu plano atual expira em {daysLeft} dia{daysLeft === 1 ? "" : "s"}. Renove para manter o acesso completo.
            </p>
          </div>
        </div>

        <Button className="sm:shrink-0" onClick={onRenew}>
          Renovar Agora
        </Button>
      </div>
    </section>
  );
};
