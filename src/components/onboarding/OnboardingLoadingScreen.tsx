import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Brain, Sparkles, Zap, ShieldCheck, Database, Cpu, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

const AI_STATUS_MESSAGES = [
  { text: "Sincronizando Biometria...", icon: Activity },
  { text: "Analisando Taxa Metabólica...", icon: Database },
  { text: "Configurando Protocolos de Treino...", icon: Cpu },
  { text: "Otimizando Macronutrientes...", icon: Brain },
  { text: "Calibrando Intensidade [Elite]...", icon: Zap },
  { text: "Garantindo Segurança de Dados...", icon: ShieldCheck },
  { text: "IA Nexfit: Gerando seu Ambiente...", icon: Sparkles },
];

export default function OnboardingLoadingScreen({
  durationMs = 9000,
  trainingLevelLabel,
  trainingDaysLabel,
  focusGroupLabel,
  onProceed,
}: Props) {
  const [phase, setPhase] = useState<"loading" | "success">("loading");
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("success"), Math.max(0, durationMs));
    return () => window.clearTimeout(t);
  }, [durationMs]);

  useEffect(() => {
    if (phase === "loading") {
      const interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % AI_STATUS_MESSAGES.length);
      }, 1300);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const CurrentStatus = AI_STATUS_MESSAGES[statusIndex];

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Matrix Data Stream Effect (CSS Particles) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-primary to-transparent animate-matrix-drop"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <Card className="w-full max-w-sm border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-2xl rounded-[40px] overflow-hidden relative">
        <CardContent className="space-y-8 p-8 py-12 text-center">
          {phase === "loading" ? (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
              {/* AI Core Visualization */}
              <div className="relative mx-auto h-48 w-48 flex items-center justify-center">
                {/* Pulsing Rings */}
                <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping duration-[3000ms]" />
                <div className="absolute inset-4 rounded-full border border-primary/10 animate-ping duration-[2000ms] delay-500" />

                {/* Rotating Neural Shell */}
                <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-primary/40 animate-spin transition-all duration-1000" />
                <div className="absolute inset-8 rounded-full border-b-2 border-r-2 border-accent/40 animate-spin-slow" />

                {/* AI Center Orb */}
                <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary via-accent to-secondary shadow-[0_0_50px_rgba(var(--primary-rgb),0.4)] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  <Brain className="h-10 w-10 text-black animate-pulse" />

                  {/* Scanning Line */}
                  <div className="absolute inset-x-0 h-[2px] bg-white/60 shadow-[0_0_10px_white] animate-scan" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary transition-all">
                  <CurrentStatus.icon className="h-3 w-3 animate-pulse" />
                  {CurrentStatus.text}
                </div>

                <div className="space-y-1">
                  <h1 className="page-title-gradient text-2xl font-black tracking-tighter uppercase leading-none">Criando Ambiente</h1>
                  <p className="text-xs text-muted-foreground font-medium">A IA está gerando suas configurações exclusivas...</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary shadow-xl shadow-primary/10">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="page-title-gradient text-2xl font-black tracking-tighter uppercase leading-none">Ambiente Gerado</h1>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Sincronização Elite concluída com sucesso.</p>
                </div>
              </div>

              <blockquote className="relative overflow-hidden rounded-[28px] border border-white/5 bg-white/5 p-5 text-sm">
                <p className="text-foreground/90 font-medium italic leading-relaxed">“{quote.text}”</p>
                <footer className="mt-2 text-[10px] font-black uppercase tracking-widest text-primary/60">— {quote.author}</footer>
                <Sparkles className="absolute -right-2 -bottom-2 h-12 w-12 text-primary/5" />
              </blockquote>

              <div className="grid gap-2">
                {[
                  { label: "Protocolo de Treino", val: trainingLevelLabel ?? "Elite", color: "text-primary" },
                  { label: "Janela de Atividade", val: trainingDaysLabel ?? "Configurado", color: "text-accent" },
                  { label: "Prioridade Muscular", val: focusGroupLabel ?? "Equilibrado", color: "text-blue-400" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4 group">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</span>
                    <span className={cn("text-xs font-black uppercase tracking-tighter", item.color)}>{item.val}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="premium"
                className="w-full h-16 rounded-[28px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                onClick={onProceed}
              >
                Acessar meu Dashboard
                <Zap className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
