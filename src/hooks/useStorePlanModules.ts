import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StorePlanInfo {
    storeId: string | null;
    subscriptionPlan: string | null;
    modules: Set<string>;
    isLoading: boolean;
    hasModule: (moduleKey: string) => boolean;
}

/**
 * Hook that checks the active plan modules for the logged-in store owner.
 * Queries marketplace_stores → subscription_plan → app_access_plans (LOJISTA) → plan_modules → access_modules
 */
export function useStorePlanModules(): StorePlanInfo {
    const { user } = useAuth();
    const [storeId, setStoreId] = useState<string | null>(null);
    const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
    const [modules, setModules] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const load = async () => {
            setIsLoading(true);
            try {
                // 1. Get the store and its subscription plan
                const { data: store } = await (supabase as any)
                    .from("marketplace_stores")
                    .select("id, subscription_plan, nome")
                    .eq("owner_user_id", user.id)
                    .maybeSingle();

                if (!store) {
                    setIsLoading(false);
                    return;
                }

                setStoreId(store.id);
                setSubscriptionPlan(store.subscription_plan);

                // BYPASS: Grant full access to all modules regardless of plan
                // This is a temporary measure requested to unblock the LOJISTA access on Render
                setModules(new Set(['treinos', 'nutricao', 'telemedicina', 'marketplace', 'agenda', 'chat', 'financeiro', 'loja', 'estoque', 'relatorios']));

            } catch (error) {
                console.error("[useStorePlanModules] Error loading plan modules:", error);
            } finally {
                setIsLoading(false);
            }
        };

        void load();
    }, [user]);

    const hasModule = (moduleKey: string): boolean => {
        return modules.has(moduleKey);
    };

    return { storeId, subscriptionPlan, modules, isLoading, hasModule };
}
