import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    Smartphone
} from "lucide-react";
import { SPECIALTY_CATEGORIES } from "@/lib/professionalSpecialties";

export default function ProfessionalOnboardingPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
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

    const fetchServices = async () => {
        const { data } = await supabase.from("telemedicina_servicos").select("*").eq("ativo", true);
        if (data) setTelemedicinaServices(data);
    };

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);
        try {
            let profileImageUrl = null;
            let coverImageUrl = null;

            if (profileImage) {
                const ext = profileImage.name.split(".").pop();
                const path = `profile-${user.id}-${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from("professional-images").upload(path, profileImage);
                if (!upErr) profileImageUrl = supabase.storage.from("professional-images").getPublicUrl(path).data.publicUrl;
            }

            if (coverImage) {
                const ext = coverImage.name.split(".").pop();
                const path = `cover-${user.id}-${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from("professional-images").upload(path, coverImage);
                if (!upErr) coverImageUrl = supabase.storage.from("professional-images").getPublicUrl(path).data.publicUrl;
            }

            const { error } = await supabase.from("professionals").insert({
                user_id: user.id,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                crm_crp: formData.crm_crp,
                specialty: SPECIALTY_CATEGORIES[formData.specialty.split(".")[0] as any]?.specialties.find(s => s.value === formData.specialty)?.label || "Profissional",
                telemedicina_servico_id: formData.telemedicina_servico_id,
                base_price: formData.base_price ? parseFloat(formData.base_price) : null,
                bio: formData.bio,
                instagram: formData.instagram,
                profile_image_url: profileImageUrl,
                cover_image_url: coverImageUrl,
            });

            if (error) throw error;

            toast({ title: "Bem-vindo!", description: "Seu perfil foi criado com sucesso." });
            navigate("/professional/dashboard");
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Dados Pessoais</h2>
                            <p className="text-zinc-500 text-sm">Como você quer ser chamado pelos alunos?</p>
                        </div>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Nome Completo</Label>
                                <Input
                                    placeholder="Ex: Dr. João Silva"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5 focus:border-primary/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Especialidade Principal</Label>
                                <Select value={formData.specialty} onValueChange={(v) => setFormData({ ...formData, specialty: v })}>
                                    <SelectTrigger className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10">
                                        {Object.entries(SPECIALTY_CATEGORIES).map(([key, category]) => (
                                            <div key={key}>
                                                <div className="px-2 py-1.5 text-[10px] font-black uppercase text-zinc-500 bg-white/5">{category.label}</div>
                                                {category.specialties.map(spec => (
                                                    <SelectItem key={spec.value} value={spec.value} className="text-white">{spec.label}</SelectItem>
                                                ))}
                                            </div>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button onClick={handleNext} className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Continuar <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Registro Profissional</h2>
                            <p className="text-zinc-500 text-sm">Estas informações dão credibilidade ao seu perfil.</p>
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
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest pl-1">Serviço de Telemedicina</Label>
                                <Select value={formData.telemedicina_servico_id} onValueChange={(v) => setFormData({ ...formData, telemedicina_servico_id: v })}>
                                    <SelectTrigger className="h-14 bg-white/5 border-white/5 text-white rounded-2xl px-5">
                                        <SelectValue placeholder="Onde você se encaixa?" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10">
                                        {telemedicinaServices.map(service => (
                                            <SelectItem key={service.id} value={service.id} className="text-white">{service.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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

    return (
        <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-20 pointer-events-none">
                <div className="h-80 w-80 bg-primary rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
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
            </div>
        </main>
    );
}
