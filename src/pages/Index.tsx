import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { showInstallBanner, handleInstallClick, handleCloseBanner } = usePwaInstallPrompt();

  useEffect(() => {
    if (!loading) {
      if (user) navigate("/aluno/dashboard", { replace: true });
      else navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Nexfit carregando...
      <PwaInstallBanner
        showInstallBanner={showInstallBanner}
        onInstall={handleInstallClick}
        onClose={handleCloseBanner}
      />
    </div>
  );
};

export default Index;
