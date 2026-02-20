import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Apple, Dumbbell, Pill, Shirt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HubServiceButton } from "@/components/dashboard/HubServiceButton";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";

const MarketplaceCategoriesPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Marketplace Nexfit - Categorias";
  }, []);

  const handleGoBack = () => {
    navigate("/aluno/dashboard");
  };

  return (
    <main className="safe-bottom-floating-nav flex min-h-screen flex-col bg-background">
      <div className="bg-gradient-to-b from-primary/10 via-background to-background pt-6 pb-4">
        <header className="container mx-auto px-4 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <BackIconButton onClick={handleGoBack} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Marketplace</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium opacity-80">Parceiros Nexfit</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-xl relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50 transition-opacity group-hover:opacity-70" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Ofertas Exclusivas</p>
                <p className="text-[11px] text-muted-foreground">Membros Nexfit economizam até 20%</p>
              </div>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[10px] px-2 py-0.5">
                VIP STATUS
              </Badge>
            </div>
          </div>
        </header>
      </div>

      <section className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <CategoryCard
            title="Suplementos"
            subtitle="Performance & Saúde"
            icon={Pill}
            color="from-blue-500/20 to-blue-600/5"
            borderColor="border-blue-500/20"
            iconColor="text-blue-400"
            onClick={() => navigate("/marketplace/categoria/suplementos")}
          />
          <CategoryCard
            title="Roupas"
            subtitle="Estilo & Conforto"
            icon={Shirt}
            color="from-emerald-500/20 to-emerald-600/5"
            borderColor="border-emerald-500/20"
            iconColor="text-emerald-400"
            onClick={() => navigate("/marketplace/categoria/roupas")}
          />
          <CategoryCard
            title="Acessórios"
            subtitle="Artigos esportivos"
            icon={Dumbbell}
            color="from-orange-500/20 to-orange-600/5"
            borderColor="border-orange-500/20"
            iconColor="text-orange-400"
            onClick={() => navigate("/marketplace/categoria/artigos")}
          />
          <CategoryCard
            title="Nutrição"
            subtitle="Dieta Fitness"
            icon={Apple}
            color="from-red-500/20 to-red-600/5"
            borderColor="border-red-500/20"
            iconColor="text-red-400"
            onClick={() => navigate("/marketplace/categoria/nutricao")}
          />
        </div>
      </section>

      <div className="mt-auto px-4 pb-10 pt-4 container mx-auto">
        <p className="text-center text-[10px] text-muted-foreground opacity-50">
          Entregas rápidas e exclusivas para parceiros certificados.
        </p>
      </div>

      <FloatingNavIsland />
    </main>
  );
};

function CategoryCard({ title, subtitle, icon: Icon, color, borderColor, iconColor, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border ${borderColor} bg-gradient-to-br ${color} p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md group`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 ${iconColor} shadow-inner`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground leading-none">{title}</h3>
        <p className="text-[10px] text-muted-foreground font-medium opacity-80">{subtitle}</p>
      </div>
      <div className="absolute top-4 right-4 opacity-10 transition-opacity group-hover:opacity-20">
        <Icon className="h-10 w-10 rotate-12" />
      </div>
    </button>
  );
}

export default MarketplaceCategoriesPage;

