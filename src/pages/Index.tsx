import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import SplashLoader from "@/components/SplashLoader";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { showInstallBanner, handleInstallClick, handleCloseBanner } = usePwaInstallPrompt();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // Check if user is a store_owner or professional to redirect accordingly
    const checkRole = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = (roleData?.map(r => r.role) || []) as string[];
      const userRole = profile?.role;

      console.log("[Index] Routing user:", { userRole, roles });

      if (userRole === "store_owner" || roles.includes("store_owner")) {
        navigate("/loja/dashboard", { replace: true });
      } else if (userRole === "professional" || roles.includes("professional")) {
        navigate("/professional/dashboard", { replace: true });
      } else {
        navigate("/aluno/dashboard", { replace: true });
      }
      setChecking(false);
    };

    checkRole();
  }, [user, loading, navigate, checking]);

  if (loading || checking) {
    return <SplashLoader />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      <SplashLoader />
      <PwaInstallBanner
        showInstallBanner={showInstallBanner}
        onInstall={handleInstallClick}
        onClose={handleCloseBanner}
      />
    </div>
  );
};

export default Index;
