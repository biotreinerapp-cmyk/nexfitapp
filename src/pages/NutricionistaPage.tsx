import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Bot, ChevronRight, Lock } from "lucide-react";
import { useUserPlan } from "@/hooks/useUserPlan";
import { PLAN_LABEL } from "@/lib/subscriptionPlans";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import drBioAvatar from "@/assets/dr-bio-avatar.png";
import { useMemo } from "react";

const NutricionistaPage = () => {
  const navigate = useNavigate();
  const { plan, hasNutritionAccess, isMaster, loading: planLoading } = useUserPlan();

  const canAccess = isMaster || hasNutritionAccess;
  const planoAtual = useMemo(() => (isMaster ? "ELITE" : plan), [isMaster, plan]);

  if (!canAccess && planoAtual === "FREE") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border border-accent/40 bg-card/90 p-6 text-xs">
          <h1 className="mb-1 text-base font-semibold text-foreground">Nutrição bloqueada</h1>
          <p className="mb-3 text-[11px] text-muted-foreground">
            O módulo de nutrição está disponível a partir do plano <span className="font-semibold text-primary">{PLAN_LABEL.ADVANCE}</span>.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate("/aluno/planos")}>
            Ver planos disponíveis
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="safe-bottom-main flex min-h-screen flex-col bg-background px-4 safe-top-padded">
      {/* Header */}
      <header className="flex items-center gap-3 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/aluno/dashboard")}
          className="h-10 w-10 rounded-full text-muted-foreground hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-black uppercase tracking-wider text-foreground">
            Nutrição
          </h1>
          <p className="text-[10px] text-muted-foreground font-medium">
            Seu hub de alimentação e saúde
          </p>
        </div>
      </header>

      {/* Cards Grid */}
      <section className="grid grid-cols-2 gap-3 mt-2">
        {/* Plano Alimentar Card */}
        <button
          onClick={() => navigate("/aluno/plano-alimentar")}
          className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md aspect-square"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/20 text-emerald-400 shadow-inner">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-foreground leading-tight">Plano Alimentar</h3>
            <p className="text-[10px] text-muted-foreground font-medium opacity-70 leading-relaxed">
              Dietas & Rotinas
            </p>
          </div>
          <div className="flex items-center gap-1 text-emerald-400/60">
            <span className="text-[9px] font-semibold uppercase tracking-wider">Acessar</span>
            <ChevronRight className="h-3 w-3" />
          </div>
          <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
            <ClipboardList className="h-12 w-12 rotate-12" />
          </div>
        </button>

        {/* Dr. Bio Card */}
        <button
          onClick={() => navigate("/aluno/dr-bio")}
          className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-teal-600/5 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md aspect-square"
        >
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-black/20 shadow-inner overflow-hidden">
            <img
              src={drBioAvatar}
              alt="Dr. Bio"
              className="h-full w-full rounded-2xl object-cover"
            />
            <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-black bg-green-500" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-foreground leading-tight">Dr. Bio</h3>
            <p className="text-[10px] text-muted-foreground font-medium opacity-70 leading-relaxed">
              Nutricionista IA 24h
            </p>
          </div>
          <div className="flex items-center gap-1 text-teal-400/60">
            <span className="text-[9px] font-semibold uppercase tracking-wider">Conversar</span>
            <ChevronRight className="h-3 w-3" />
          </div>
          <div className="absolute top-4 right-4 opacity-5 transition-opacity group-hover:opacity-10">
            <Bot className="h-12 w-12 rotate-12" />
          </div>
        </button>
      </section>
    </main>
  );
};

export default NutricionistaPage;
