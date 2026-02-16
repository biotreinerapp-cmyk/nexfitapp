import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, Rocket, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_LABEL, type SubscriptionPlan } from "@/lib/subscriptionPlans";

const AlunoPlanosLP = () => {
    const navigate = useNavigate();

    // Fetch prices from database - synced with Admin config keys
    const { data: planConfigs = [] } = useQuery({
        queryKey: ["admin", "plan-configs-basic"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("plan_configs")
                .select("plan, price_cents");
            if (error) throw error;
            return data || [];
        },
        staleTime: 0,
    });

    const formatPrice = (cents: number) => {
        return (cents / 100).toFixed(2).replace(".", ",");
    };

    const getPriceForPlan = (plan: string) => {
        const config = planConfigs.find(c => c.plan === plan);
        return config ? formatPrice(config.price_cents) : (plan === "ADVANCE" ? "19,90" : "39,90");
    };

    const plans = [
        {
            type: "ADVANCE",
            title: "Advance",
            subtitle: "Performance e Nutrição",
            price: getPriceForPlan("ADVANCE"),
            description: "Ideal para quem quer levar o treino e a alimentação para outro nível.",
            features: [
                "Acesso ao Marketplace",
                "Nutricionista Virtual (IA)",
                "Relatórios de Progresso",
                "Insights IA Mensais",
                "Suporte Prioritário",
            ],
            icon: Rocket,
            accent: "primary",
            buttonText: "Quero Esse",
        },
        {
            type: "ELITE",
            title: "Elite",
            subtitle: "O Plano Definitivo",
            price: getPriceForPlan("ELITE"),
            description: "Acesso total e suporte médico especializado para resultados máximos.",
            features: [
                "Tudo do Advance",
                "Telemedicina Liberada",
                "Consultas com Nutricionista",
                "Bio Analytics Pro",
                "Prioridade Máxima",
            ],
            icon: Crown,
            accent: "accent",
            buttonText: "Quero Esse",
            popular: true,
        },
    ];

    return (
        <main className="safe-bottom-main min-h-screen bg-background px-4 pb-24 pt-6">
            <header className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4 flex w-full items-center justify-between">
                    <BackIconButton to="/aluno/dashboard" />
                    <Badge variant="outline" className="border-primary/40 text-primary">NEXFIT PRO</Badge>
                    <div className="w-10 opacity-0"><BackIconButton to="/" /></div>
                </div>
                <h1 className="text-3xl font-black italic tracking-tighter text-foreground sm:text-4xl">
                    EVOLUA SEU <span className="text-primary italic">POTENCIAL</span>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Escolha o plano que mais combina com seu objetivo e desbloqueie recursos exclusivos.
                </p>
            </header>

            <section className="grid gap-6 md:grid-cols-2 lg:max-w-4xl lg:mx-auto">
                {plans.map((plan) => (
                    <Card
                        key={plan.type}
                        className={`relative overflow-hidden border-border/50 bg-card/40 backdrop-blur-xl transition-all hover:border-${plan.accent}/50 ${plan.popular ? `ring-2 ring-${plan.accent}/40` : ""}`}
                    >
                        {plan.popular && (
                            <div className="absolute right-0 top-0 rounded-bl-xl bg-accent px-3 py-1 text-[10px] font-black uppercase text-black">
                                MAIS ESCOLHIDO
                            </div>
                        )}

                        <CardHeader className="pb-4">
                            <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-${plan.accent}/10 text-${plan.accent}`}>
                                <plan.icon className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-2xl font-black italic uppercase tracking-tight text-foreground">
                                {plan.title}
                            </CardTitle>
                            <CardDescription className="text-sm font-medium text-muted-foreground">
                                {plan.subtitle}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-muted-foreground">R$</span>
                                <span className="text-4xl font-black text-foreground">{plan.price}</span>
                                <span className="text-sm font-bold text-muted-foreground">/mês</span>
                            </div>

                            <p className="text-xs leading-relaxed text-muted-foreground">
                                {plan.description}
                            </p>

                            <ul className="space-y-3">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-xs font-semibold text-foreground/90">
                                        <div className={`flex h-4 w-4 items-center justify-center rounded-full bg-${plan.accent}/20 text-${plan.accent}`}>
                                            <Check className="h-3 w-3" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Button
                                variant="premium"
                                className="w-full py-6 text-base"
                                onClick={() => navigate(`/aluno/planos/checkout/${plan.type}`)}
                            >
                                {plan.buttonText}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <section className="mt-12 space-y-6 text-center lg:max-w-2xl lg:mx-auto">
                <div className="flex flex-col items-center gap-2">
                    <ShieldCheck className="h-8 w-8 text-primary/60" />
                    <h3 className="text-lg font-bold text-foreground">Pagamento Seguro & Pix Instantâneo</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Seu upgrade é processado via Pix. Após o pagamento e envio do comprovante, nossa equipe revalida sua conta em minutos.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border/40 bg-card/20 p-4">
                        <Zap className="mx-auto mb-2 h-5 w-5 text-primary" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acesso Rápido</p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-card/20 p-4">
                        <Check className="mx-auto mb-2 h-5 w-5 text-accent" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sem Fidelidade</p>
                    </div>
                </div>
            </section>

            <FloatingNavIsland />
        </main>
    );
};

export default AlunoPlanosLP;
