import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Crown, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABEL, type SubscriptionPlan } from "@/lib/subscriptionPlans";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProfileBillingInfo = {
  subscription_plan: SubscriptionPlan | null;
  plan_expires_at: string | null;
};

type PagamentoRow = {
  id: string;
  status: string;
  desired_plan: SubscriptionPlan;
  requested_at: string;
  rejection_reason?: string | null;
};

const PLAN_BADGE_VARIANT: Record<SubscriptionPlan, "default" | "secondary" | "outline"> = {
  FREE: "secondary",
  ADVANCE: "default",
  ELITE: "outline",
};

function formatExpiry(iso: string | null, fallbackLabel = "—") {
  if (!iso) return fallbackLabel;
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return fallbackLabel;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function MyPlanCard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<ProfileBillingInfo | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PagamentoRow[]>([]);

  const loadPlanAndPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: profile, error: profileError }, { data: payments, error: payError }] = await Promise.all([
        supabase.from("profiles").select("subscription_plan, plan_expires_at").eq("id", user.id).maybeSingle(),
        (supabase as any).from("pagamentos").select("id, status, desired_plan, requested_at, rejection_reason").eq("user_id", user.id).order("requested_at", { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (payError) throw payError;

      setBilling((profile as ProfileBillingInfo) ?? null);
      setPaymentHistory((payments as PagamentoRow[] | null) ?? []);
    } catch (error: any) {
      console.error("[MyPlanCard] Erro ao carregar dados", error);
      toast({ title: "Erro ao carregar plano", description: "Tente novamente em alguns instantes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => { void loadPlanAndPayments(); }, [loadPlanAndPayments]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`my-plan-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () => { void loadPlanAndPayments(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "pagamentos", filter: `user_id=eq.${user.id}` }, () => { void loadPlanAndPayments(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadPlanAndPayments, user]);

  const plan: SubscriptionPlan = billing?.subscription_plan ?? "FREE";

  const expiryLabel = useMemo(() => {
    if (billing?.plan_expires_at) return formatExpiry(billing.plan_expires_at);
    if (plan !== "FREE") return "Não definida";
    return "—";
  }, [billing?.plan_expires_at, plan]);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
          <Crown className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-primary/60">Assinatura</h2>
          <p className="text-sm font-black text-foreground uppercase tracking-tight">Meu Plano</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Plano Atual</p>
            <Badge variant={PLAN_BADGE_VARIANT[plan]} className="uppercase text-[10px] py-1 px-2.5 rounded-lg">
              {PLAN_LABEL[plan]}
            </Badge>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Validade</p>
            <p className="text-sm font-bold text-foreground">{expiryLabel}</p>
          </div>
        </div>

        <section aria-label="Histórico de pagamentos" className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Histórico de Transações</p>
          <div className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.02]">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/5 hover:bg-white/5 border-white/5">
                  <TableHead className="h-10 text-[9px] uppercase font-black text-muted-foreground">Data</TableHead>
                  <TableHead className="h-10 text-[9px] uppercase font-black text-muted-foreground">Plano</TableHead>
                  <TableHead className="h-10 text-[9px] uppercase font-black text-muted-foreground text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.length === 0 ? (
                  <TableRow className="hover:bg-white/5 border-white/5">
                    <TableCell colSpan={3} className="py-8 text-center text-xs text-muted-foreground font-medium">
                      Nenhum pagamento registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentHistory.map((row) => (
                    <TableRow key={row.id} className="hover:bg-white/5 border-white/5">
                      <TableCell className="text-[10px] font-medium text-muted-foreground">
                        {new Date(row.requested_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-[10px] font-black uppercase text-foreground">
                        {PLAN_LABEL[row.desired_plan]}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-bold border-0 bg-opacity-20 ${row.status === "approved"
                            ? "bg-primary/20 text-primary"
                            : row.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-500"
                              : "bg-destructive/20 text-destructive"
                            }`}
                        >
                          {row.status === "approved" ? "Aprovado" : row.status === "pending" ? "Pendente" : "Recusado"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
