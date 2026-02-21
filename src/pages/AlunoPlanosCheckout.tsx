import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { PLAN_LABEL, type SubscriptionPlan } from "@/lib/subscriptionPlans";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, Zap } from "lucide-react";

const AlunoPlanosCheckout = () => {
    const { planType } = useParams<{ planType: string }>();
    const { user } = useAuth();
    const { toast } = useToast();

    const desiredPlan = (planType?.toUpperCase() as SubscriptionPlan) || "ADVANCE";

    const { data: planConfig, isLoading: isLoadingConfig } = useQuery({
        queryKey: ["admin", "plan-configs-basic", desiredPlan],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("app_access_plans")
                .select("price_cents, checkout_link")
                .ilike("name", `%${desiredPlan}%`)
                .eq("user_type", "ALUNO")
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        staleTime: 0,
        gcTime: 0,
    });

    const handleConfirmOrder = () => {
        if (!planConfig?.checkout_link) {
            toast({
                title: "Erro de Configuração",
                description: "O link de checkout para este plano ainda não foi configurado pela administração.",
                variant: "destructive"
            });
            return;
        }

        // Add user info as query params if needed by Perfect Pay (optional but helpful)
        const checkoutUrl = new URL(planConfig.checkout_link);
        if (user?.email) checkoutUrl.searchParams.append("email", user.email);
        if (user?.user_metadata?.full_name) checkoutUrl.searchParams.append("name", user.user_metadata.full_name);

        window.open(checkoutUrl.toString(), '_blank');

        toast({
            title: "Redirecionando...",
            description: "Você está sendo levado para o checkout seguro da Perfect Pay."
        });
    };

    if (isLoadingConfig) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-background px-4 pb-32 pt-6">
            {/* Premium Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
                <div className="absolute -top-[40%] -left-[20%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-3xl filter" />
                <div className="absolute top-[20%] -right-[20%] h-[600px] w-[600px] rounded-full bg-accent/10 blur-3xl filter" />
                <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <div className="relative z-10">
                <header className="mb-8 flex items-center gap-3">
                    <BackIconButton to="/aluno/planos" />
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-bold">Checkout</p>
                        <h1 className="text-2xl font-black italic text-foreground tracking-tighter uppercase">
                            CONFIRMAR <span className="text-primary">UPGRADE</span>
                        </h1>
                    </div>
                </header>

                <div className="grid gap-6 lg:grid-cols-2 lg:max-w-5xl lg:mx-auto">
                    <Card className="border-white/5 bg-black/40 backdrop-blur-2xl shadow-xl">
                        <CardHeader className="border-b border-white/5 pb-6">
                            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                <Zap className="h-4 w-4" /> Resumo do Plano
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                                <div>
                                    <p className="text-2xl font-black italic text-foreground uppercase tracking-tight">{PLAN_LABEL[desiredPlan]}</p>
                                    <div className="mt-1">
                                        <span className="bg-primary/20 text-primary uppercase text-[9px] font-black px-2 py-0.5 rounded-sm">1º MÊS PROMOCIONAL</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-primary tracking-tighter drop-shadow-lg">
                                        R$ {desiredPlan === "ADVANCE" ? "9,90" : "19,90"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">
                                        Depois R$ {((planConfig?.price_cents ?? 0) / 100).toFixed(2).replace('.', ',')} / mês
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">VOCÊ VAI RECEBER:</p>
                                <ul className="space-y-3">
                                    {desiredPlan === 'ELITE' ? (
                                        <>
                                            <li className="flex items-center gap-3 text-sm font-bold italic text-foreground bg-accent/5 p-2 rounded-lg border border-accent/10">
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                </div>
                                                Acesso Total + Telemedicina VIP
                                            </li>
                                            <li className="flex items-center gap-3 text-xs font-medium text-muted-foreground px-2">
                                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10">
                                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                                </div>
                                                Nutricionista & Personal Dedicados
                                            </li>
                                        </>
                                    ) : (
                                        <>
                                            <li className="flex items-center gap-3 text-sm font-bold italic text-foreground bg-primary/5 p-2 rounded-lg border border-primary/10">
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                </div>
                                                IA de Treino & Nutrição 24/7
                                            </li>
                                            <li className="flex items-center gap-3 text-xs font-medium text-muted-foreground px-2">
                                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10">
                                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                                </div>
                                                Acesso VIP ao Marketplace
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-card/60 backdrop-blur-3xl ring-1 ring-primary/10 shadow-2xl">
                        <CardHeader className="text-center pb-2 border-b border-white/5">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                                <ShieldCheck className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-lg font-black italic text-foreground uppercase tracking-widest">Pagamento Seguro</CardTitle>
                            <CardDescription className="text-xs font-medium">Contratação via Perfect Pay</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 pt-6 text-center">
                            <div className="space-y-4">
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 ring-1 ring-primary/10">
                                    <Zap className="mx-auto h-10 w-10 text-primary mb-4 animate-pulse" />
                                    <p className="text-sm text-foreground font-bold leading-relaxed mb-1">
                                        VOCÊ SERÁ REDIRECIONADO
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        A contratação do plano é realizada em um ambiente externo 100% criptografado e seguro.
                                    </p>
                                </div>

                                <Button
                                    variant="premium"
                                    className="w-full py-8 text-xl font-black uppercase tracking-wider shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                    onClick={handleConfirmOrder}
                                >
                                    IR PARA O CHECKOUT
                                    <ExternalLink className="h-6 w-6" />
                                </Button>

                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                                    ATIVAÇÃO IMEDIATA APÓS O PAGAMENTO
                                </p>
                            </div>

                            <div className="pt-4 flex items-center justify-center gap-4 opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3 w-3 text-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter text-white">PIX</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3 w-3 text-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter text-white">Cartão de Crédito</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3 w-3 text-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter text-white">Boleto</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <FloatingNavIsland />
            </div>
        </main>
    );
};

export default AlunoPlanosCheckout;
