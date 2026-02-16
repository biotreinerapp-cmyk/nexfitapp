import { useCallback, useEffect, useState } from "react";
import { Copy, CreditCard, Crown, Upload, QrCode, CheckCircle2, Package, TrendingUp, Sparkles, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { buildPixPayload } from "@/lib/pix";
import * as QRCodeLib from "qrcode";

type StoreBillingInfo = {
    id: string;
    nome: string;
    subscription_plan: string;
    plan_expires_at: string | null;
};

type PixConfig = {
    pix_key: string | null;
    receiver_name: string | null;
};

type PagamentoRow = {
    id: string;
    status: "pending" | "approved" | "rejected";
    desired_plan: string;
    requested_at: string;
    rejection_reason: string | null;
};

const PLAN_PRICE_CENTS = 3990; // R$ 39,90

export default function LojaPlanoPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<StoreBillingInfo | null>(null);
    const [pix, setPix] = useState<PixConfig | null>(null);
    const [lastRequest, setLastRequest] = useState<PagamentoRow | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Dynamic QR code
    const [pixPayload, setPixPayload] = useState<string | null>(null);
    const [pixQrDataUrl, setPixQrDataUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        document.title = "Meu Plano - Nexfit Lojista";
    }, []);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: storeData } = await (supabase as any)
                .from("marketplace_stores")
                .select("id, nome, subscription_plan, plan_expires_at")
                .eq("owner_user_id", user.id)
                .maybeSingle();

            if (storeData) {
                setStore(storeData as StoreBillingInfo);

                const { data: payments } = await (supabase as any)
                    .from("pagamentos")
                    .select("id, status, desired_plan, requested_at, rejection_reason")
                    .eq("store_id", storeData.id)
                    .order("requested_at", { ascending: false });

                const rows = (payments as PagamentoRow[] | null) ?? [];
                setLastRequest(rows[0] ?? null);
            }

            const { data: pixData } = await (supabase as any)
                .from("pix_configs")
                .select("pix_key, receiver_name")
                .is("marketplace_store_id", null)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            setPix(pixData as PixConfig ?? null);
        } catch (error) {
            console.error("Erro ao carregar dados do plano:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { void loadData(); }, [loadData]);

    useEffect(() => {
        if (!pix?.pix_key || !isOpen) {
            setPixPayload(null);
            setPixQrDataUrl(null);
            return;
        }

        const payload = buildPixPayload({
            pixKey: pix.pix_key,
            receiverName: pix.receiver_name || "NEXFIT",
            amount: PLAN_PRICE_CENTS / 100,
            description: `Upgrade Nexfit Lojista PRO`,
            city: "BRASIL",
        });

        setPixPayload(payload);
        QRCodeLib.toDataURL(payload, { width: 256 }).then(setPixQrDataUrl).catch(() => setPixQrDataUrl(null));
    }, [pix, isOpen]);

    const handleCopyPix = useCallback(async () => {
        if (!pixPayload) return;
        try {
            await navigator.clipboard.writeText(pixPayload);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ title: "Código Pix copiado!" });
        } catch {
            toast({ title: "Erro ao copiar", variant: "destructive" });
        }
    }, [pixPayload, toast]);

    const handleSubmitRequest = async () => {
        if (!user || !store || !receiptFile) return;
        setSubmitting(true);
        try {
            const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
            const path = `lojistas/${store.id}/${Date.now()}-${safeName}`;

            const { error: uploadError } = await supabase.storage
                .from("payment_receipts")
                .upload(path, receiptFile);

            if (uploadError) throw uploadError;

            const { error: insertError } = await (supabase as any)
                .from("pagamentos")
                .insert({
                    user_id: user.id,
                    store_id: store.id,
                    provider: "pix",
                    desired_plan: "PRO",
                    receipt_path: path,
                    status: "pending",
                    metadata: { filename: receiptFile.name, pix_payload: pixPayload },
                });

            if (insertError) throw insertError;

            toast({ title: "Comprovante enviado!", description: "Analisaremos seu pagamento em breve." });
            setIsOpen(false);
            void loadData();
        } catch (error: any) {
            toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const isPro = store?.subscription_plan === "PRO";

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black px-4 pb-28 pt-8 safe-bottom-floating-nav relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

            <header className="mb-6 relative z-10">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">Assinatura</p>
                <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white leading-none">Meu Plano</h1>
            </header>

            <div className="space-y-6 relative z-10">
                <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                                <CreditCard className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white uppercase tracking-tight">Status do Plano</h2>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isPro ? "bg-primary/20 text-primary border-primary/20" : "bg-zinc-800 text-zinc-400 border-white/5"}`}>
                            {isPro ? "PLANO PRO" : "PLANO FREE"}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Loja</p>
                                <p className="text-sm font-bold text-white truncate">{store?.nome || "Carregando..."}</p>
                            </div>
                            <div className="space-y-1 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Vencimento</p>
                                <p className="text-sm font-bold text-white">
                                    {store?.plan_expires_at
                                        ? new Date(store.plan_expires_at).toLocaleDateString("pt-BR")
                                        : "Ilimitado (Free)"}
                                </p>
                            </div>
                        </div>

                        {lastRequest?.status === "pending" && (
                            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                <p className="text-xs font-bold text-primary uppercase tracking-wide">
                                    Upgrade para PRO em análise
                                </p>
                            </div>
                        )}

                        {!isPro && lastRequest?.status !== "pending" && (
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-[11px] hover:bg-primary/90 shadow-[0_0_20px_rgba(86,255,2,0.2)] hover:shadow-[0_0_30px_rgba(86,255,2,0.4)] transition-all">
                                        Mudar para o Plano PRO - R$ 39,90
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="border-white/10 bg-black/90 backdrop-blur-xl text-white sm:max-w-md rounded-[32px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">Upgrade Nexfit Lojista PRO</DialogTitle>
                                        <DialogDescription className="text-zinc-400">
                                            Libere Controle de Estoque Avançado, Relatórios Financeiros e Recuperação de Carrinhos.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4 text-sm text-zinc-300">
                                        <div className="rounded-2xl bg-white/5 p-4 space-y-3 border border-white/10">
                                            <div className="flex items-center justify-between font-bold text-white">
                                                <span className="uppercase tracking-wide text-xs">Assinatura Mensal</span>
                                                <span className="text-primary text-base">R$ 39,90</span>
                                            </div>
                                            <div className="space-y-2 text-xs text-zinc-400">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                                    <span>Controle de Estoque Avançado</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                                    <span>Relatórios Financeiros Consolidados</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                                    <span>Recuperação de Carrinhos Abandonados</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                                    <span>Suporte Prioritário</span>
                                                </div>
                                            </div>
                                        </div>

                                        {pixQrDataUrl && (
                                            <div className="text-center space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                                <Label className="uppercase tracking-widest text-[10px] text-zinc-500">Pague via PIX</Label>
                                                <div className="mx-auto h-40 w-40 rounded-xl bg-white p-2">
                                                    <img src={pixQrDataUrl} alt="QR Code" className="h-full w-full" />
                                                </div>
                                                <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl h-10 border-white/10 bg-white/5 hover:bg-white/10 text-white" onClick={handleCopyPix}>
                                                    {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                                                    Copiar Código PIX
                                                </Button>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="receipt" className="uppercase tracking-widest text-[10px] text-zinc-500">Anexar Comprovante</Label>
                                            <div className="relative">
                                                <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                                <Input
                                                    id="receipt"
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="h-12 pl-10 rounded-xl border-white/10 bg-white/5 file:text-white text-zinc-300"
                                                    onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" className="rounded-xl h-12 text-zinc-400 hover:text-white" onClick={() => setIsOpen(false)}>Cancelar</Button>
                                        <Button className="rounded-xl h-12 bg-primary text-black font-bold uppercase tracking-widest hover:bg-primary/90" onClick={handleSubmitRequest} disabled={!receiptFile || submitting}>
                                            {submitting ? "Enviando..." : "Confirmar Pagamento"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {/* Benefits Cards */}
                <div className="grid gap-3">
                    <div className={`relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] ${!isPro ? 'opacity-80' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                                <Package className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white">Estoque Avançado</p>
                                <p className="text-xs text-zinc-400">Alertas de reposição e histórico completo.</p>
                            </div>
                            {!isPro && <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center"><Crown className="h-4 w-4 text-primary" /></div>}
                        </div>
                    </div>

                    <div className={`relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] ${!isPro ? 'opacity-80' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white">Relatórios Consolidados</p>
                                <p className="text-xs text-zinc-400">Análise de vendas e margem de lucro.</p>
                            </div>
                            {!isPro && <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center"><Crown className="h-4 w-4 text-primary" /></div>}
                        </div>
                    </div>

                    <div className={`relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] ${!isPro ? 'opacity-80' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                                <ShoppingBag className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white">Recuperação de Carrinhos</p>
                                <p className="text-xs text-zinc-400">Recupere vendas perdidas com um clique.</p>
                            </div>
                            {!isPro && <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center"><Crown className="h-4 w-4 text-primary" /></div>}
                        </div>
                    </div>
                </div>
            </div>

            <LojaFloatingNavIsland />
        </main>
    );
}
