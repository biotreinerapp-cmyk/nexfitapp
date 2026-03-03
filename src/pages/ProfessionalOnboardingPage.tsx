import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
    Stethoscope,
    User,
    Mail,
    Lock,
    Instagram,
    ClipboardCheck,
    Camera,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Smartphone,
    Calendar,
    MessageCircle,
    DollarSign,
    Loader2
} from "lucide-react";
import {
    getSpecialtiesForService,
    getSpecialtyLabel
} from "@/lib/professionalSpecialties";
import { unmaskCurrency } from "@/lib/maskUtils";

export default function ProfessionalOnboardingPage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Protection and lifecycle logging
    useEffect(() => {
        console.log("[Onboarding] Auth State Changed:", {
            hasUser: !!user,
            userId: user?.id,
            email: user?.email,
            authLoading
        });

        if (!authLoading && !user) {
            console.warn("[Onboarding] No user found, redirecting to auth...");
            navigate("/auth?callback=/professional/onboarding");
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        console.log("[Onboarding] Component Mounted. Current Step:", step);
    }, []);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [setupProgress, setSetupProgress] = useState(0);
    const [setupStatus, setSetupStatus] = useState("Iniciando...");
    const [telemedicinaServices, setTelemedicinaServices] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        crm_crp: "",
        specialty: "",
        telemedicina_servico_id: "",
        base_price: "",
        bio: "",
        instagram: "",
    });

    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [coverImage, setCoverImage] = useState<File | null>(null);

    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({ ...prev, email: user.email }));
        }
        fetchServices();
    }, [user]);

    useEffect(() => {
        if (isCreating) {
            const timer = setInterval(() => {
                setSetupProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(timer);
                        setTimeout(() => navigate("/professional/dashboard"), 1000);
                        return 100;
                    }

                    // Update status based on progress
                    if (prev > 15 && prev < 40) setSetupStatus("Configurando sua agenda...");
                    if (prev > 40 && prev < 70) setSetupStatus("Sincronizando seu perfil...");
                    if (prev > 70 && prev < 90) setSetupStatus("Preparando seu dashboard...");
                    if (prev > 90) setSetupStatus("Tudo pronto!");

                    return prev + 1.5;
                });
            }, 60);
            return () => clearInterval(timer);
        }
    }, [isCreating, navigate]);

    // Auto-select specialty if only one option exists
    useEffect(() => {
        const selectedService = telemedicinaServices.find(s => s.id === formData.telemedicina_servico_id);
        if (selectedService) {
            const available = getSpecialtiesForService(selectedService.slug);
            if (available.length === 1 && !formData.specialty) {
                setFormData(prev => ({ ...prev, specialty: available[0].value }));
            } else if (available.length === 0 && !formData.specialty && formData.telemedicina_servico_id) {
                setFormData(prev => ({ ...prev, specialty: "other" }));
            }
        }
    }, [formData.telemedicina_servico_id, telemedicinaServices]);

    // Early returns for loading/no user - MUST BE AFTER ALL HOOKS
    if (authLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const fetchServices = async () => {
        try {
            console.log("[Onboarding] Fetching services...");
            const { data, error } = await (supabase as any).from("telemedicina_servicos").select("*");

            if (error) {
                console.error("[Onboarding] Error fetching services:", error);
                toast({
                    title: "Erro ao carregar categorias",
                    description: `Erro: ${error.message}. Contacte o suporte.`,
                    variant: "destructive",
                });
                return;
            }

            console.log("[Onboarding] Services raw data:", data);

            if (data) {
                const activeServices = data.filter((s: any) => s.ativo !== false);
                console.log("[Onboarding] Active services:", activeServices);
                setTelemedicinaServices(activeServices);
            }
        } catch (err: any) {
            console.error("[Onboarding] Fetch exception:", err);
            toast({
                title: "Exceção ao carregar categorias",
                description: err.message || "Erro desconhecido",
                variant: "destructive",
            });
        }
    };

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        console.log("[Onboarding] !!! SUBMIT BUTTON CLICKED !!!");

        if (!user) {
            console.error("[Onboarding] No user found in useAuth()");
            toast({ title: "Erro de Autenticação", description: "Usuário não encontrado. Tente recarregar a página.", variant: "destructive" });
            return;
        }

        // Final validation
        if (!formData.specialty || formData.specialty === "") {
            console.warn("[Onboarding] Validation failed: specialty is empty", formData);
            toast({
                title: "Atenção",
                description: "Por favor, selecione uma especialidade específica.",
                variant: "destructive"
            });
            setStep(1); // Go back to first step to fix it
            return;
        }

        setLoading(true);
        console.log("[Onboarding] Current state before submit:", {
            step,
            formData,
            hasUser: !!user,
            userId: user.id
        });

        try {
            let profileImageUrl = null;
            let coverImageUrl = null;

            if (profileImage) {
                console.log("[Onboarding] Uploading profile image...");
                const ext = profileImage.name.split(".").pop();
                const path = `profile-${user.id}-${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from("professional-images").upload(path, profileImage);
                if (upErr) {
                    console.error("[Onboarding] Profile image upload error:", upErr);
                } else {
                    profileImageUrl = supabase.storage.from("professional-images").getPublicUrl(path).data.publicUrl;
                    console.log("[Onboarding] Profile image uploaded:", profileImageUrl);
                }
            }

            if (coverImage) {
                console.log("[Onboarding] Uploading cover image...");
                const ext = coverImage.name.split(".").pop();
                const path = `cover-${user.id}-${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from("professional-images").upload(path, coverImage);
                if (upErr) {
                    console.error("[Onboarding] Cover image upload error:", upErr);
                } else {
                    coverImageUrl = supabase.storage.from("professional-images").getPublicUrl(path).data.publicUrl;
                    console.log("[Onboarding] Cover image uploaded:", coverImageUrl);
                }
            }

            // Robust price parsing: use standardized utility
            const finalPrice = formData.base_price ? unmaskCurrency(formData.base_price) : null;

            // Final check for specialty - if still empty, use a default to avoid DB error
            let finalSpecialty = formData.specialty;
            if (!finalSpecialty || finalSpecialty === "") {
                console.warn("[Onboarding] Specialty still empty during submit, forcing 'other'");
                finalSpecialty = "other";
            }

            const payload = {
                user_id: user.id,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                crm_crp: formData.crm_crp,
                specialty: getSpecialtyLabel(finalSpecialty),
                telemedicina_servico_id: formData.telemedicina_servico_id,
                base_price: finalPrice,
                bio: formData.bio,
                instagram: formData.instagram,
                profile_image_url: profileImageUrl,
                cover_image_url: coverImageUrl,
                is_available: true
            };

            console.log("[Onboarding] Final Payload to professionals table:", payload);

            // Check if user already exists in professionals to avoid UNIQUE constraint error
            const { data: existingProf } = await (supabase as any).from("professionals").select("id").eq("user_id", user.id).maybeSingle();

            let result;
            if (existingProf) {
                console.log("[Onboarding] Professional already exists, updating...", existingProf.id);
                result = await (supabase as any).from("professionals").update(payload).eq("user_id", user.id);
            } else {
                console.log("[Onboarding] New professional, inserting...");
                result = await (supabase as any).from("professionals").insert(payload);
            }

            if (result.error) {
                console.error("[Onboarding] DB Operation Error:", result.error);
                toast({
                    title: "Erro no Banco de Dados",
                    description: `Erro: ${result.error.message} (Código: ${result.error.code})`,
                    variant: "destructive"
                });
                return;
            }

            console.log("[Onboarding] Professional record saved. Updating profile status...");

            // Mark onboarding as completed in profiles
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ onboarding_completed: true })
                .eq("id", user.id);

            if (profileError) {
                console.warn("[Onboarding] Profile update error (non-blocking):", profileError);
            }

            console.log("[Onboarding] Success! Moving to setup screen.");
            setIsCreating(true);
        } catch (error: any) {
            console.error("[Onboarding] CRITICAL EXCEPTION during submit:", error);
            toast({
                title: "Exceção Crítica",
                description: error.message || "Erro desconhecido durante o salvamento.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                const selectedService = telemedicinaServices.find(s => s.id === formData.telemedicina_servico_id);
                console.log("[Onboarding] Step 1 - Selected Service:", selectedService);
                const availableSpecialties = selectedService ? getSpecialtiesForService(selectedService.slug) : [];
                console.log("[Onboarding] Step 1 - Available Specialties:", availableSpecialties);

                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Qual sua área?</h2>
                            <p className="text-zinc-400 text-sm">Seu perfil será exibido nesta categoria para os alunos.</p>
                        </div>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest pl-1">Nome Completo</Label>
                                <Input
                                    placeholder="Ex: Dr. João Silva"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5 focus:border-primary/50 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest pl-1">Categoria Principal</Label>
                                <Select
                                    value={formData.telemedicina_servico_id}
                                    onValueChange={(v) => {
                                        setFormData({
                                            ...formData,
                                            telemedicina_servico_id: v,
                                            specialty: "" // Reset specialty when category changes
                                        });
                                    }}
                                >
                                    <SelectTrigger className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10">
                                        {telemedicinaServices.length > 0 ? (
                                            telemedicinaServices.map(service => (
                                                <SelectItem key={service.id} value={service.id} className="text-white">
                                                    {service.nome}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-[10px] text-zinc-500">
                                                Nenhuma categoria ativa encontrada.<br />
                                                Verifique o Painel Admin.
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.telemedicina_servico_id && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest pl-1">Especialidade Específica</Label>
                                    <Select
                                        value={formData.specialty}
                                        onValueChange={(v) => {
                                            console.log("[Onboarding] Specialty selected:", v);
                                            setFormData({ ...formData, specialty: v });
                                        }}
                                    >
                                        <SelectTrigger className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10">
                                            {availableSpecialties.length > 0 ? (
                                                availableSpecialties.map(spec => (
                                                    <SelectItem key={spec.value} value={spec.value} className="text-white">
                                                        {spec.label}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="other" className="text-white">Outros</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {!formData.specialty && availableSpecialties.length === 0 && (
                                        <p className="text-[10px] text-amber-500/70 pl-1">Seleção automática: Outros</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={handleNext}
                            disabled={!formData.name || !formData.telemedicina_servico_id || (availableSpecialties.length > 0 && !formData.specialty)}
                            className="w-full h-14 bg-[#56FF02] text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            Continuar <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Registro e Preço</h2>
                            <p className="text-zinc-500 text-sm">Defina seu registro profissional e valor de consulta.</p>
                        </div>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Registro (CRM, CRP, CREF, etc)</Label>
                                <Input
                                    placeholder="Ex: CRM-SP 123456"
                                    value={formData.crm_crp}
                                    onChange={(e) => setFormData({ ...formData, crm_crp: e.target.value })}
                                    className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Consulta Base (R$)</Label>
                                <MaskedInput
                                    mask="currency"
                                    placeholder="150"
                                    value={formData.base_price}
                                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                                    className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5 focus:border-primary/50 transition-all font-medium font-mono"
                                />
                                <p className="text-[10px] text-zinc-500 mt-1">
                                    O sistema aplicará um desconto automático de 20% para usuários do plano Elite Black.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="ghost" onClick={handleBack} className="h-14 w-14 rounded-2xl text-zinc-500 hover:bg-white/5">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button onClick={handleNext} className="flex-1 h-14 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-primary/20">
                                Continuar <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Bio e Contato</h2>
                            <p className="text-zinc-500 text-sm">Conte um pouco sobre você e como as pessoas podem te achar.</p>
                        </div>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Bio Profissional</Label>
                                <Textarea
                                    placeholder="Suas formações, experiências e como você ajuda seus alunos..."
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="min-h-[120px] bg-white/5 border-white/5 text-white rounded-2xl px-5 py-4 focus:border-primary/50 transition-all resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">WhatsApp para Atendimento</Label>
                                <MaskedInput
                                    mask="phone"
                                    placeholder="(00) 00000-0000"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Instagram Business</Label>
                                <div className="relative group">
                                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                    <Input
                                        placeholder="@seuperfil"
                                        value={formData.instagram}
                                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                        className="h-14 bg-white/5 border-white/5 text-white rounded-2xl pl-11 pr-5"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="ghost" onClick={handleBack} className="h-14 w-14 rounded-2xl text-zinc-500">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button onClick={handleSubmit} disabled={loading} className="flex-1 h-14 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-primary/20">
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Finalizar Cadastro"}
                            </Button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderSetup = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-10"
        >
            <div className="relative flex justify-center">
                <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                <div className="relative h-24 w-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-2xl overflow-hidden group">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-3xl"
                    />
                    <Sparkles className="h-10 w-10 text-primary animate-bounce" />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">
                    Criando seu <br /><span className="text-primary">ambiente PRO</span>
                </h2>
                <p className="text-zinc-500 text-sm font-medium tracking-wide">
                    Estamos preparando tudo para você começar a atender seus alunos.
                </p>
            </div>

            <div className="space-y-6 pt-6">
                <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${setupProgress}%` }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-green-400 to-primary rounded-full shadow-[0_0_20px_rgba(86,255,2,0.5)]"
                    />
                </div>

                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                        <Loader2 className="h-3 w-3 text-primary animate-spin" />
                        <span className="text-[10px] uppercase font-black tracking-widest text-primary animate-pulse">
                            {setupStatus}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
                        {Math.round(setupProgress)}% Concluído
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-12 grayscale opacity-20 contrast-125">
                {[Calendar, MessageCircle, DollarSign].map((Icon, i) => (
                    <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-zinc-400" />
                    </div>
                ))}
            </div>
        </motion.div>
    );

    return (
        <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-20 pointer-events-none">
                <div className="h-80 w-80 bg-primary rounded-full blur-[100px]" />
            </div>

            {/* Added a second glow for extra "WOW" */}
            <div className="absolute bottom-0 left-0 p-10 opacity-10 pointer-events-none">
                <div className="h-96 w-96 bg-primary rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <AnimatePresence mode="wait">
                    {!isCreating ? (
                        <motion.div
                            key="onboarding"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <div className="mb-12 text-center">
                                <div className="inline-flex h-12 w-12 items-center justify-center bg-primary/10 rounded-2xl mb-4 border border-primary/20">
                                    <Stethoscope className="text-primary h-6 w-6" />
                                </div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Nexfit Pro</h1>
                                <div className="mt-4 flex justify-center gap-1">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? "w-8 bg-primary" : "w-1.5 bg-white/10"}`} />
                                    ))}
                                </div>
                            </div>

                            {renderStep()}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="setup"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {renderSetup()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
