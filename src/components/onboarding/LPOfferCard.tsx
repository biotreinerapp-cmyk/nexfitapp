import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Zap, TrendingUp, Users, Loader2, CheckCircle2, CreditCard, QrCode } from "lucide-react";
import { createPixPayment } from "@/lib/pixPaymentTracking";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LPOfferCardProps {
    userType: "store" | "professional";
    userId: string;
    onSkip: () => void;
    onPurchaseComplete: () => void;
}

export function LPOfferCard({ userType, userId, onSkip, onPurchaseComplete }: LPOfferCardProps) {
    const { toast } = useToast();
    const [showPayment, setShowPayment] = useState(false);
    const [pixData, setPixData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "expired">("pending");
    const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

    const isStore = userType === "store";

    const content = {
        store: {
            headline: "Aumente suas vendas com uma Landing Page Profissional!",
            subheadline: "Crie sua página de vendas em minutos com IA",
            benefits: [
                "Landing page gerada por IA",
                "Design profissional e responsivo",
                "Integração com catálogo de produtos",
                "Otimizada para conversão",
            ],
        },
        professional: {
            headline: "Atraia Mais Clientes com sua Landing Page Profissional!",
            subheadline: "Destaque-se da concorrência com uma página personalizada",
            benefits: [
                "Landing page gerada por IA",
                "Apresentação profissional",
                "Formulário de contratação integrado",
                "Aumente sua visibilidade",
            ],
        },
    };

    const currentContent = content[userType];

    const handlePurchase = async (method: "pix" | "card" = "pix") => {
        setLoading(true);
        setPaymentMethod(method);
        try {
            const referenceId = userId;

            const result = await createPixPayment({
                userId,
                amount: 89.9,
                paymentType: "lp_unlock",
                referenceId,
                paymentMethod: method,
            });

            setPixData(result);
            setPaymentUrl(result.paymentUrl || null);
            setShowPayment(true);
        } catch (error: any) {
            console.error("Payment error:", error);
            toast({
                title: "Erro ao gerar pagamento",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!pixData?.paymentId || !showPayment) return;
        // Status checks are handled manually or by other mechanisms.
    }, [pixData?.paymentId, showPayment]);

    const handlePaymentConfirmed = async () => {
        try {
            const tableName = isStore ? "lojas" : "professionals";

            // @ts-ignore - Dynamic table name
            const { error } = await supabase
                .from(tableName as any)
                .update({ lp_unlocked: true } as any)
                .eq("id", userId);

            if (error) throw error;

            toast({
                title: "Pagamento confirmado!",
                description: "Sua Landing Page foi desbloqueada com sucesso!",
            });

            onPurchaseComplete();
        } catch (error: any) {
            console.error("Update error:", error);
            toast({
                title: "Erro ao desbloquear LP",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    if (showPayment && pixData) {
        return (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-green-600/10">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-white">Pagamento PIX</CardTitle>
                    <CardDescription className="text-white/60">
                        Escaneie o QR Code ou copie o código PIX
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {paymentStatus === "paid" ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="flex justify-center">
                                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-10 w-10 text-primary" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white">Pagamento Confirmado!</h3>
                            <p className="text-sm text-white/70">Sua Landing Page foi desbloqueada.</p>
                        </div>
                    ) : (
                        <>
                            {paymentMethod === "pix" ? (
                                <>
                                    <div className="flex justify-center">
                                        <img src={pixData.pixQrCode} alt="QR Code PIX" className="w-64 h-64 rounded-lg bg-white p-2" />
                                    </div>

                                    <div className="bg-black/20 p-4 rounded-lg">
                                        <p className="text-xs text-white/60 mb-2">Código PIX (Copia e Cola):</p>
                                        <p className="text-xs text-white break-all font-mono">{pixData.pixPayload}</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-2"
                                            onClick={() => {
                                                navigator.clipboard.writeText(pixData.pixPayload);
                                                toast({ title: "Código copiado!" });
                                            }}
                                        >
                                            Copiar Código
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="py-8 space-y-6">
                                    <div className="flex justify-center">
                                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                                            <CreditCard className="h-10 w-10 text-primary" />
                                        </div>
                                    </div>
                                    <p className="text-center text-sm text-white/70">
                                        O pagamento será processado em ambiente seguro e criptografado.
                                    </p>
                                    <Button
                                        className="w-full h-12 bg-primary text-black font-bold uppercase"
                                        onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
                                    >
                                        Finalizar Pagamento
                                    </Button>
                                </div>
                            )}

                            <div className="text-center">
                                <p className="text-sm text-white/60 mb-2">Valor: R$ 89,90</p>
                                <div className="flex items-center justify-center gap-2 text-primary">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Aguardando confirmação...</span>
                                </div>
                            </div>
                        </>
                    )}

                    <Button variant="ghost" onClick={onSkip} className="w-full text-white/60">
                        Voltar
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-green-600/10 overflow-hidden relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-600/10 rounded-full blur-3xl" />

            <CardHeader className="text-center relative z-10">
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/20 rounded-full">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <CardTitle className="text-2xl font-black text-white mb-2">
                    {currentContent.headline}
                </CardTitle>
                <CardDescription className="text-white/70 text-base">
                    {currentContent.subheadline}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10">
                {/* Pricing */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-2xl text-white/40 line-through">R$ 297,00</span>
                        <Badge className="bg-red-500 text-white">70% OFF</Badge>
                    </div>
                    <div className="text-5xl font-black text-primary mb-1">R$ 89,90</div>
                    <p className="text-xs text-white/60">Oferta Especial de Lançamento</p>
                </div>

                {/* Benefits */}
                <div className="space-y-3">
                    {currentContent.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <div className="mt-0.5 p-1 bg-primary/20 rounded-full">
                                <Check className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm text-white/80">{benefit}</span>
                        </div>
                    ))}
                </div>

                {/* Social Proof */}
                <div className="bg-black/20 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-white">
                            Mais de 500 empreendedores já adquiriram
                        </span>
                    </div>
                    <p className="text-xs text-white/60">Oferta por tempo limitado</p>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={() => handlePurchase("pix")}
                            disabled={loading}
                            className="h-12 bg-white/5 border border-white/10 text-white font-bold gap-2"
                        >
                            {loading && paymentMethod === "pix" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                            Pagar com PIX
                        </Button>
                        <Button
                            onClick={() => handlePurchase("card")}
                            disabled={loading}
                            className="h-12 bg-white/5 border border-white/10 text-white font-bold gap-2"
                        >
                            {loading && paymentMethod === "card" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                            Pagar com Cartão
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={onSkip}
                        className="w-full text-white/60 hover:text-white"
                    >
                        Decidir depois
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
