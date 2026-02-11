import { CreditCard } from "lucide-react";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { MyPlanCard } from "@/components/subscription/MyPlanCard";

const AlunoPlanoPage = () => {
  return (
    <main className="safe-bottom-content flex min-h-screen flex-col bg-background px-4 pt-6">
      <header className="mb-4 flex items-center gap-3">
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

      <section className="space-y-3">
        <MyPlanCard />
      </section>
    </main>
  );
};

export default AlunoPlanoPage;
