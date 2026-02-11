import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { PLAN_LABEL, type SubscriptionPlan } from "@/lib/subscriptionPlans";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PlanConfigRow = {
  plan: SubscriptionPlan;
  price_cents: number;
};

const formatBRLFromCents = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents ?? 0) || 0) / 100);

/**
 * Currency input strategy:
 * - Internally keep only digits representing cents (e.g. "4990")
 * - Display always as BRL with 2 decimals (R$ 49,90)
 */
function digitsToBRL(digits: string) {
  const safe = (digits || "").replace(/\D/g, "");
  const cents = Number(safe || "0");
  return formatBRLFromCents(cents);
}

function centsToDigits(cents: number) {
  const n = Math.max(0, Math.trunc(Number(cents ?? 0) || 0));
  return String(n);
}

export function PlanConfigsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sb: any = supabase;

  const { data: planConfigsRaw = [], isLoading } = useQuery({
    queryKey: ["admin", "plan-configs"],
    queryFn: async () => {
      const { data, error } = await sb.from("plan_configs").select("plan, price_cents");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 0,
  });

  const planConfigs = useMemo(() => {
    return (planConfigsRaw ?? []).map((r: any) => ({
      plan: r.plan as SubscriptionPlan,
      price_cents: Number(r.price_cents ?? 0),
    })) as PlanConfigRow[];
  }, [planConfigsRaw]);

  const byPlan = useMemo(() => {
    const map = new Map<SubscriptionPlan, PlanConfigRow>();
    for (const row of planConfigs) map.set(row.plan, row);
    return map;
  }, [planConfigs]);

  const [priceDigitsByPlan, setPriceDigitsByPlan] = useState<Record<string, string>>({});
  const [savingPlan, setSavingPlan] = useState<SubscriptionPlan | null>(null);

  // Initialize local state from DB once we have values.
  useEffect(() => {
    if (!planConfigs.length) return;
    setPriceDigitsByPlan((prev) => {
      const next = { ...prev };
      for (const p of Object.keys(PLAN_LABEL) as SubscriptionPlan[]) {
        if (next[p] != null) continue;
        next[p] = centsToDigits(byPlan.get(p)?.price_cents ?? 0);
      }
      return next;
    });
  }, [planConfigs.length, byPlan]);

  const handleChange = (plan: SubscriptionPlan, raw: string) => {
    // Accept numbers and comma separator; store digits-only
    const digits = raw.replace(/\D/g, "");
    setPriceDigitsByPlan((prev) => ({ ...prev, [plan]: digits }));
  };

  const handleSavePlan = async (plan: SubscriptionPlan) => {
    const digits = (priceDigitsByPlan[plan] ?? "").replace(/\D/g, "");
    const cents = Number(digits || "0");

    // Under the hood we keep the numeric value as float (BRL) to validate,
    // but persist as integer cents (current DB schema: plan_configs.price_cents).
    const valueBRL = cents / 100;
    if (!Number.isFinite(valueBRL) || valueBRL < 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um preço válido (ex: R$ 49,90).",
        variant: "destructive",
      });
      return;
    }

    setSavingPlan(plan);
    try {
      const { error } = await sb
        .from("plan_configs")
        .upsert(
          {
            plan,
            price_cents: Math.round(valueBRL * 100),
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "plan" },
        );
      if (error) throw error;

      toast({
        title: "Preço atualizado",
        description: `${PLAN_LABEL[plan]} agora está em ${formatBRLFromCents(Math.round(valueBRL * 100))}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "plan-configs"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "plan-configs-basic"] });
    } catch (e: any) {
      toast({
        title: "Erro ao salvar preço",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingPlan(null);
    }
  };

  return (
    <Card className="border border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Planos e Permissões</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">Defina preços em BRL (R$) para cada plano.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(Object.keys(PLAN_LABEL) as SubscriptionPlan[]).map((plan) => {
            const digits = priceDigitsByPlan[plan] ?? centsToDigits(byPlan.get(plan)?.price_cents ?? 0);
            const display = digitsToBRL(digits);

            return (
              <div key={plan} className="grid gap-2 rounded-lg border border-border/60 bg-card/60 p-4 md:grid-cols-[1fr,220px,120px] md:items-end">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{PLAN_LABEL[plan]}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isLoading ? "Carregando..." : `Atual no banco: ${formatBRLFromCents(byPlan.get(plan)?.price_cents ?? 0)}`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Preço (BRL)</Label>
                  <Input
                    inputMode="numeric"
                    value={display}
                    onChange={(e) => handleChange(plan, e.target.value)}
                    aria-label={`Preço do plano ${PLAN_LABEL[plan]}`}
                    placeholder="R$ 0,00"
                  />
                  <p className="text-[11px] text-muted-foreground">Sempre com 2 casas decimais.</p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleSavePlan(plan)}
                  disabled={savingPlan !== null}
                  loading={savingPlan === plan}
                >
                  Salvar
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
