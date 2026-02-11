import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { PLAN_LABEL, type SubscriptionPlan } from "@/lib/subscriptionPlans";

type PixConfigRow = {
  id: string;
  pix_key: string | null;
  receiver_name: string | null;
  bank_name: string | null;
  updated_at: string;
};

type PlanConfigRow = {
  plan: SubscriptionPlan;
  price_cents: number;
  updated_at: string | null;
};

const PAID_PLANS: SubscriptionPlan[] = ["ADVANCE", "ELITE"];

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

export function GeneralSettingsPixPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sb: any = supabase;

  const planPriceSectionRef = useRef<HTMLDivElement | null>(null);

  const { data: pixConfig, isLoading: loadingPix, refetch: refetchPix } = useQuery<PixConfigRow | null>({
    queryKey: ["admin", "pix-config"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("pix_configs")
        .select("id, pix_key, receiver_name, bank_name, updated_at")
        .is("store_id", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
    staleTime: 0,
  });

  const { data: planConfigsRaw = [], isLoading: loadingPlans } = useQuery({
    queryKey: ["admin", "plan-configs-basic"],
    queryFn: async () => {
      // supabase types in this project may lag behind migrations; treat as any.
      const { data, error } = await sb.from("plan_configs").select("plan, price_cents, updated_at");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 0,
  });

  const planConfigs = useMemo(() => {
    return (planConfigsRaw ?? []).map((r: any) => ({
      plan: r.plan as SubscriptionPlan,
      price_cents: Number(r.price_cents ?? 0),
      updated_at: (r.updated_at as string | null) ?? null,
    })) as PlanConfigRow[];
  }, [planConfigsRaw]);

  const plansById = useMemo(() => {
    const map = new Map<SubscriptionPlan, PlanConfigRow>();
    for (const row of planConfigs) map.set(row.plan, row);
    return map;
  }, [planConfigs]);

  const allPlans = useMemo(() => Object.keys(PLAN_LABEL) as SubscriptionPlan[], []);

  const formatUpdatedAt = (ts: string | null) => {
    if (!ts) return "-";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  };

  const [pixKey, setPixKey] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [bankName, setBankName] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("ADVANCE");
  const [priceDigitsByPlan, setPriceDigitsByPlan] = useState<Record<string, string>>({});
  const [savingPlanPrice, setSavingPlanPrice] = useState(false);

  useEffect(() => {
    if (!pixConfig) return;
    setPixKey(pixConfig.pix_key ?? "");
    setReceiverName(pixConfig.receiver_name ?? "");
    setBankName(pixConfig.bank_name ?? "");
  }, [pixConfig?.id]);

  // Initialize local plan prices from DB.
  useEffect(() => {
    if (!planConfigs.length) return;
    setPriceDigitsByPlan((prev) => {
      const next = { ...prev };
      for (const p of PAID_PLANS) {
        if (next[p] != null) continue;
        next[p] = centsToDigits(plansById.get(p)?.price_cents ?? 0);
      }
      return next;
    });
  }, [planConfigs.length, plansById]);

  const handleSave = async () => {
    if (!pixKey.trim()) {
      toast({ title: "Informe a chave Pix", variant: "destructive" });
      return;
    }
    if (!receiverName.trim()) {
      toast({ title: "Informe o nome do recebedor", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (pixConfig?.id) {
        const { error } = await sb
          .from("pix_configs")
          .update({
            pix_key: pixKey.trim(),
            receiver_name: receiverName.trim(),
            bank_name: bankName.trim() || null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", pixConfig.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("pix_configs").insert({
          store_id: null,
          pix_key: pixKey.trim(),
          receiver_name: receiverName.trim(),
          bank_name: bankName.trim() || null,
          updated_at: new Date().toISOString(),
        } as any);
        if (error) throw error;
      }

      toast({ title: "Pix atualizado", description: "Configuração padrão salva com sucesso." });
      void refetchPix();
    } catch (e: any) {
      toast({ title: "Erro ao salvar Pix", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlanPrice = (plan: SubscriptionPlan, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    setPriceDigitsByPlan((prev) => ({ ...prev, [plan]: digits }));
  };

  const handleSavePlanPrice = async () => {
    if (!PAID_PLANS.includes(selectedPlan)) {
      toast({ title: "Plano inválido", variant: "destructive" });
      return;
    }

    const digits = (priceDigitsByPlan[selectedPlan] ?? "").replace(/\D/g, "");
    const cents = Number(digits || "0");
    const valueBRL = cents / 100;
    if (!Number.isFinite(valueBRL) || valueBRL < 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um preço válido (ex: R$ 39,90).",
        variant: "destructive",
      });
      return;
    }

    setSavingPlanPrice(true);
    try {
      const { error } = await sb
        .from("plan_configs")
        .upsert(
          {
            plan: selectedPlan,
            price_cents: Math.round(valueBRL * 100),
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "plan" },
        );
      if (error) throw error;

      toast({
        title: "Preço atualizado",
        description: `${PLAN_LABEL[selectedPlan]} agora está em ${formatBRLFromCents(Math.round(valueBRL * 100))}.`,
      });

      await queryClient.invalidateQueries({ queryKey: ["admin", "plan-configs"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "plan-configs-basic"] });
    } catch (e: any) {
      toast({ title: "Erro ao salvar preço", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setSavingPlanPrice(false);
    }
  };

  const handleEditFromTable = (plan: SubscriptionPlan) => {
    if (!PAID_PLANS.includes(plan)) {
      toast({
        title: "Plano não editável",
        description: "A edição de preço está disponível apenas para planos pagos.",
        variant: "destructive",
      });
      return;
    }

    const currentCents = plansById.get(plan)?.price_cents ?? 0;
    setSelectedPlan(plan);
    setPriceDigitsByPlan((prev) => ({ ...prev, [plan]: centsToDigits(currentCents) }));

    // Bring the editor into view for quick edits.
    requestAnimationFrame(() => planPriceSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="space-y-4">
      <Card className="border border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Configuração Pix padrão</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Chave Pix, recebedor e instituição financeira (usado em telas de pagamento e no gerador de QR por plano).
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Chave Pix</Label>
              <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="ex: email, CPF, CNPJ ou chave aleatória" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nome do recebedor</Label>
              <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="ex: Nexfit" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Instituição financeira</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="ex: Banco X" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || loadingPix}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <p className="text-xs text-muted-foreground">{loadingPix ? "Carregando..." : ""}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Valor por plano (R$)</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Selecione um plano e defina o valor em BRL (salvo em <code className="text-[11px]">plan_configs.price_cents</code>).
          </p>
        </CardHeader>
        <CardContent>
          <div ref={planPriceSectionRef} />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Plano</Label>
              <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as SubscriptionPlan)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PAID_PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLAN_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {loadingPlans ? "Carregando..." : `Atual no banco: ${formatBRLFromCents(plansById.get(selectedPlan)?.price_cents ?? 0)}`}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Valor (BRL)</Label>
              <Input
                inputMode="numeric"
                value={digitsToBRL(priceDigitsByPlan[selectedPlan] ?? centsToDigits(plansById.get(selectedPlan)?.price_cents ?? 0))}
                onChange={(e) => handleChangePlanPrice(selectedPlan, e.target.value)}
                placeholder="R$ 0,00"
              />
              <p className="text-[11px] text-muted-foreground">Sempre com 2 casas decimais.</p>
            </div>

            <div className="flex items-end">
              <Button size="sm" onClick={() => void handleSavePlanPrice()} disabled={savingPlanPrice} loading={savingPlanPrice}>
                Salvar
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-foreground">Tabela de valores (somente leitura)</p>
            <div className="rounded-md border border-border/60 bg-card/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Atualizado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPlans.map((plan) => {
                    const row = plansById.get(plan);
                      const editable = PAID_PLANS.includes(plan);
                    return (
                      <TableRow key={plan}>
                        <TableCell className="font-medium">{PLAN_LABEL[plan]}</TableCell>
                        <TableCell>{formatBRLFromCents(row?.price_cents ?? 0)}</TableCell>
                        <TableCell className="text-muted-foreground">{loadingPlans ? "Carregando..." : formatUpdatedAt(row?.updated_at ?? null)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditFromTable(plan)}
                              disabled={!editable}
                              aria-label={`Editar preço do plano ${PLAN_LABEL[plan]}`}
                            >
                              Editar
                            </Button>
                          </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
