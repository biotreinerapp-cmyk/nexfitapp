import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PwaInstallBannerProps {
  showInstallBanner: boolean;
  onInstall: () => void;
  onClose: () => void;
}

export const PwaInstallBanner = ({ showInstallBanner, onInstall, onClose }: PwaInstallBannerProps) => {
  if (!showInstallBanner) return null;

  return (
    <div className="safe-bottom-banner pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-primary/70 bg-card/95 px-4 py-3 shadow-2xl shadow-primary/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex flex-col text-xs">
            <span className="font-semibold leading-tight">Instalar Nexfit</span>
            <span className="text-[11px] leading-tight text-muted-foreground">
              Tenha acesso rápido ao seu painel e treinos direto da tela inicial.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 rounded-full px-3 text-xs font-semibold shadow-lg shadow-primary/60" onClick={onInstall}>
            Baixar agora
          </Button>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition hover:bg-background hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

