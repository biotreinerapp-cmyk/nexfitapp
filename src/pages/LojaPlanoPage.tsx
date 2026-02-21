import { useCallback, useEffect, useState } from "react";
import { Copy, CreditCard, Crown, QrCode, CheckCircle2, Package, TrendingUp, ShoppingBag, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { createPixPayment, checkPixPaymentStatus, getUserPixPayments } from "@/lib/pixPaymentTracking";

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

type ActivePlan = {
    id: string;
    name: string;
    price_cents: number;
    checkout_link?: string | null;
};

const DEFAULT_PLAN_PRICE = 39.90; // Fallback if no plan found

export default function LojaPlanoPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<StoreBillingInfo | null>(null);
    const [pixData, setPixData] = useState<any>(null);
    const [activePayment, setActivePayment] = useState<any>(null);
    const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

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

                // Fetch the active LOJISTA plan from admin-created plans
                const { data: plan } = await supabase
                    .from("app_access_plans")
                    .select("id, name, price_cents, checkout_link")
                    .eq("user_type", "LOJISTA")
                    .eq("is_active", true)
                    .order("price_cents", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (plan) {
                    setActivePlan(plan as ActivePlan);
                }

                // Check for existing pending payments
                const payments = await getUserPixPayments(user.id, "store_plan");
                const pending = payments?.find(p => p.status === "pending");
                if (pending) {
                    setActivePayment(pending);
                    // Normalize QR code from DB: may be raw base64 or already a data URL
                    const rawQr = pending.pix_qr_code || '';
                    const qrDataUrl = rawQr
                        ? (rawQr.startsWith('data:') ? rawQr : `data:image/png;base64,${rawQr}`)
                        : '';
                    setPixData({
                        paymentId: pending.id,
                        pixPayload: pending.pix_payload,
                        pixQrCode: qrDataUrl,
                        expiresAt: new Date(pending.expires_at)
                    });
                }
            }
        } catch (error) {
            console.error("Erro ao carregar dados do plano:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { void loadData(); }, [loadData]);

    // Realtime subscription for automatic payment confirmation
    useEffect(() => {
        if (!pixData?.paymentId) return;
        // Status checks are handled by handleCheckPayment and initial loadData.
    }, [pixData?.paymentId, toast, loadData]);

    const handleInitiateUpgrade = async (method: "pix" | "card" = "pix") => {
        if (!user || !store) return;

        // External Link (Perfect Pay or others)
        if (method === "card") {
            if (activePlan?.checkout_link) {
                // Open safe external link directly
                window.open(activePlan.checkout_link, '_blank');
                return;
            } else {
                toast({ title: "Checkout Indisponível", description: "O link de pagamento com cartão ainda não foi configurado.", variant: "destructive" });
                return;
            }
        }

        setPaymentMethod(method);
        console.log(`[LojaPlano] Iniciando upgrade (${method}) para loja:`, store.id);

        // If already have a pending payment of SAME method, just show it
        if (pixData && paymentMethod === method) {
            console.log("[LojaPlano] Pagamento pendente já existe:", pixData.paymentId);
            setIsOpen(true);
            return;
        }

        setVerifying(true);
        try {
            const planPrice = activePlan ? activePlan.price_cents / 100 : DEFAULT_PLAN_PRICE;
            const planName = activePlan?.name || "PRO";

            console.log(`[LojaPlano] Criando pagamento ${method}...`);
            const result = await createPixPayment({
                userId: user.id,
                userEmail: user.email || "lojista@nexfit.com",
                userName: user.user_metadata?.full_name || user.user_metadata?.nome || store.nome || "Lojista Nexfit",
                amount: planPrice,
                paymentType: "store_plan",
                referenceId: store.id,
                description: `Plano ${planName} - ${store.nome}`,
                paymentMethod: method,
            });

            console.log("[LojaPlano] Pagamento criado:", result.paymentId);
            setPixData(result);
            setPaymentUrl(result.paymentUrl || null);
            setIsOpen(true);
        } catch (error: any) {
            console.error(`[LojaPlano] Erro ao gerar ${method}:`, error);
            toast({ title: `Erro ao gerar ${method.toUpperCase()}`, description: error.message, variant: "destructive" });
        } finally {
            setVerifying(false);
        }
    };

    const handleCheckPayment = async () => {
        if (!pixData) return;
        setVerifying(true);
        console.log("[LojaPlano] Verificando status do pagamento:", pixData.paymentId);
        try {
            const status = await checkPixPaymentStatus(pixData.paymentId);
            console.log("[LojaPlano] Status retornado:", status);
            if (status === "paid") {
                setPaymentStatus("paid");
                toast({ title: "Pagamento confirmado!", description: "Sua loja agora é PRO!" });
                setTimeout(() => {
                    setIsOpen(false);
                    void loadData();
                }, 3000);
            } else if (status === "expired") {
                setPaymentStatus("expired");
                setPixData(null); // Allow regenerate
                toast({ title: "Pagamento expirado", description: "O código PIX expirou. Gere um novo." });
            } else {
                toast({ title: "Aguardando pagamento...", description: "O sistema ainda não identificou seu PIX." });
            }
        } catch (error) {
            console.error("[LojaPlano] Erro ao verificar pagamento:", error);
        } finally {
            setVerifying(false);
        }
    };

    const handleCopyPix = useCallback(async () => {
        if (!pixData?.pixPayload) return;
        try {
            await navigator.clipboard.writeText(pixData.pixPayload);
            toast({ title: "Código Pix copiado!" });
        } catch {
            toast({ title: "Erro ao copiar", variant: "destructive" });
        }
    }, [pixData, toast]);

    const isPro = !!(store?.subscription_plan && store.subscription_plan !== "FREE" && store.subscription_plan !== "");
    const planPrice = activePlan ? activePlan.price_cents / 100 : DEFAULT_PLAN_PRICE;
    const planDisplayName = activePlan?.name?.toUpperCase() || "PRO";

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black px-4 pb-28 pt-8 safe-bottom-floating-nav relative overflow-hidden">
            {/* Premium Background Decoration */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
            </div>

            <header className="mb-6 relative z-10 text-center mt-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/20 ring-1 ring-primary/30 shadow-[0_0_30px_rgba(86,255,2,0.3)] mb-4">
                    <Crown className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-[1.1]">
                    NEXFIT <span className="text-primary">INTERPRISE</span>
                </h1>
                <p className="mt-3 text-sm font-medium text-zinc-400 max-w-[280px] mx-auto leading-relaxed">
                    Desbloqueie o potencial máximo da sua loja. Venda mais, controle tudo.
                </p>
            </header>

            <div className="space-y-6 relative z-10">
                {/* PRO Status Card if already subscribed */}
                {isPro && (
                    <div className="relative overflow-hidden rounded-[2.5rem] border border-primary/30 bg-primary/10 p-8 text-center backdrop-blur-md">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 mb-4">
                            <CheckCircle2 className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-xl font-black uppercase text-white tracking-tight mb-2">Assinatura Ativa</h2>
                        <p className="text-sm text-zinc-300">Sua loja já possui todos os recursos liberados.</p>
                        <div className="mt-6 flex justify-center gap-4 text-xs font-bold text-primary uppercase">
                            <span>Vencimento: {store?.plan_expires_at ? new Date(store.plan_expires_at).toLocaleDateString("pt-BR") : "ILIMITADO"}</span>
                        </div>
                    </div>
                )}

                {/* Main Pitch Card for Free Users */}
                {!isPro && (
                    <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 p-8 backdrop-blur-2xl transition-all duration-300">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                        <div className="text-center mb-6">
                            <p className="text-4xl font-black text-white tracking-tighter">
                                R$ {planPrice.toFixed(2).replace(".", ",")}
                                <span className="text-sm text-zinc-500 font-medium">/mês</span>
                            </p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center mb-4">O que você ganha</p>

                            <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                                    <ShoppingBag className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Carrinhos Abandonados</p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">Chame clientes no WhatsApp e recupere vendas perdidas.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Estoque Ilimitado</p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">Cadastre quantos produtos quiser, sem a trava de 10 itens.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Vitrine Completa</p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">Mostre todos os seus produtos para os alunos, sem limite de exibição.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Relatórios Financeiros</p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">Exporte relatórios e tenha controle total do seu faturamento.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={() => handleInitiateUpgrade("pix")}
                                disabled={verifying}
                                className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-[11px] hover:bg-primary/90 shadow-[0_0_20px_rgba(86,255,2,0.2)] transition-all"
                            >
                                {verifying && paymentMethod === "pix" ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <QrCode className="h-5 w-5 mr-2" />}
                                Assinar via PIX (Liberação Imediata)
                            </Button>
                            <Button
                                onClick={() => handleInitiateUpgrade("card")}
                                disabled={verifying}
                                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all gap-2"
                            >
                                {verifying && paymentMethod === "card" ? <Loader2 className="animate-spin h-5 w-5" /> : <CreditCard className="h-5 w-5 text-zinc-400" />}
                                Assinar com Cartão
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <LojaFloatingNavIsland />
        </main>
    );
}
