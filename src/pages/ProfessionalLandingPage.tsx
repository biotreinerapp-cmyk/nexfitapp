import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, QrCode, Copy, User, Loader2, CheckCircle2 } from "lucide-react";
import { getSpecialtyLabel } from "@/lib/professionalSpecialties";
import type { GeneratedLandingPage } from "@/lib/geminiAI";
import { createPixPayment, checkPixPaymentStatus } from "@/lib/pixPaymentTracking";
import { useUserPlan } from "@/hooks/useUserPlan";
import { buildPixPayload, calculateFinalPrice } from "@/lib/pix";
import QRCode from "qrcode";

export default function ProfessionalLandingPage() {
    const { professionalId } = useParams<{ professionalId: string }>();
    const { user } = useAuth();
    const { plan } = useUserPlan();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [professional, setProfessional] = useState<any>(null);
    const [landingPage, setLandingPage] = useState<GeneratedLandingPage | null>(null);
    const [showHireDialog, setShowHireDialog] = useState(false);
    const [hireMessage, setHireMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // PIX Payment States
    const [showPixDialog, setShowPixDialog] = useState(false);
    const [pixData, setPixData] = useState<any>(null);
    const [checkingPayment, setCheckingPayment] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "expired">("pending");

    useEffect(() => {
        loadProfessionalData();
    }, [professionalId]);

    const loadProfessionalData = async () => {
        if (!professionalId) return;

        try {
            // Load professional profile
            const { data: profData, error: profError } = await supabase
                .from("professionals")
                .select("*")
                .eq("id", professionalId)
                .single();

            if (profError) throw profError;

            setProfessional(profData);

            // Load landing page
            const { data: lpData, error: lpError } = await supabase
                .from("professional_landing_pages")
                .select("*")
                .eq("professional_id", professionalId)
                .eq("is_active", true)
                .single();

            if (lpError && lpError.code !== "PGRST116") throw lpError;

            if (lpData) {
                // Adapt simple template data to expected format if needed, or update UI to use lpData directly
                setLandingPage(lpData);

                // Increment view count
                await supabase.rpc("increment_lp_views", { lp_id: lpData.id });
            }
        } catch (error: any) {
            console.error("Load error:", error);
            toast({
                title: "Erro ao carregar perfil",
                description: "O profissional ainda não configurou sua página.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const isEliteBlack = plan === "ELITE";
    const getDiscountedPrice = (price: number | null) => calculateFinalPrice(price, plan);

    const handleHire = async () => {
        if (!user) {
            toast({
                title: "Login necessário",
                description: "Faça login para contratar um profissional.",
                variant: "destructive",
            });
            navigate("/auth");
            return;
        }

        if (!hireMessage.trim()) {
            toast({
                title: "Mensagem obrigatória",
                description: "Por favor, escreva uma mensagem para o profissional.",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        try {
            const finalAmount = getDiscountedPrice(professional.base_price);
            const isFree = finalAmount === 0;

            // 1. Create the hire record
            const { data: hire, error: hireError } = await (supabase as any).from("professional_hires").insert({
                professional_id: professionalId,
                student_id: user.id,
                message: hireMessage,
                status: isFree ? "accepted" : "pending",
                paid_amount: finalAmount,
                payment_status: isFree ? "paid" : "pending"
            }).select("id").single();

            if (hireError) {
                if (hireError.code === "23505") { // Unique constraint
                    toast({
                        title: "Solicitação em andamento",
                        description: "Você já tem uma solicitação ativa com este profissional.",
                    });
                    setShowHireDialog(false);
                    return;
                }
                throw hireError;
            }

            // 2. If it's free, setup the binding and chat room immediately
            if (isFree) {
                // Create formal binding
                await (supabase as any)
                    .from("professional_student_bindings")
                    .upsert({
                        professional_id: professionalId,
                        student_id: user.id,
                        hire_id: hire.id,
                        status: "active",
                    }, { onConflict: "professional_id,student_id" });

                // Create chat room if not exists
                const { data: existingRoom } = await (supabase as any)
                    .from("professional_chat_rooms")
                    .select("id")
                    .eq("professional_id", professionalId)
                    .eq("student_id", user.id)
                    .maybeSingle();

                if (!existingRoom) {
                    await (supabase as any)
                        .from("professional_chat_rooms")
                        .insert({
                            professional_id: professionalId,
                            student_id: user.id,
                            last_message_at: new Date().toISOString(),
                        });
                }

                toast({
                    title: "Conexão confirmada!",
                    description: `Você agora está vinculado a ${professional.name}. Acesse o chat para falar com o profissional.`,
                });
                setShowHireDialog(false);
                setHireMessage("");
                return;
            }

            // 3. Handle paid flows
            if (professional.base_price && professional.base_price > 0) {
                // Generate Direct PIX Payload instead of using gateway
                if (!professional.pix_key) {
                    toast({ title: "Aviso", description: "O profissional ainda não cadastrou uma chave PIX. Notificamos ele!", variant: "destructive" });
                    setShowHireDialog(false);
                    return;
                }

                const payload = buildPixPayload({
                    pixKey: professional.pix_key,
                    receiverName: professional.pix_receiver_name || professional.name,
                    amount: finalAmount,
                    description: `Serviço Profissional: ${professional.name}`.slice(0, 30)
                });

                const qrCode = await QRCode.toDataURL(payload, { width: 300, margin: 1, color: { dark: '#000000FF', light: '#FFFFFFFF' } });

                setPixData({
                    paymentId: hire.id,
                    pixPayload: payload,
                    pixQrCode: qrCode,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                });
                setShowHireDialog(false);
                setShowPixDialog(true);
            }
            setHireMessage("");
        } catch (error: any) {
            console.error("Hire error:", error);
            toast({
                title: "Erro ao enviar solicitação",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCheckPayment = async () => {
        if (!pixData) return;
        setCheckingPayment(true);
        try {
            await supabase.from("professional_hires").update({
                payment_status: "awaiting_verification"
            }).eq("id", pixData.paymentId);

            setPaymentStatus("paid");
            toast({
                title: "Comprovante enviado!",
                description: "O profissional verificará o Pix e liberará seu acesso em breve.",
            });
        } catch (error) {
            console.error("Check error:", error);
        } finally {
            setCheckingPayment(false);
        }
    };

    const copyPixPayload = () => {
        if (!pixData) return;
        navigator.clipboard.writeText(pixData.pixPayload);
        toast({ title: "Copiado!", description: "Código PIX copiado para a área de transferência." });
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!professional || !landingPage) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <div className="text-center">
                    <p className="text-white/60">Profissional não encontrado ou LP não disponível.</p>
                    <Button onClick={() => navigate("/profissionais")} className="mt-4">
                        Voltar para lista
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Cover Image */}
            {professional.cover_image_url && (
                <div className="relative h-64 w-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
                    <img
                        src={professional.cover_image_url}
                        alt="Cover"
                        className="h-full w-full object-cover opacity-60"
                    />
                </div>
            )}

            {/* Profile Header */}
            <div className="container mx-auto max-w-4xl px-4">
                <div className={`${professional.cover_image_url ? '-mt-20' : 'pt-8'} relative z-10`}>
                    <div className="flex flex-col items-center gap-4 md:flex-row md:items-end">
                        <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-black bg-white/5">
                            {professional.profile_image_url ? (
                                <img
                                    src={professional.profile_image_url}
                                    alt={professional.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <User className="h-16 w-16 text-white/40" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl font-black text-white">{professional.name}</h1>
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                                <Badge variant="outline" className="text-primary">
                                    {getSpecialtyLabel(professional.specialty)}
                                </Badge>
                                {professional.crm_crp && (
                                    <Badge variant="outline">{professional.crm_crp}</Badge>
                                )}
                            </div>
                        </div>

                        <Button
                            onClick={() => setShowHireDialog(true)}
                            size="lg"
                            className="bg-primary text-black hover:bg-primary/90"
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Contratar
                        </Button>
                    </div>
                </div>

                {/* Landing Page Content */}
                <div className="mt-12 space-y-12 pb-20">
                    {/* Headline */}
                    <div className="text-center">
                        <h2 className="text-4xl font-black text-white md:text-5xl">
                            {landingPage.headline || "Bem-vindo ao meu perfil"}
                        </h2>
                    </div>

                    {/* IMAGES */}
                    {landingPage.images?.hero && (
                        <div className="h-64 md:h-96 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                            <img src={landingPage.images.hero} alt="Banner" className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* About */}
                    <Card className="border-white/10 bg-white/5">
                        <CardContent className="p-8">
                            <h3 className="mb-4 text-2xl font-bold text-white">Sobre</h3>
                            <p className="text-white/70 leading-relaxed whitespace-pre-wrap">{landingPage.about_text}</p>
                        </CardContent>
                    </Card>

                    {/* Services */}
                    {landingPage.services_text && (
                        <Card className="border-white/10 bg-white/5">
                            <CardContent className="p-8">
                                <h3 className="mb-6 text-2xl font-bold text-white">Serviços Oferecidos</h3>
                                <div className="space-y-4">
                                    {landingPage.services_text.split('\n').map((service: string, i: number) => (
                                        service.trim() && (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                                </div>
                                                <p className="text-white/70">{service}</p>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Contact Info (from LP data) */}
                    <Card className="border-white/10 bg-white/5">
                        <CardContent className="p-8">
                            <h3 className="mb-6 text-2xl font-bold text-white">Contato</h3>
                            <div className="space-y-3">
                                {landingPage.contact_info?.whatsapp && (
                                    <div className="flex items-center gap-3 text-white/70">
                                        <div className="h-5 w-5 text-primary">📱</div>
                                        <span>{landingPage.contact_info.whatsapp}</span>
                                    </div>
                                )}
                                {professional.email && (
                                    <div className="flex items-center gap-3 text-white/70">
                                        <div className="h-5 w-5 text-primary">✉️</div>
                                        <span>{professional.email}</span>
                                    </div>
                                )}
                                {professional.base_price && (
                                    <div className="flex items-center gap-3 text-white/70">
                                        <div className="h-5 w-5 text-primary">💰</div>
                                        <span>A partir de R$ {professional.base_price.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* CTA */}
                    <div className="text-center">
                        <Button
                            onClick={() => setShowHireDialog(true)}
                            size="lg"
                            className="bg-primary text-black hover:bg-primary/90 px-12 py-6 text-lg rounded-2xl"
                        >
                            Contratar Agora
                        </Button>
                    </div>
                </div>
            </div>

            {/* Hire Dialog */}
            <Dialog open={showHireDialog} onOpenChange={setShowHireDialog}>
                <DialogContent className="bg-zinc-900 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white">Contratar {professional.name}</DialogTitle>
                        <DialogDescription>
                            Envie uma mensagem descrevendo suas necessidades e objetivos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="message" className="text-white">Sua Mensagem</Label>
                            <Textarea
                                id="message"
                                value={hireMessage}
                                onChange={(e) => setHireMessage(e.target.value)}
                                placeholder="Olá! Gostaria de contratar seus serviços para..."
                                rows={6}
                                className="bg-white/10 text-white mt-2"
                            />
                        </div>

                        <Button
                            onClick={handleHire}
                            disabled={submitting || !hireMessage.trim()}
                            className="w-full bg-primary text-black hover:bg-primary/90"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                "Enviar Solicitação"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* PIX Payment Dialog */}
            <Dialog open={showPixDialog} onOpenChange={setShowPixDialog}>
                <DialogContent className="w-[98vw] max-w-[400px] sm:max-w-md max-h-[92vh] overflow-y-auto bg-black/95 border-white/10 text-white flex flex-col outline-none rounded-[32px] p-4 sm:p-6 backdrop-blur-3xl">
                    <DialogHeader>
                        <DialogTitle>Pagamento via PIX</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Para confirmar a contratação de {professional.name}, realize o pagamento de R$ {getDiscountedPrice(professional.base_price).toFixed(2)}.
                            {isEliteBlack && professional.base_price > 0 && (
                                <span className="block text-primary text-[10px] font-bold mt-1 uppercase">
                                    Desconto de 20% Elite Black aplicado!
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center space-y-6 py-4 w-full">
                        {paymentStatus === "pending" ? (
                            <div className="flex flex-col w-full gap-5 items-center justify-center">
                                <div className="flex justify-center bg-white p-4 rounded-3xl shadow-2xl shadow-white/5 w-fit mx-auto">
                                    {pixData?.pixQrCode && (
                                        <img
                                            src={pixData.pixQrCode}
                                            alt="PIX QR Code"
                                            className="w-[180px] h-[180px] xs:w-[220px] xs:h-[220px] sm:w-[260px] sm:h-[260px] object-contain"
                                        />
                                    )}
                                </div>

                                <div className="w-full space-y-2">
                                    <p className="text-[10px] uppercase font-black text-zinc-500 text-center tracking-widest px-1 mb-2">
                                        Pix Copia e Cola
                                    </p>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full flex flex-col gap-4">
                                        <p className="text-[10px] sm:text-xs font-mono text-zinc-400 break-all select-all text-center leading-relaxed">
                                            {pixData?.pixPayload}
                                        </p>
                                        <Button
                                            variant="secondary"
                                            className="w-full text-xs font-black uppercase tracking-widest gap-2 bg-primary text-black hover:bg-primary/90 h-12 rounded-xl transition-all active:scale-95"
                                            onClick={copyPixPayload}
                                        >
                                            <Copy className="h-4 w-4" />
                                            Copiar Código
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleCheckPayment}
                                    className="w-full bg-primary text-black hover:bg-primary/90 mt-2 h-14 uppercase font-black text-xs tracking-widest rounded-xl"
                                    disabled={checkingPayment}
                                >
                                    {checkingPayment ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                                    Já realizei o pagamento
                                </Button>
                            </div>
                        ) : paymentStatus === "paid" ? (
                            <div className="text-center space-y-4 py-8">
                                <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold">Pagamento Confirmado!</h3>
                                <p className="text-sm text-zinc-400">
                                    Obrigado! Sua contratação foi confirmada. Você já pode acessar o chat com o profissional.
                                </p>
                                <Button onClick={() => navigate("/aluno/chat")} className="w-full bg-primary text-black hover:bg-primary/90">
                                    Ir para o Chat
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center space-y-4 py-8">
                                <p className="text-red-400">O pagamento expirou. Por favor, tente novamente.</p>
                                <Button onClick={() => setShowPixDialog(false)} className="w-full">Fechar</Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
