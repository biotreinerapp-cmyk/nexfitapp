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
                const currentPlan = store.subscription_plan || "FREE";
                setSubscriptionPlan(currentPlan);

                // 2. Fetch the plan ID from app_access_plans
                const { data: planData } = await (supabase as any)
                    .from("app_access_plans")
                    .select("id")
                    .eq("user_type", "LOJISTA")
                    .ilike("name", `%${currentPlan}%`)
                    .maybeSingle();

                if (!planData) {
                    // Fallback to minimal modules if no plan found (or FREE)
                    setModules(new Set(['dashboard', 'perfil']));
                    setIsLoading(false);
                    return;
                }

                // 3. Fetch the modules linked to this plan
                const { data: planModulesData } = await (supabase as any)
                    .from("plan_modules")
                    .select(`
                        module_id,
                        access_modules ( key )
                    `)
                    .eq("plan_id", planData.id);

                if (planModulesData && planModulesData.length > 0) {
                    const moduleKeys = planModulesData
                        .map((pm: any) => pm.access_modules?.key)
                        .filter(Boolean);
                    setModules(new Set(moduleKeys));
                } else {
                    // Default fallback if no modules mapped
                    setModules(new Set(['dashboard', 'perfil']));
                }

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
