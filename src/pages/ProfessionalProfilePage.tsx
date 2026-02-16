import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Save, User, Camera, ArrowLeft, Loader2 } from "lucide-react";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";
import { SPECIALTY_CATEGORIES, getSpecialtyLabel } from "@/lib/professionalSpecialties";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProfessionalProfilePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: "",
        crm_crp: "",
        specialty: "",
        telemedicina_servico_id: "",
        base_price: "",
        bio: "",
        phone: "",
        email: "",
        instagram: "",
    });

    const [telemedicinaServices, setTelemedicinaServices] = useState<any[]>([]);

    useEffect(() => {
        loadProfile();
    }, [user]);

    const loadProfile = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from("professionals")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (error) throw error;

            setProfile(data);

            // Fetch services
            const { data: services } = await supabase
                .from("telemedicina_servicos")
                .select("*")
                .eq("ativo", true);
            if (services) setTelemedicinaServices(services);

            setFormData({
                name: data.name || "",
                crm_crp: data.crm_crp || "",
                specialty: data.specialty || "",
                telemedicina_servico_id: data.telemedicina_servico_id || "",
                base_price: data.base_price?.toString() || "",
                bio: data.bio || "",
                phone: data.phone || "",
                email: data.email || "",
                instagram: data.instagram || "",
            });
        } catch (error: any) {
            console.error("Load profile error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user || !profile) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("professionals")
                .update({
                    name: formData.name,
                    crm_crp: formData.crm_crp,
                    specialty: formData.specialty,
                    telemedicina_servico_id: formData.telemedicina_servico_id,
                    base_price: formData.base_price ? parseFloat(formData.base_price) : null,
                    bio: formData.bio,
                    phone: formData.phone,
                    email: formData.email,
                    instagram: formData.instagram,
                })
                .eq("id", profile.id);

            if (error) throw error;

            toast({
                title: "Perfil atualizado",
                description: "Suas informações foram salvas com sucesso.",
            });
        } catch (error: any) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black pb-28 pt-6 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Meu Perfil</h1>
                    </div>
                </header>



                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-white">Informações Básicas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-white">Nome Completo</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-black/20 border-white/10 text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-white">Registro (CRM/CRP/CREF)</Label>
                                <Input
                                    value={formData.crm_crp}
                                    onChange={(e) => setFormData({ ...formData, crm_crp: e.target.value })}
                                    className="bg-black/20 border-white/10 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">Preço Base (R$)</Label>
                                <Input
                                    type="number"
                                    value={formData.base_price}
                                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                                    className="bg-black/20 border-white/10 text-white"
                                />
                                <p className="text-[10px] text-zinc-500">
                                    Sobre este valor incidirá uma taxa automática de 15% da plataforma Nexfit.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-white">Especialidade (Marketplace)</Label>
                                <Select value={formData.specialty} onValueChange={(value) => setFormData({ ...formData, specialty: value })}>
                                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10">
                                        {Object.entries(SPECIALTY_CATEGORIES).map(([key, category]) => (
                                            <div key={key}>
                                                <div className="px-2 py-1.5 text-xs font-bold uppercase text-muted-foreground bg-white/5">
                                                    {category.label}
                                                </div>
                                                {category.specialties.map((spec) => (
                                                    <SelectItem key={spec.value} value={spec.value} className="text-white">
                                                        {spec.label}
                                                    </SelectItem>
                                                ))}
                                            </div>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">Serviço Telemedicina</Label>
                                <Select
                                    value={formData.telemedicina_servico_id}
                                    onValueChange={(value) => setFormData({ ...formData, telemedicina_servico_id: value })}
                                >
                                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10">
                                        {telemedicinaServices?.map((service) => (
                                            <SelectItem key={service.id} value={service.id} className="text-white">
                                                {service.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Bio / Descrição Profissional</Label>
                            <Textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="bg-black/20 border-white/10 text-white resize-none"
                                rows={5}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-white">Contato & Redes Sociais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-white">Email Profissional</Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="bg-black/20 border-white/10 text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-white">WhatsApp</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="bg-black/20 border-white/10 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">Instagram</Label>
                                <Input
                                    value={formData.instagram}
                                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                    className="bg-black/20 border-white/10 text-white"
                                    placeholder="@perfil"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-black hover:bg-primary/90 py-6 text-lg font-bold uppercase tracking-tight">
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-5 w-5" />
                            Salvar Alterações
                        </>
                    )}
                </Button>
            </div>
            <ProfessionalFloatingNavIsland />
        </main>
    );
}
