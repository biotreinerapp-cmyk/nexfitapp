import { useLocation, useNavigate } from "react-router-dom";
import { Home, Dumbbell, Rocket, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Início", path: "/aluno/dashboard" },
  { icon: Dumbbell, label: "Treinos", path: "/aluno/atividade" },
  { icon: Rocket, label: "Evolução", path: "/aluno/progresso" },
  { icon: User, label: "Perfil", path: "/aluno/perfil" },
];

export const FloatingNavIsland = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/aluno/dashboard") {
      return location.pathname === path || location.pathname === "/aluno";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 pt-2"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div
        className="flex w-full max-w-sm items-center justify-around rounded-xl border border-accent/30 px-2 py-3"
        style={{
          backgroundColor: "rgba(10, 13, 12, 0.98)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.5)",
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                "flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 rounded-xl px-3 transition-all duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-all duration-200",
                  active && "drop-shadow-[0_0_8px_hsl(var(--primary))]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-none transition-all duration-200",
                  active && "text-primary"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
