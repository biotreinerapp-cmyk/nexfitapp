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
import { subscribeToPaymentStatus } from "@/lib/mercadoPagoService";

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
                    .select("id, name, price_cents")
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
        return subscribeToPaymentStatus(pixData.paymentId, (status) => {
            if (status === 'paid' || status === 'approved') {
                setPaymentStatus('paid');
                toast({ title: "Pagamento Confirmado!", description: "Seu plano foi ativado!" });
                setTimeout(() => { setIsOpen(false); void loadData(); }, 2500);
            }
        });
    }, [pixData?.paymentId, toast, loadData]);

    const handleInitiateUpgrade = async (method: "pix" | "card" = "pix") => {
        if (!user || !store) return;

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

            console.log(`[LojaPlano] Criando pagamento ${method} via Mercado Pago...`);
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

            <header className="mb-8 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">Assinatura Nexfit</p>
                <h1 className="mt-1 text-3xl font-black italic uppercase tracking-tighter text-white leading-none">Minha Loja</h1>
            </header>

            <div className="space-y-6 relative z-10">
                <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-black/40 p-8 backdrop-blur-2xl transition-all duration-300 hover:border-primary/30">
                    <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/10 to-transparent opacity-50" />

                    <div className="relative z-10 mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/20 shadow-lg">
                                <CreditCard className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black italic uppercase tracking-tighter text-white leading-none">Status de Assinatura</h2>
                                <p className="mt-1 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Controle sua loja NEXFIT</p>
                            </div>
                        </div>
                        <Badge variant="outline" className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-primary/20 ${isPro ? "bg-primary text-black" : "bg-zinc-900 text-zinc-400"}`}>
                            {isPro ? planDisplayName : "PLANO FREE"}
                        </Badge>
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 p-4 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">Estabelecimento</p>
                                <p className="text-sm font-bold text-white truncate uppercase tracking-tight">{store?.nome || "Carregando..."}</p>
                            </div>
                            <div className="space-y-1.5 p-4 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">Vencimento</p>
                                <p className="text-sm font-bold text-white tracking-tight">
                                    {store?.plan_expires_at
                                        ? new Date(store.plan_expires_at).toLocaleDateString("pt-BR")
                                        : "ILIMITADO"}
                                </p>
                            </div>
                        </div>

                        {!isPro && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center mb-2">Selecione o Método de Pagamento</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={() => handleInitiateUpgrade("pix")}
                                        disabled={verifying}
                                        className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all gap-2"
                                    >
                                        {verifying && paymentMethod === "pix" ? <Loader2 className="animate-spin h-5 w-5" /> : <QrCode className="h-5 w-5" />}
                                        PIX
                                    </Button>
                                    <Button
                                        onClick={() => handleInitiateUpgrade("card")}
                                        disabled={verifying}
                                        className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all gap-2"
                                    >
                                        {verifying && paymentMethod === "card" ? <Loader2 className="animate-spin h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                                        Cartão
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>



                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="!grid-cols-1 !gap-0 !p-0 border-white/10 bg-[#0a0a0a] text-white sm:max-w-md w-[95%] rounded-[32px] shadow-2xl ring-1 ring-white/10">
                        <div className="flex flex-col items-center space-y-6 w-full p-8">
                            {paymentStatus === "paid" ? (
                                <>
                                    <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                                        <CheckCircle2 className="h-12 w-12 text-primary" />
                                    </div>
                                    <div className="space-y-2 text-center">
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Upgrade Confirmado!</h2>
                                        <p className="text-zinc-400 text-sm leading-relaxed">
                                            Parabéns! Sua loja agora tem acesso a todos os recursos PRO. Aproveite!
                                        </p>
                                    </div>
                                    <Button onClick={() => setIsOpen(false)} className="w-full h-12 bg-primary text-black font-black uppercase tracking-wider rounded-2xl">Acessar Recursos PRO</Button>
                                </>
                            ) : (
                                <>
                                    <div className="text-center space-y-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <Sparkles className="h-5 w-5 text-primary" />
                                            <h2 className="text-xl font-black uppercase tracking-tight text-white">Upgrade Nexfit PRO</h2>
                                        </div>
                                        <p className="text-zinc-400 text-xs font-medium">
                                            {paymentMethod === "pix"
                                                ? "Escaneie o QR Code abaixo para ativar seu plano instantaneamente."
                                                : "Finalize seu pagamento através do Mercado Pago seguro."}
                                        </p>
                                    </div>

                                    {paymentMethod === "pix" ? (
                                        <>
                                            {/* QR Code Container */}
                                            <div className="w-48 h-48 rounded-2xl bg-white p-3 shadow-xl flex items-center justify-center">
                                                {pixData?.pixQrCode ? (
                                                    <img
                                                        src={pixData.pixQrCode}
                                                        alt="QR Code"
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Loader2 className="h-8 w-8 animate-spin text-black" />
                                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Gerando código...</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* PIX Copy & Paste */}
                                            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Pix Copia e Cola</p>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-[11px] text-zinc-400 truncate flex-1 font-mono tracking-tight">
                                                        {pixData?.pixPayload || "Carregando payload..."}
                                                    </p>
                                                    <Button size="icon" variant="ghost" className="h-10 w-10 text-primary hover:bg-primary/10 shrink-0" onClick={handleCopyPix}>
                                                        <Copy className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full space-y-4 py-8">
                                            <div className="flex justify-center">
                                                <div className="p-6 rounded-full bg-primary/10 ring-1 ring-primary/20">
                                                    <CreditCard className="h-12 w-12 text-primary" />
                                                </div>
                                            </div>
                                            <p className="text-center text-sm text-zinc-400">
                                                O pagamento será processado em ambiente seguro do Mercado Pago.
                                            </p>
                                            <Button
                                                className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
                                                onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
                                            >
                                                Ir para Pagamento Seguro
                                            </Button>
                                        </div>
                                    )}

                                    {/* Payment Check Button */}
                                    <Button
                                        onClick={handleCheckPayment}
                                        disabled={verifying}
                                        className="w-full h-14 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-white/10"
                                    >
                                        {verifying ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : <QrCode className="h-5 w-5 mr-3" />}
                                        Já realizei o pagamento
                                    </Button>

                                    {/* Auto-activation notice */}
                                    <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.03] border border-white/5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                            Ativação automática após confirmação
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

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
