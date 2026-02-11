import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, CreditCard, Crown, Upload, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABEL, type SubscriptionPlan } from "@/lib/subscriptionPlans";
import {
  clearPixUpgradeModalState,
  loadPixUpgradeModalState,
  persistPixUpgradeModalState,
} from "@/lib/pixUpgradeModalPersistence";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type ProfileBillingInfo = {
  subscription_plan: SubscriptionPlan | null;
  plan_expires_at: string | null;
};

type PixConfig = {
  pix_key: string | null;
  qr_image_path: string | null;
};

type PagamentoRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  desired_plan: SubscriptionPlan;
  requested_at: string;
  rejection_reason: string | null;
};

type PixUpgradeModalPersistedState = {
  isOpen: boolean;
  desiredPlan: SubscriptionPlan;
  receiptFile: File | null;
};

const PLAN_BADGE_VARIANT: Record<SubscriptionPlan, "default" | "secondary" | "destructive" | "outline"> = {
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

function formatBRLFromCents(cents: number) {
  const safe = Number(cents ?? 0) || 0;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(safe / 100);
}

export function MyPlanCard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<ProfileBillingInfo | null>(null);
  const [pix, setPix] = useState<PixConfig | null>(null);
  const [qrSignedUrl, setQrSignedUrl] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<PagamentoRow | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PagamentoRow[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [desiredPlan, setDesiredPlan] = useState<SubscriptionPlan>("ADVANCE");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: planConfigsRaw = [] } = useQuery({
    queryKey: ["admin", "plan-configs-basic"],
    queryFn: async () => {
      const sb: any = supabase;
      const { data, error } = await sb.from("plan_configs").select("plan, price_cents");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 0,
  });

  const planPricesByPlan = useMemo(() => {
    const map = new Map<SubscriptionPlan, number>();
    for (const r of planConfigsRaw as any[]) {
      const plan = r.plan as SubscriptionPlan;
      map.set(plan, Number(r.price_cents ?? 0));
    }
    return map;
  }, [planConfigsRaw]);

  const modalStorageKey = useMemo(() => {
    if (!user) return null;
    return `biotreiner_pix_upgrade_modal_${user.id}`;
  }, [user]);

  // Restaura o estado do modal após reload/retorno ao app.
  useEffect(() => {
    const restore = async () => {
      if (!user || !modalStorageKey) return;
      try {
        const restored = await loadPixUpgradeModalState(modalStorageKey);
        if (!restored) return;

        setDesiredPlan(restored.desiredPlan);
        setReceiptFile(restored.receiptFile);
        setIsOpen(restored.isOpen);
      } catch (error) {
        console.warn("[MyPlanCard] Falha ao restaurar estado do modal Pix", error);
      }
    };

    void restore();
  }, [modalStorageKey, user]);

  // Persiste continuamente o estado do modal.
  useEffect(() => {
    const persist = async () => {
      if (!user || !modalStorageKey) return;
      const snapshot: PixUpgradeModalPersistedState = {
        isOpen,
        desiredPlan,
        receiptFile,
      };
      try {
        await persistPixUpgradeModalState(modalStorageKey, snapshot);
      } catch (error) {
        console.warn("[MyPlanCard] Falha ao persistir estado do modal Pix", error);
      }
    };

    void persist();
  }, [desiredPlan, isOpen, modalStorageKey, receiptFile, user]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);

      // Ao fechar, limpamos o estado persistido para não reabrir sem necessidade.
      if (!open && modalStorageKey) {
        void clearPixUpgradeModalState(modalStorageKey);
        setReceiptFile(null);
      }
    },
    [modalStorageKey],
  );

  const handleCopyPixKey = useCallback(async () => {
    const key = pix?.pix_key?.trim();
    if (!key) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(key);
      } else {
        // Fallback (older browsers / permissions)
        const el = document.createElement("textarea");
        el.value = key;
        el.setAttribute("readonly", "true");
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      toast({ title: "Chave Pix copiada" });
    } catch (error) {
      console.warn("[MyPlanCard] Falha ao copiar Pix", error);
      toast({
        title: "Não foi possível copiar",
        description: "Copie manualmente a chave Pix.",
        variant: "destructive",
      });
    }
  }, [pix?.pix_key, toast]);

  const loadPlanAndPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [{ data: profile, error: profileError }, { data: payments, error: payError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("subscription_plan, plan_expires_at")
          .eq("id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("pagamentos")
          .select("id, status, desired_plan, requested_at, rejection_reason")
          .eq("user_id", user.id)
          .order("requested_at", { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (payError) throw payError;

      setBilling((profile as ProfileBillingInfo) ?? null);

      const rows = (payments as PagamentoRow[] | null) ?? [];
      setPaymentHistory(rows);
      setLastRequest(rows[0] ?? null);
    } catch (error: any) {
      console.error("[MyPlanCard] Erro ao carregar dados", error);
      toast({
        title: "Erro ao carregar plano",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    void loadPlanAndPayments();
  }, [loadPlanAndPayments]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`my-plan-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => {
          void loadPlanAndPayments();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pagamentos", filter: `user_id=eq.${user.id}` },
        () => {
          void loadPlanAndPayments();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadPlanAndPayments, user]);

  useEffect(() => {
    const loadPix = async () => {
      if (!user) return;

      try {
        const { data, error } = await (supabase as any)
          .from("pix_configs")
          .select("pix_key, qr_image_path")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setPix((data as PixConfig) ?? null);

        const path = (data as PixConfig | null)?.qr_image_path;
        if (!path) {
          setQrSignedUrl(null);
          return;
        }

        const { data: signed, error: signedError } = await supabase.storage
          .from("pix_qr_codes")
          .createSignedUrl(path, 60 * 10);

        if (signedError) throw signedError;
        setQrSignedUrl(signed?.signedUrl ?? null);
      } catch (error: any) {
        console.error("[MyPlanCard] Erro ao carregar Pix config", error);
        // não bloqueia a tela
        setPix(null);
        setQrSignedUrl(null);
      }
    };

    void loadPix();
  }, [user]);

  const plan: SubscriptionPlan = billing?.subscription_plan ?? "FREE";

  const expiryLabel = useMemo(() => {
    if (billing?.plan_expires_at) return formatExpiry(billing.plan_expires_at);
    // Para planos pagos sem data definida, mostrar explicitamente (evita parecer bug)
    if (plan !== "FREE") return "Não definida";
    return "—";
  }, [billing?.plan_expires_at, plan]);

  const statusLabel = useMemo(() => {
    if (!lastRequest) return null;
    if (lastRequest.status === "pending") return "Pagamento em análise";
    if (lastRequest.status === "approved") return "Pagamento aprovado";
    return "Pagamento rejeitado";
  }, [lastRequest]);

  const canSubmit =
    !loading &&
    Boolean(receiptFile) &&
    !submitting &&
    (!lastRequest || lastRequest.status !== "pending");

  const handleSubmitRequest = async () => {
    try {
      if (!user) return;
      if (!navigator.onLine) {
        toast({
          title: "Sem conexão",
          description: "Conecte-se à internet para enviar o comprovante.",
          variant: "destructive",
        });
        return;
      }
      if (!receiptFile) {
        toast({ title: "Envie o comprovante", description: "Selecione o arquivo do comprovante." });
        return;
      }

      setSubmitting(true);

      const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const receiptPath = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("payment_receipts")
        .upload(receiptPath, receiptFile, { upsert: true, contentType: receiptFile.type || undefined });

      if (uploadError) throw uploadError;

      const { data: inserted, error: insertError } = await (supabase as any)
        .from("pagamentos")
        .insert({
          user_id: user.id,
          store_id: null,
          provider: "pix",
          desired_plan: desiredPlan,
          receipt_path: receiptPath,
          status: "pending",
          metadata: { filename: receiptFile.name, contentType: receiptFile.type },
        })
        .select("id, status, desired_plan, requested_at, rejection_reason")
        .maybeSingle();

      if (insertError) {
        // best effort: remove o arquivo já enviado
        await supabase.storage.from("payment_receipts").remove([receiptPath]);
        throw insertError;
      }

      setLastRequest((inserted as PagamentoRow) ?? null);
      void loadPlanAndPayments();
      setReceiptFile(null);
      toast({ title: "Solicitação enviada", description: "Recebemos seu comprovante e vamos analisar." });
      setIsOpen(false);
      if (modalStorageKey) {
        await clearPixUpgradeModalState(modalStorageKey);
      }
    } catch (error: any) {
      console.error("[MyPlanCard] Falha ao enviar solicitação", error);
      toast({
        title: "Erro ao enviar comprovante",
        description: error?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border border-accent/40 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CreditCard className="h-4 w-4 text-primary" />
          Meu plano
        </CardTitle>
        <CardDescription className="text-[11px] text-muted-foreground">
          Gerencie seu plano e envie comprovante via Pix.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">Plano atual</p>
            <div className="flex items-center gap-2">
              <Badge variant={PLAN_BADGE_VARIANT[plan]}>{PLAN_LABEL[plan]}</Badge>
              {plan === "ELITE" && <Crown className="h-4 w-4 text-primary" />}
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Validade</p>
            <p className="text-sm font-semibold text-foreground">{expiryLabel}</p>
          </div>
        </div>

        {statusLabel && (
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <p className="text-xs text-foreground">{statusLabel}</p>
            {lastRequest?.status === "rejected" && lastRequest.rejection_reason && (
              <p className="mt-1 text-[11px] text-muted-foreground">Motivo: {lastRequest.rejection_reason}</p>
            )}
          </div>
        )}

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              type="button"
              className="w-full"
              variant="secondary"
              disabled={loading || plan === "ELITE"}
            >
              {lastRequest?.status === "pending" ? "Aguardando análise" : "Solicitar upgrade"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upgrade via Pix</DialogTitle>
              <DialogDescription>
                Selecione o plano desejado, faça o Pix e envie o comprovante para análise.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={desiredPlan} onValueChange={(v) => setDesiredPlan(v as SubscriptionPlan)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADVANCE">Advance</SelectItem>
                    <SelectItem value="ELITE">Elite</SelectItem>
                  </SelectContent>
                </Select>
                {planPricesByPlan.has(desiredPlan) && (
                  <p className="text-xs text-foreground">
                    Preço: <span className="font-semibold">{formatBRLFromCents(planPricesByPlan.get(desiredPlan) ?? 0)}</span>
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">Após aprovação, a validade do plano será aplicada.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <Label>Dados para pagamento</Label>
                </div>

                {pix?.pix_key ? (
                  <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Chave Pix</p>
                    <div className="relative mt-1">
                      <Input
                        readOnly
                        value={pix.pix_key}
                        aria-label="Chave Pix"
                        className="pr-10 font-semibold"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyPixKey}
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copiar chave Pix</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Chave Pix ainda não configurada.</p>
                )}

                {qrSignedUrl ? (
                  <div className="rounded-md border border-border/60 bg-card/60 p-3">
                    <p className="mb-2 text-[11px] text-muted-foreground">QR Code</p>
                    <img
                      src={qrSignedUrl}
                      alt="QR Code Pix para pagamento"
                      className="mx-auto h-40 w-40 rounded-md border border-border/60 bg-background object-contain"
                      loading="lazy"
                    />
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      O QR Code expira após alguns minutos (por segurança). Se necessário, feche e abra novamente.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">QR Code não disponível.</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  <Label htmlFor="receipt">Comprovante</Label>
                </div>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
                {receiptFile?.name ? (
                  <p className="text-[11px] text-muted-foreground">Arquivo selecionado: {receiptFile.name}</p>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  Envie print/foto do comprovante (ou PDF). O arquivo fica privado.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSubmitRequest} disabled={!canSubmit} loading={submitting}>
                Enviar para análise
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <section aria-label="Histórico de pagamentos" className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Histórico de pagamentos</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => void loadPlanAndPayments()}>
              Atualizar
            </Button>
          </div>

          {paymentHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma solicitação encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{formatExpiry(p.requested_at)}</TableCell>
                    <TableCell>{PLAN_LABEL[p.desired_plan]}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.status}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.status === "rejected" ? p.rejection_reason ?? "—" : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
