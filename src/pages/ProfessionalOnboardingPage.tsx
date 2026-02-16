import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { LPOfferCard } from "@/components/onboarding/LPOfferCard";
import { ArrowLeft, ArrowRight, Loader2, Rocket, Upload, Camera, Sparkles } from "lucide-react";
import { PROFESSIONAL_SPECIALTIES } from "@/lib/professionalSpecialties";
import { cn } from "@/lib/utils";
import logoNexfit from "@/assets/nexfit-logo.png";

const STEPS = ["Identidade", "Expertise", "Conectividade", "Visibilidade"];

export default function ProfessionalOnboardingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        // Step 1
        name: "",
        crm_crp: "",
        specialty: "",
        telemedicina_servico_id: "",
        base_price: "",
        // Step 2
        profilePhoto: null as File | null,
        coverPhoto: null as File | null,
        bio: "",
        // Step 3
        phone: "",
        instagram: "",
    });

    const [telemedicinaServices, setTelemedicinaServices] = useState<any[]>([]);

    useEffect(() => {
        if (!user) {
            navigate("/auth");
            return;
        }
        loadProfessionalData();
    }, [user]);

    const loadProfessionalData = async () => {
        if (!user) return;

        // Fetch services
        const { data: services } = await supabase
            .from("telemedicina_servicos")
            .select("*")
            .eq("ativo", true);

        if (services) setTelemedicinaServices(services);

        const { data } = await supabase
            .from("professionals")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (data) {
            setFormData((prev) => ({
                ...prev,
                name: data.name || "",
                crm_crp: data.crm_crp || "",
                specialty: data.specialty || "",
                telemedicina_servico_id: data.telemedicina_servico_id || "",
                base_price: data.base_price?.toString() || "",
                bio: data.bio || "",
                phone: data.phone || "",
                instagram: data.instagram || "",
            }));
        }
    };

    const saveStep = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const updateData: any = {};

            if (currentStep === 1) {
                if (!formData.name || !formData.specialty || !formData.telemedicina_servico_id) {
                    toast({ title: "Ops!", description: "Nome, especialidade e serviço de telemedicina são obrigatórios.", variant: "destructive" });
                    return false;
                }
                updateData.name = formData.name;
                updateData.crm_crp = formData.crm_crp;
                updateData.specialty = formData.specialty;
                updateData.telemedicina_servico_id = formData.telemedicina_servico_id;
                updateData.base_price = formData.base_price ? parseFloat(formData.base_price) : null;
            } else if (currentStep === 2) {
                if (formData.profilePhoto) {
                    const ext = formData.profilePhoto.name.split(".").pop();
                    const path = `profiles/${user.id}-${Date.now()}.${ext}`;
                    const { error: uploadError } = await supabase.storage
                        .from("professional-images")
                        .upload(path, formData.profilePhoto);
                    if (!uploadError) {
                        updateData.profile_image_url = supabase.storage
                            .from("professional-images")
                            .getPublicUrl(path).data.publicUrl;
                    }
                }
                updateData.bio = formData.bio;
            } else if (currentStep === 3) {
                if (!formData.phone) {
                    toast({ title: "Quase lá!", description: "Precisamos do seu WhatsApp para os alunos te acharem.", variant: "destructive" });
                    return false;
                }
                updateData.phone = formData.phone;
                updateData.instagram = formData.instagram;
            }

            const { error } = await supabase
                .from("professionals")
                .update(updateData)
                .eq("user_id", user.id);

            if (error) throw error;
            return true;
        } catch (error: any) {
            console.error("Save error:", error);
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        const success = await saveStep();
        if (success && currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
            <div className="max-w-xl mx-auto py-12 px-6">
                {/* Header */}
                <div className="flex flex-col items-center mb-12 text-center">
                    <img src={logoNexfit} alt="Nexfit" className="h-10 mb-8" />
                    <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">
                        Seja Bem-vindo ao <span className="text-primary">Ecosistema Nexfit</span>
                    </h1>
                    <p className="text-zinc-500 text-sm max-w-sm">
                        Vamos configurar seu consultório digital em poucos minutos.
                    </p>
                </div>

                {/* Progress Custom */}
                <div className="flex justify-between mb-12 relative">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -z-10" />
                    {STEPS.map((step, idx) => {
                        const stepNum = idx + 1;
                        const isActive = currentStep === stepNum;
                        const isDone = currentStep > stepNum;
                        return (
                            <div key={step} className="flex flex-col items-center gap-2 bg-black px-2">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500",
                                    isActive ? "bg-primary text-black scale-110 shadow-[0_0_15px_rgba(34,197,94,0.4)]" :
                                        isDone ? "bg-white text-black" : "bg-zinc-900 text-zinc-600 border border-white/5"
                                )}>
                                    {stepNum}
                                </div>
                                <span className={cn(
                                    "text-[9px] uppercase font-bold tracking-widest",
                                    isActive ? "text-primary" : "text-zinc-600"
                                )}>{step}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                    <Card className="border-white/5 bg-zinc-950/50 backdrop-blur-3xl rounded-[32px] overflow-hidden">
                        <CardContent className="p-8">
                            {currentStep === 1 && <Step1 formData={formData} setFormData={setFormData} telemedicinaServices={telemedicinaServices} />}
                            {currentStep === 2 && <Step2 formData={formData} setFormData={setFormData} />}
                            {currentStep === 3 && <Step3 formData={formData} setFormData={setFormData} />}
                            {currentStep === 4 && (
                                <StepCTA
                                    onComplete={() => navigate("/professional/dashboard")}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Navigation */}
                {currentStep < 4 && (
                    <div className="flex gap-4 mt-8">
                        {currentStep > 1 && (
                            <Button variant="ghost" onClick={handleBack} className="flex-1 h-14 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            disabled={loading}
                            className="flex-[2] h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-tight hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    {currentStep === 3 ? "Finalizar Configuração" : "Próximo Passo"}
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Sub-components with premium feel
function Step1({ formData, setFormData, telemedicinaServices }: any) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Identidade Profissional</h2>
                <p className="text-zinc-500 text-xs">Como os alunos te encontrarão no marketplace.</p>
            </div>

            <div className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Nome de Exibição</Label>
                    <Input
                        placeholder="Ex: Dr. João Silva"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5 focus:border-primary/50 transition-all font-medium"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Registro Profissional</Label>
                        <Input
                            placeholder="CRM/CRP"
                            value={formData.crm_crp}
                            onChange={(e) => setFormData({ ...formData, crm_crp: e.target.value })}
                            className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5 focus:border-primary/50 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Consulta Base (R$)</Label>
                        <Input
                            type="number"
                            placeholder="150"
                            value={formData.base_price}
                            onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                            className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5 focus:border-primary/50 transition-all font-medium font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Especialidade (Marketplace)</Label>
                        <Select value={formData.specialty} onValueChange={(value) => setFormData({ ...formData, specialty: value })}>
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-2xl px-5">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10">
                                {PROFESSIONAL_SPECIALTIES.map((spec) => (
                                    <SelectItem key={spec.value} value={spec.value} className="text-white hover:bg-primary/20">
                                        {spec.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Serviço Telemedicina</Label>
                        <Select
                            value={formData.telemedicina_servico_id}
                            onValueChange={(value) => setFormData({ ...formData, telemedicina_servico_id: value })}
                        >
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-2xl px-5">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10">
                                {telemedicinaServices?.map((service: any) => (
                                    <SelectItem key={service.id} value={service.id} className="text-white hover:bg-primary/20">
                                        {service.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Step2({ formData, setFormData }: any) {
    return (
        <div className="space-y-6 text-center">
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Presença Visual</h2>
                <p className="text-zinc-500 text-xs">Um perfil completo gera 60% mais conversão.</p>
            </div>

            <div className="flex justify-center py-6">
                <div className="relative group">
                    <div className="h-32 w-32 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                        {formData.profilePhoto ? (
                            <img src={URL.createObjectURL(formData.profilePhoto)} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <Camera className="h-8 w-8 text-zinc-700" />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.files?.[0] || null })}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </div>
                    <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-primary rounded-xl flex items-center justify-center text-black shadow-lg">
                        <Upload className="h-4 w-4" />
                    </div>
                </div>
            </div>

            <div className="space-y-2 text-left">
                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Sua Bio (Pitch de Venda)</Label>
                <Textarea
                    placeholder="Conte sua experiência e como você ajuda seus alunos..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="bg-white/5 border-white/5 text-sm text-white rounded-2xl px-5 py-4 focus:border-primary/50 transition-all resize-none"
                    rows={4}
                />
            </div>
        </div>
    );
}

function Step3({ formData, setFormData }: any) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Pontos de Contato</h2>
                <p className="text-zinc-500 text-xs">Onde seus futuros alunos encontrarão você.</p>
            </div>

            <div className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">WhatsApp para Atendimento</Label>
                    <Input
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Instagram (@usuario)</Label>
                    <Input
                        placeholder="@dr_seunome"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5"
                    />
                </div>
            </div>
        </div>
    );
}

function StepCTA({ onComplete }: { onComplete: () => void }) {
    return (
        <div className="space-y-8 text-center animate-in fade-in zoom-in duration-700">
            <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                </div>
            </div>

            <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2 italic">Configuração Concluída!</h2>
                <p className="text-zinc-400 text-sm leading-relaxed px-4">
                    Seu consultório digital está pronto. Agora você já pode receber agendamentos e gerenciar seus alunos no marketplace.
                </p>
            </div>

            <Card className="bg-gradient-to-br from-primary/20 to-transparent border-primary/20 p-6 relative overflow-hidden group">
                <div className="relative z-10">
                    <h3 className="text-primary font-black uppercase text-lg mb-2">Sucesso Total</h3>
                    <p className="text-white/70 text-xs mb-6">
                        Explore seu novo dashboard e comece a transformar vidas através da saúde.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Button onClick={onComplete} className="h-12 bg-primary text-black font-bold uppercase tracking-widest hover:scale-[1.05] transition-transform">
                            Ir para Dashboard
                        </Button>
                    </div>
                </div>
                <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:rotate-12 transition-transform duration-700 text-primary">
                    <Rocket className="h-32 w-32" />
                </div>
            </Card>
        </div>
    );
}


