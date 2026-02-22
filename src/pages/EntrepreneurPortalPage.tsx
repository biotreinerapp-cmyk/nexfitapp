import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Store, Briefcase, Loader2, ArrowLeft, Eye, EyeOff, ShieldCheck, RefreshCw, Mail } from "lucide-react";
import { checkEmailExists, isValidEmail, validatePassword } from "@/lib/emailValidation";
import logoNexfit from "@/assets/nexfit-logo.png";

export default function EntrepreneurPortalPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<"store" | "professional">("store");
    const [loading, setLoading] = useState(false);

    // OTP state
    const [otpEmail, setOtpEmail] = useState<string | null>(null);
    const [otpCode, setOtpCode] = useState("");
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isResendingOtp, setIsResendingOtp] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [pendingRole, setPendingRole] = useState<"store" | "professional">("store");

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        acceptTerms: false,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = async () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Nome é obrigatório";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email é obrigatório";
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = "Email inválido";
        } else {
            // Check if email already exists
            try {
                const exists = await checkEmailExists(formData.email);
                if (exists) {
                    newErrors.email = "Este email já está cadastrado no sistema";
                }
            } catch (error) {
                newErrors.email = "Erro ao verificar email";
            }
        }

        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            newErrors.password = passwordValidation.message || "Senha inválida";
        }

        if (!formData.acceptTerms) {
            newErrors.terms = "Você deve aceitar os termos de uso";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            const isValid = await validateForm();
            if (!isValid) { setLoading(false); return; }

            const role = activeTab === "store" ? "store_owner" : "professional";

            // Create auth user and send OTP directly via our custom edge function
            // (admin.createUser bypasses the default Lovable email verification link)
            const { error: otpError } = await supabase.functions.invoke("send-email-otp", {
                body: {
                    email: formData.email.trim().toLowerCase(),
                    name: formData.name.trim(),
                    password: formData.password,
                    role: role
                }
            });
            if (otpError) throw otpError;

            // Show OTP verification screen
            setPendingRole(activeTab);
            setOtpEmail(formData.email.trim().toLowerCase());
            setOtpCode("");
            setResendCooldown(60);
        } catch (error: any) {
            console.error("Registration error:", error);
            toast({ title: "Erro no cadastro", description: error.message || "Ocorreu um erro. Tente novamente.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!otpEmail || isResendingOtp || resendCooldown > 0) return;
        setIsResendingOtp(true);
        try {
            await supabase.functions.invoke("send-email-otp", { body: { email: otpEmail } });
            setOtpCode("");
            setResendCooldown(60);
            toast({ title: "Código reenviado!", description: "Verifique sua caixa de entrada." });
        } catch (err: any) {
            toast({ title: "Erro ao reenviar", description: err?.message, variant: "destructive" });
        } finally {
            setIsResendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpEmail || otpCode.length !== 6) {
            toast({ title: "Código incompleto", description: "Digite os 6 dígitos.", variant: "destructive" });
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const { data, error } = await supabase.functions.invoke("verify-email-otp", {
                body: { email: otpEmail, otp_code: otpCode },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            if (data?.autoLogin && data?.access_token && data?.refresh_token) {
                await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
            }

            toast({ title: "E-mail confirmado!", description: "Bem-vindo ao NexFit! 🎉" });

            if (pendingRole === "store") {
                navigate("/loja/onboarding");
            } else {
                navigate("/professional/onboarding");
            }
        } catch (err: any) {
            toast({ title: "Código inválido", description: err?.message ?? "Verifique o código.", variant: "destructive" });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo and Back Button */}
                <div className="flex items-center justify-between mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/auth")}
                        className="text-white/60 hover:text-white"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                    <img src={logoNexfit} alt="Nexfit" className="h-8" />
                </div>

                {otpEmail ? (
                    /* OTP Verification Screen */
                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                        <CardHeader className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 mb-3">
                                <ShieldCheck className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-bold text-white">Confirme seu e-mail</CardTitle>
                            <CardDescription className="text-white/60 flex items-center justify-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                Código enviado para <span className="font-semibold text-white ml-1">{otpEmail}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3 flex flex-col items-center">
                                <p className="text-xs text-center text-zinc-500">Digite o código de 6 dígitos</p>
                                <InputOTP
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={setOtpCode}
                                    disabled={isVerifyingOtp}
                                    containerClassName="justify-center mt-2"
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                            <div className="space-y-2">
                                <Button
                                    onClick={handleVerifyOtp}
                                    disabled={otpCode.length !== 6 || isVerifyingOtp}
                                    className="w-full bg-primary text-black hover:bg-primary/90 font-bold"
                                >
                                    {isVerifyingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Verificar e Continuar
                                </Button>
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={isResendingOtp || resendCooldown > 0}
                                    className="w-full text-xs text-zinc-500 hover:text-primary transition-colors flex items-center justify-center gap-1.5 py-2 disabled:opacity-40"
                                >
                                    <RefreshCw className={`h-3 w-3 ${isResendingOtp ? "animate-spin" : ""}`} />
                                    {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
                                </button>
                                <Button variant="ghost" className="w-full text-white/40 text-xs" onClick={() => { setOtpEmail(null); setOtpCode(""); }}>
                                    Voltar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    /* Registration Form */
                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold text-white">
                                Portal do Empreendedor
                            </CardTitle>
                            <CardDescription className="text-white/60">
                                Cadastre-se e comece a vender ou oferecer seus serviços
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-6">
                                    <TabsTrigger value="store" className="flex items-center gap-2">
                                        <Store className="h-4 w-4" />
                                        Lojista
                                    </TabsTrigger>
                                    <TabsTrigger value="professional" className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" />
                                        Profissional
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="store" className="space-y-4">
                                    <p className="text-sm text-white/60 mb-4">
                                        Venda produtos fitness, suplementos e equipamentos
                                    </p>
                                    <RegistrationForm
                                        formData={formData}
                                        setFormData={setFormData}
                                        errors={errors}
                                        loading={loading}
                                        onSubmit={handleRegister}
                                    />
                                </TabsContent>

                                <TabsContent value="professional" className="space-y-4">
                                    <p className="text-sm text-white/60 mb-4">
                                        Ofereça serviços de personal, nutrição, fisioterapia e mais
                                    </p>
                                    <RegistrationForm
                                        formData={formData}
                                        setFormData={setFormData}
                                        errors={errors}
                                        loading={loading}
                                        onSubmit={handleRegister}
                                    />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}

                <p className="text-center text-sm text-white/40 mt-4">
                    Já tem uma conta?{" "}
                    <button
                        onClick={() => navigate("/auth")}
                        className="text-primary hover:underline"
                    >
                        Fazer login
                    </button>
                </p>
            </div>
        </div>
    );
}

// Registration Form Component
function RegistrationForm({
    formData,
    setFormData,
    errors,
    loading,
    onSubmit,
}: {
    formData: any;
    setFormData: any;
    errors: Record<string, string>;
    loading: boolean;
    onSubmit: () => void;
}) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                    Nome Completo *
                </Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-black/20 border-white/10 text-white"
                    placeholder="Seu nome"
                />
                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                    Email *
                </Label>
                <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-black/20 border-white/10 text-white"
                    placeholder="seu@email.com"
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                    Senha *
                </Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="bg-black/20 border-white/10 text-white pr-10"
                        placeholder="Mínimo 6 caracteres"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>

            <div className="flex items-start space-x-2">
                <Checkbox
                    id="terms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) =>
                        setFormData({ ...formData, acceptTerms: checked })
                    }
                />
                <label htmlFor="terms" className="text-sm text-white/60 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Aceito os termos de uso e política de privacidade
                </label>
            </div>
            {errors.terms && <p className="text-xs text-red-400">{errors.terms}</p>}

            <Button
                onClick={onSubmit}
                disabled={loading}
                className="w-full bg-primary text-black hover:bg-primary/90"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                    </>
                ) : (
                    "Criar Conta e Continuar"
                )}
            </Button>
        </div>
    );
}
