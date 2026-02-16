import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { SubscriptionPlan } from "@/lib/subscriptionPlans";

type PlanState = SubscriptionPlan | null;

export const useUserPlan = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanState>(null);
  const [loading, setLoading] = useState(true);
  const isMaster = user?.email === "contatomaydsonsv@gmail.com";

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) {
        setPlan(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setPlan((data as any).subscription_plan as SubscriptionPlan);
      }

      setLoading(false);
    };

    void fetchPlan();
  }, [user]);

  const effectivePlan: SubscriptionPlan = isMaster ? "ELITE" : (plan ?? "FREE");

  const hasMarketplaceAccess = isMaster || effectivePlan !== "FREE";
  const hasNutritionAccess = isMaster || effectivePlan !== "FREE";
  const hasTelemedAccess = isMaster || effectivePlan === "ELITE";

  const isFree = effectivePlan === "FREE";
  const isAdvance = effectivePlan === "ADVANCE";
  const isElite = effectivePlan === "ELITE";
  const canAccessPremiumFeatures = isMaster || isAdvance || isElite;

  return {
    plan: effectivePlan,
    loading,
    hasMarketplaceAccess,
    hasNutritionAccess,
    hasTelemedAccess,
    isMaster,
    isFree,
    isAdvance,
    isElite,
    canAccessPremiumFeatures,
  };
};
