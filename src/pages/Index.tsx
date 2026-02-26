import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SplashLoader from "@/components/SplashLoader";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // User exists — check role and redirect
    const checkRole = async () => {
      const isMasterAdmin = user.email === "biotreinerapp@gmail.com";
      if (isMasterAdmin) {
        navigate("/admin", { replace: true });
        return;
      }

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
        // Check if professional has completed onboarding
        const { data: profData } = await (supabase as any)
          .from("professionals")
          .select("telemedicina_servico_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profData?.telemedicina_servico_id) {
          navigate("/professional/dashboard", { replace: true });
        } else {
          navigate("/professional/onboarding", { replace: true });
        }
      } else {
        navigate("/aluno/dashboard", { replace: true });
      }
    };

    checkRole();
  }, [user, loading, navigate]);

  // Always show SplashLoader while determining where to go
  return <SplashLoader />;
};

export default Index;
