import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Dumbbell, LineChart, Pill, ShoppingBag, Stethoscope, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  /** Em milissegundos. Default: 9000 (9s) */
  durationMs?: number;
  trainingLevelLabel?: string;
  trainingDaysLabel?: string;
  focusGroupLabel?: string;
  onProceed?: () => void;
};

const quote = {
  text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  author: "Robert Collier",
} as const;

export default function OnboardingLoadingScreen({
  durationMs = 9000,
  trainingLevelLabel,
  trainingDaysLabel,
  focusGroupLabel,
  onProceed,
}: Props) {
  const [phase, setPhase] = useState<"loading" | "success">("loading");

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("success"), Math.max(0, durationMs));
    return () => window.clearTimeout(t);
  }, [durationMs]);

  const items = useMemo(
    () =>
      [
        {
          label: "Marketplace",
          Icon: ShoppingBag,
          pos: "left-1/2 top-0 -translate-x-1/2",
          delay: "0ms",
        },
        {
          label: "Nutricionista virtual",
          Icon: UtensilsCrossed,
          pos: "right-0 top-1/2 -translate-y-1/2",
          delay: "120ms",
        },
        {
          label: "Telemedicina",
          Icon: Stethoscope,
          pos: "left-1/2 bottom-0 -translate-x-1/2",
          delay: "240ms",
        },
        {
          label: "Suplementos",
          Icon: Pill,
          pos: "left-0 top-1/2 -translate-y-1/2",
          delay: "360ms",
        },
        {
          label: "Treinos",
          Icon: Dumbbell,
          pos: "left-2 top-2",
          delay: "480ms",
        },
        {
          label: "Progresso",
          Icon: LineChart,
          pos: "right-2 bottom-2",
          delay: "600ms",
        },
      ] as const,
    [],
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border border-accent/40 bg-card/80 backdrop-blur">
        <CardContent className="space-y-6 py-8 text-center">
          {phase === "loading" ? (
            <div className="mx-auto flex w-full max-w-[280px] flex-col items-center gap-5">
              <div className="relative h-44 w-44">
                {items.map(({ label, Icon, pos, delay }) => (
                  <div
                    key={label}
                    className={`absolute ${pos} grid place-items-center rounded-full border border-primary/30 bg-background/40 p-2 text-primary shadow-sm animate-fade-in`}
                    style={{ animationDelay: delay }}
                    aria-label={label}
                    title={label}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                ))}

                <div className="absolute inset-0 grid place-items-center">
                  <div className="relative h-20 w-20">
                    <div className="absolute inset-0 rounded-full border border-primary/40" />
                    <div className="absolute inset-2 rounded-full border border-accent/40 opacity-60" />
                    <div className="absolute inset-0 animate-[spin_1s_linear_infinite] rounded-full border-t-2 border-primary" />
                    <div className="absolute inset-3 flex items-center justify-center rounded-full bg-background/80">
                      <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-primary">IA</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-base font-semibold text-foreground">Gerando seu plano</h1>
                <p className="text-xs text-muted-foreground">Aguarde, estamos montando sua rotina ideal de treinos...</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[320px] space-y-4 text-left">
              <div className="space-y-2 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-primary/40 bg-background/60 text-primary">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <h1 className="text-base font-semibold text-foreground">Ambiente criado com sucesso!</h1>
                <p className="text-xs text-muted-foreground">Tudo pronto para começar sua nova jornada com o Nexfit.</p>
              </div>

              <blockquote className="rounded-xl border border-border bg-background/50 p-4 text-xs text-muted-foreground">
                <p className="text-foreground/90">“{quote.text}”</p>
                <footer className="mt-2 text-[11px] text-muted-foreground">— {quote.author}</footer>
              </blockquote>

              <div className="space-y-2 rounded-xl border border-border bg-background/50 p-4">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Nível de treino</p>
                    <p className="text-xs text-muted-foreground">{trainingLevelLabel ?? "Definido"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Dias selecionados</p>
                    <p className="text-xs text-muted-foreground">{trainingDaysLabel ?? "Definido"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Grupo de foco</p>
                    <p className="text-xs text-muted-foreground">{focusGroupLabel ?? "Definido"}</p>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={onProceed}>
                Acessar meu painel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
