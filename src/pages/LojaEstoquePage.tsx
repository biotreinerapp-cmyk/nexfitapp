import { useEffect } from "react";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { Warehouse } from "lucide-react";

const LojaEstoquePage = () => {
  useEffect(() => {
    document.title = "Estoque - Nexfit Lojista";
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 pb-8 pt-6 safe-bottom-floating-nav">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Estoque</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Controle de estoque</h1>
      </header>

      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Warehouse className="h-7 w-7 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          O controle de estoque será implementado em uma próxima fase.
        </p>
        <p className="text-xs text-muted-foreground">
          Aqui você poderá gerenciar quantidades, alertas de reposição e movimentações.
        </p>
      </div>

      <LojaFloatingNavIsland />
    </main>
  );
};

export default LojaEstoquePage;
