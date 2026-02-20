
import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";

interface AdminGuardProps {
    children: ReactNode;
    system?: string;
    level?: 'read' | 'write' | 'admin';
}

export const AdminGuard = ({ children, system, level = 'read' }: AdminGuardProps) => {
    const { user, loading: authLoading } = useAuth();
    const { isAdmin, loading: roleLoading, error, hasPermission } = useAdminRole();
    const location = useLocation();

    useEffect(() => {
        // Log access denial if the user is logged in but doesn't have permission
        if (!authLoading && !roleLoading && user && !isAdmin && system && !hasPermission(system, level)) {
            console.warn(`[AdminGuard] Access denied for user ${user.email} to system ${system}`);
            void supabase.rpc("log_denied_access", {
                _system: system,
                _details: {
                    path: location.pathname,
                    required_level: level
                }
            });
        }
    }, [authLoading, roleLoading, user, isAdmin, system, level, hasPermission, location]);

    if (authLoading || roleLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Verificando permissões...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    const isMasterAdmin = user.email === "biotreinerapp@gmail.com";
    const searchParams = new URLSearchParams(location.search);
    const adminView = searchParams.get("adminView") === "1";

    // Allow master admin or anyone with explicit system permission
    const authorized = isMasterAdmin || isAdmin || (system && hasPermission(system, level));

    if (!authorized) {
        return <Navigate to="/403" replace />;
    }

    return <>{children}</>;
};
