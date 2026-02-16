import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Store, Briefcase, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { checkEmailExists, isValidEmail, validatePassword } from "@/lib/emailValidation";
import logoNexfit from "@/assets/nexfit-logo.png";

export default function EntrepreneurPortalPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<"store" | "professional">("store");
    const [loading, setLoading] = useState(false);

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
            if (!isValid) {
                setLoading(false);
                return;
            }

            const role = activeTab === "store" ? "store_owner" : "professional";

            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                options: {
                    data: {
                        name: formData.name.trim(),
                        role: role,
                    },
                },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Falha ao criar usuário");

            const userId = authData.user.id;

            // Simplified: The database trigger 'on_auth_user_created_registration' 
            // now handles creating entries in 'lojas'/'professionals' and 'user_roles'
            // based on the auth metadata (role).

            toast({
                title: "Cadastro realizado!",
                description: "Bem-vindo ao Nexfit! Vamos completar seu perfil.",
            });

            if (activeTab === "store") {
                navigate("/loja/onboarding");
            } else {
                navigate("/professional/onboarding");
            }
        } catch (error: any) {
            console.error("Registration error:", error);
            toast({
                title: "Erro no cadastro",
                description: error.message || "Ocorreu um erro. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
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
