import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { LPOfferCard } from "@/components/onboarding/LPOfferCard";
import { ArrowLeft, ArrowRight, Upload, Loader2 } from "lucide-react";
import logoNexfit from "@/assets/nexfit-logo.png";

const STEPS = ["Informações", "Identidade", "Localização", "Landing Page"];

export default function LojaOnboardingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [storeId, setStoreId] = useState<string>("");

    const [formData, setFormData] = useState({
        // Step 1
        nome_loja: "",
        cnpj: "",
        telefone: "",
        categoria: "",
        // Step 2
        logo: null as File | null,
        banner: null as File | null,
        descricao: "",
        // Step 3
        cep: "",
        rua: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
    });

    useEffect(() => {
        if (!user) {
            navigate("/auth");
            return;
        }
        loadStoreData();
    }, [user]);

    const loadStoreData = async () => {
        if (!user) return;
        const { data }: any = await supabase
            .from("lojas")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (data) {
            setStoreId(data.id);
            setFormData((prev) => ({
                ...prev,
                nome_loja: data.nome_loja || "",
                cnpj: data.cnpj || "",
                telefone: data.telefone || "",
                descricao: data.descricao || "",
                cep: data.cep || "",
                rua: data.rua || "",
                numero: data.numero || "",
                complemento: data.complemento || "",
                bairro: data.bairro || "",
                cidade: data.cidade || "",
                estado: data.estado || "",
            }));
        }
    };

    const saveStep = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const updateData: any = {};

            if (currentStep === 1) {
                updateData.nome_loja = formData.nome_loja;
                updateData.cnpj = formData.cnpj;
                updateData.telefone = formData.telefone;
            } else if (currentStep === 2) {
                // Upload images
                if (formData.logo) {
                    const ext = formData.logo.name.split(".").pop();
                    const path = `logo-${Date.now()}.${ext}`;
                    const { error: uploadError } = await supabase.storage
                        .from("loja-images")
                        .upload(path, formData.logo);
                    if (!uploadError) {
                        updateData.logo_url = supabase.storage.from("loja-images").getPublicUrl(path).data.publicUrl;
                    }
                }
                if (formData.banner) {
                    const ext = formData.banner.name.split(".").pop();
                    const path = `banner-${Date.now()}.${ext}`;
                    const { error: uploadError } = await supabase.storage
                        .from("loja-images")
                        .upload(path, formData.banner);
                    if (!uploadError) {
                        updateData.banner_url = supabase.storage.from("loja-images").getPublicUrl(path).data.publicUrl;
                    }
                }
                updateData.descricao = formData.descricao;
            } else if (currentStep === 3) {
                updateData.cep = formData.cep;
                updateData.rua = formData.rua;
                updateData.numero = formData.numero;
                updateData.complemento = formData.complemento;
                updateData.bairro = formData.bairro;
                updateData.cidade = formData.cidade;
                updateData.estado = formData.estado;
            }

            const { error } = await supabase
                .from("lojas")
                .update(updateData)
                .eq("user_id", user.id);

            if (error) throw error;
        } catch (error: any) {
            console.error("Save error:", error);
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        await saveStep();
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };



    return (
        <div className="min-h-screen bg-black p-4">
            <div className="max-w-2xl mx-auto py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <img src={logoNexfit} alt="Nexfit" className="h-8" />
                    <Button variant="ghost" onClick={() => navigate("/loja/dashboard")} className="text-white/60">
                        Pular
                    </Button>
                </div>

                {/* Progress */}
                <OnboardingProgress currentStep={currentStep} totalSteps={4} steps={STEPS} />

                {/* Content */}
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardContent className="p-6">
                        {currentStep === 1 && <Step1 formData={formData} setFormData={setFormData} />}
                        {currentStep === 2 && <Step2 formData={formData} setFormData={setFormData} />}
                        {currentStep === 3 && <Step3 formData={formData} setFormData={setFormData} />}
                        {currentStep === 4 && (
                            <div className="text-center space-y-4">
                                <h2 className="text-2xl font-bold text-white">Configuração Concluída!</h2>
                                <p className="text-white/60">Sua loja está pronta par ser gerenciada.</p>
                                <Button onClick={() => navigate("/loja/dashboard")} className="w-full bg-primary text-black">
                                    Ir para o Dashboard
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Navigation */}
                {currentStep < 4 && (
                    <div className="flex gap-3 mt-6">
                        {currentStep > 1 && (
                            <Button variant="outline" onClick={handleBack} className="flex-1">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar
                            </Button>
                        )}
                        <Button onClick={handleNext} disabled={loading} className="flex-1 bg-primary text-black">
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Continuar
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Step Components
function Step1({ formData, setFormData }: any) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Informações da Loja</h2>
            <div>
                <Label className="text-white">Nome da Loja *</Label>
                <Input
                    value={formData.nome_loja}
                    onChange={(e) => setFormData({ ...formData, nome_loja: e.target.value })}
                    className="bg-black/20 border-white/10 text-white"
                />
            </div>
            <div>
                <Label className="text-white">CNPJ</Label>
                <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="bg-black/20 border-white/10 text-white"
                />
            </div>
            <div>
                <Label className="text-white">Telefone *</Label>
                <Input
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="bg-black/20 border-white/10 text-white"
                />
            </div>
        </div>
    );
}

function Step2({ formData, setFormData }: any) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Identidade Visual</h2>
            <div>
                <Label className="text-white">Logo da Loja</Label>
                <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, logo: e.target.files?.[0] || null })}
                    className="bg-black/20 border-white/10 text-white"
                />
            </div>
            <div>
                <Label className="text-white">Banner da Loja</Label>
                <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, banner: e.target.files?.[0] || null })}
                    className="bg-black/20 border-white/10 text-white"
                />
            </div>
            <div>
                <Label className="text-white">Descrição</Label>
                <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="bg-black/20 border-white/10 text-white"
                    rows={4}
                />
            </div>
        </div>
    );
}

function Step3({ formData, setFormData }: any) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Localização</h2>
            <div>
                <Label className="text-white">CEP *</Label>
                <Input
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    className="bg-black/20 border-white/10 text-white"
                />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                    <Label className="text-white">Rua</Label>
                    <Input
                        value={formData.rua}
                        onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                        className="bg-black/20 border-white/10 text-white"
                    />
                </div>
                <div>
                    <Label className="text-white">Número</Label>
                    <Input
                        value={formData.numero}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        className="bg-black/20 border-white/10 text-white"
                    />
                </div>
            </div>
            <div>
                <Label className="text-white">Bairro</Label>
                <Input
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="bg-black/20 border-white/10 text-white"
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-white">Cidade</Label>
                    <Input
                        value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                        className="bg-black/20 border-white/10 text-white"
                    />
                </div>
                <div>
                    <Label className="text-white">Estado</Label>
                    <Input
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="bg-black/20 border-white/10 text-white"
                        maxLength={2}
                    />
                </div>
            </div>
        </div>
    );
}
