import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, CreditCard, QrCode, Upload, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { buildPixPayload } from "@/lib/pix";
import { PLAN_LABEL, type SubscriptionPlan } from "@/lib/subscriptionPlans";
import * as QRCodeLib from "qrcode";

const AlunoPlanosCheckout = () => {
    const { planType } = useParams<{ planType: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const desiredPlan = (planType?.toUpperCase() as SubscriptionPlan) || "ADVANCE";
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [pixPayload, setPixPayload] = useState<string | null>(null);
    const [pixQrDataUrl, setPixQrDataUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const { data: planConfig, refetch: refetchPlan } = useQuery({
        queryKey: ["admin", "plan-configs-basic", desiredPlan],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("plan_configs")
                .select("price_cents")
                .eq("plan", desiredPlan)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        staleTime: 0,
        gcTime: 0,
    });

    // Load admin PIX config - aligned with GeneralSettingsPixPanel.tsx
    const { data: pixConfig } = useQuery({
        queryKey: ["admin", "pix-config"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("pix_configs")
                .select("pix_key, receiver_name")
                .is("store_id", null)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        staleTime: 0,
        gcTime: 0,
    });

    // Generate PIX
    useEffect(() => {
        if (!pixConfig?.pix_key || !planConfig?.price_cents) return;

        const amount = planConfig.price_cents / 100;
        const payload = buildPixPayload({
            pixKey: pixConfig.pix_key,
            receiverName: pixConfig.receiver_name || "NEXFIT",
            amount,
            description: `Assinatura ${PLAN_LABEL[desiredPlan]}`,
            city: "BRASIL",
        });

        setPixPayload(payload);
        QRCodeLib.toDataURL(payload, { width: 512 }).then(setPixQrDataUrl).catch(() => { });
    }, [pixConfig, planConfig, desiredPlan]);

    const handleCopyPix = async () => {
        if (!pixPayload) return;
        await navigator.clipboard.writeText(pixPayload);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Código Pix copiado!" });
    };

    const handleConfirmOrder = async () => {
        if (!user || !receiptFile) return;
        setSubmitting(true);

        try {
            const receiptPath = `${user.id}/${Date.now()}-${receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
            const { error: uploadError } = await supabase.storage
                .from("payment_receipts")
                .upload(receiptPath, receiptFile);

            if (uploadError) throw uploadError;

            const { error: insertError } = await supabase.from("pagamentos").insert({
                user_id: user.id,
                desired_plan: desiredPlan,
                receipt_path: receiptPath,
                status: "pending",
                provider: "pix",
                metadata: { pix_payload: pixPayload }
            });

            if (insertError) throw insertError;

            toast({
                title: "Solicitação Enviada!",
                description: "Analisaremos seu comprovante em instantes."
            });
            navigate("/aluno/dashboard");
        } catch (error: any) {
            toast({ title: "Erro ao confirmar", description: error.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="safe-bottom-main min-h-screen bg-background px-4 pb-24 pt-6">
            <header className="mb-6 flex items-center gap-3">
                <BackIconButton to="/aluno/planos" />
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Checkout</p>
                    <h1 className="text-xl font-black italic text-foreground tracking-tight">CONFIRMAR UPGRADE</h1>
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-2 lg:max-w-5xl lg:mx-auto">
                <Card className="border-border/50 bg-card/40 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Resumo do Plano</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border/20 pb-4">
                            <div>
                                <p className="text-2xl font-black italic text-foreground uppercase">{PLAN_LABEL[desiredPlan]}</p>
                                <p className="text-xs text-muted-foreground">Cobrança Mensal</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-primary">
                                    R$ {((planConfig?.price_cents ?? 0) / 100).toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">O que você ganha:</p>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                    Acesso completo aos recursos do plano
                                </li>
                                <li className="flex items-center gap-2 text-xs font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                    Atualização imediata após validação
                                </li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/30 bg-card/60 backdrop-blur-2xl ring-1 ring-primary/20">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <QrCode className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg font-black italic text-foreground uppercase tracking-widest">Pagamento via Pix</CardTitle>
                        <CardDescription className="text-xs">Escaneie o código abaixo no app do seu banco</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="relative mx-auto max-w-[200px] overflow-hidden rounded-2xl bg-white p-3 shadow-2xl shadow-primary/20">
                            {pixQrDataUrl ? (
                                <img src={pixQrDataUrl} alt="QR Code Pix" className="h-full w-full" />
                            ) : (
                                <div className="flex aspect-square items-center justify-center text-[10px] text-black">Gerando QR...</div>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            className="w-full border-primary/20 bg-primary/5 font-bold hover:bg-primary/10"
                            onClick={handleCopyPix}
                        >
                            {copied ? <CheckCircle2 className="mr-2 h-4 w-4 text-primary" /> : <Copy className="mr-2 h-4 w-4" />}
                            {copied ? "Copiado!" : "Copiar Código Pix"}
                        </Button>

                        <div className="space-y-3 pt-4 border-t border-border/20">
                            <Label htmlFor="receipt" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Anexar Comprovante
                            </Label>
                            <div className="relative group">
                                <Input
                                    id="receipt"
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                    className="cursor-pointer file:hidden bg-background/40 border-border/40 text-xs py-5"
                                />
                                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center gap-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                    <Upload className="h-4 w-4" />
                                    <span>Escolher ficheiro</span>
                                </div>
                            </div>
                            {receiptFile && (
                                <p className="text-[10px] font-bold text-primary animate-pulse">✓ {receiptFile.name}</p>
                            )}
                        </div>

                        <Button
                            variant="premium"
                            className="w-full py-6 text-base shadow-primary/20"
                            disabled={submitting || !receiptFile}
                            onClick={handleConfirmOrder}
                        >
                            <Zap className="mr-2 h-5 w-5 fill-current" />
                            Confirmar Compra
                        </Button>

                        <div className="pt-2 text-center">
                            <button
                                onClick={() => {
                                    prompt("Código Pix (Cópia e Cola):", pixPayload || "");
                                }}
                                className="text-[9px] uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors underline"
                            >
                                Problemas com o QR? Ver código bruto
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <FloatingNavIsland />
        </main>
    );
};

export default AlunoPlanosCheckout;
