import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Home, Pill, Rocket, Shirt, User } from "lucide-react";
import { HubServiceButton } from "@/components/dashboard/HubServiceButton";
import { BackIconButton } from "@/components/navigation/BackIconButton";

const MarketplaceCategoriesPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Marketplace Nexfit - Categorias";
  }, []);

  const handleGoBack = () => {
    navigate("/aluno/dashboard");
  };

  return (
    <main className="safe-bottom-floating-nav flex min-h-screen flex-col gap-4 bg-background px-4 pt-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <BackIconButton onClick={handleGoBack} />
           <h1 className="page-title-gradient text-lg font-semibold tracking-tight">Marketplace Nexfit</h1>
        </div>
        <div className="rounded-xl bg-card/70 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur">
          Descontos exclusivos de até 20% para membros.
        </div>
      </header>

      <section className="space-y-3">
        <HubServiceButton
          title="Suplementos"
          icon={Pill}
          onClick={() => navigate("/marketplace/categoria/suplementos")}
          className="rounded-2xl px-4 py-4"
        />

        <HubServiceButton
          title="Roupas Fitness"
          icon={Shirt}
          onClick={() => navigate("/marketplace/categoria/roupas")}
          className="rounded-2xl px-4 py-4"
        />

        <HubServiceButton
          title="Artigos Esportivos"
          icon={Dumbbell}
          onClick={() => navigate("/marketplace/categoria/artigos")}
          className="rounded-2xl px-4 py-4"
        />
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/90 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => navigate("/aluno/dashboard")}
            className="flex flex-1 flex-col items-center justify-center gap-1"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs leading-none whitespace-nowrap">Início</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/aluno/atividade")}
            className="flex flex-1 flex-col items-center justify-center gap-1"
          >
            <Dumbbell className="h-5 w-5" />
            <span className="text-xs leading-none whitespace-nowrap">Treinos</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/aluno/progresso")}
            className="flex flex-1 flex-col items-center justify-center gap-1"
          >
            <Rocket className="h-5 w-5" />
            <span className="text-xs leading-none whitespace-nowrap">Evolução</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/aluno/dashboard#telemedicina")}
            className="flex flex-1 flex-col items-center justify-center gap-1"
          >
            <User className="h-5 w-5" />
            <span className="text-xs leading-none whitespace-nowrap">Telemedicina</span>
          </button>
        </div>
      </nav>
    </main>
  );
};

export default MarketplaceCategoriesPage;

