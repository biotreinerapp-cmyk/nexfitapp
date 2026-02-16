import { CreditCard } from "lucide-react";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { MyPlanCard } from "@/components/subscription/MyPlanCard";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";

const AlunoPlanoPage = () => {
  return (
    <main className="safe-bottom-main flex min-h-screen flex-col bg-background px-4 pb-24 pt-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] right-[-10%] h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] h-64 w-64 rounded-full bg-accent/5 blur-[100px]" />

      <header className="mb-4 flex items-center gap-3 relative z-10">
        <BackIconButton to="/aluno/perfil" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Área do Aluno</p>
          <h1 className="mt-1 page-title-gradient flex items-center gap-2 text-2xl font-semibold">
            <CreditCard className="h-5 w-5" />
            Meu plano
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Consulte sua validade e solicite upgrade via Pix.
          </p>
        </div>
      </header>

      <section className="space-y-3 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <MyPlanCard />
      </section>
      <FloatingNavIsland />
    </main>
  );
};

export default AlunoPlanoPage;
