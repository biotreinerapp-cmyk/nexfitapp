import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Globe, Mail, ShieldCheck, Palette, HardDrive, KeyRound } from "lucide-react";

export const AdminSettingsPage = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<Record<string, string>>({
        app_name: "Nexfit",
        support_email: "",
        primary_color: "#10b981", // default emerald
        smtp_provider: "Resend",
        smtp_api_key: "",
        smtp_sender_email: "",
        smtp_sender_name: "Nexfit",
        terms_of_use_url: "",
        privacy_policy_url: "",
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('app_settings').select('key_name, key_value');
            if (error) throw error;

            if (data && data.length > 0) {
                const fetchedSettings: Record<string, string> = { ...settings };
                data.forEach(item => {
                    // Only merge if it's one of the keys we support here, or just merge all
                    fetchedSettings[item.key_name] = item.key_value || "";
                });
                setSettings(prev => ({ ...prev, ...fetchedSettings }));
            }
        } catch (error: any) {
            console.error("Error fetching settings:", error);
            toast({
                title: "Falha ao carregar configurações",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Because app_settings might not have a UNIQUE constraint on key_name in every DB state,
            // we do a graceful finding and updating to avoid constraint errors.
            for (const [key_name, key_value] of Object.entries(settings)) {
                // Ignore empty keys if they exist in state but not meant to be saved
                if (!key_name) continue;

                const { data: existing } = await supabase
                    .from('app_settings')
                    .select('id')
                    .eq('key_name', key_name)
                    .maybeSingle();

                if (existing) {
                    await supabase.from('app_settings').update({ key_value: String(key_value) }).eq('id', existing.id);
                } else {
                    await supabase.from('app_settings').insert({ key_name, key_value: String(key_value) });
                }
            }

            toast({
                title: "Sucesso!",
                description: "As configurações foram atualizadas com sucesso.",
            });
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({
                title: "Ops, ocorreu um erro",
                description: error.message || "Tente novamente mais tarde.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header Area */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between relative overflow-hidden rounded-2xl bg-gradient-to-br from-black/60 to-black/20 border border-white/5 p-8 backdrop-blur-xl">
                {/* Decorative blob */}
                <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none" />

                <div className="relative z-10 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                        <Globe className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">
                            Configurações do Sistema
                        </h1>
                        <p className="text-sm mt-1 text-zinc-400 max-w-lg leading-relaxed">
                            Ajuste os parâmetros globais da plataforma, defina integradores de e-mail e credenciais do aplicativo.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex items-center justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={loading || saving}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium border border-emerald-400/20 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Salvar Alterações
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-black/20 border border-white/5 rounded-2xl backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                    <p className="text-zinc-400 font-medium animate-pulse">Carregando configurações...</p>
                </div>
            ) : (
                <Tabs defaultValue="geral" className="w-full">
                    <TabsList className="flex w-full justify-start p-1 bg-black/40 border border-white/5 rounded-xl mb-6 overflow-x-auto">
                        <TabsTrigger value="geral" className="gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 data-[state=active]:shadow-none rounded-lg font-medium transition-all px-6">
                            <Palette className="w-4 h-4" />
                            Geral & Branding
                        </TabsTrigger>
                        <TabsTrigger value="smtp" className="gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 data-[state=active]:shadow-none rounded-lg font-medium transition-all px-6">
                            <Mail className="w-4 h-4" />
                            E-mail & SMTP
                        </TabsTrigger>
                        <TabsTrigger value="policies" className="gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 data-[state=active]:shadow-none rounded-lg font-medium transition-all px-6">
                            <ShieldCheck className="w-4 h-4" />
                            Políticas e Termos
                        </TabsTrigger>
                    </TabsList>

                    {/* GERAL & BRANDING TAB */}
                    <TabsContent value="geral" className="focus-visible:outline-none mt-0 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-transparent" />
                            <CardHeader>
                                <CardTitle className="text-xl text-white font-semibold flex items-center gap-2">
                                    <HardDrive className="w-5 h-5 text-emerald-400" />
                                    Identidade e Suporte
                                </CardTitle>
                                <CardDescription className="text-zinc-400">
                                    Como sua marca aparece no sistema e contatos para os usuários.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Nome do Aplicativo</Label>
                                        <Input
                                            value={settings.app_name}
                                            onChange={(e) => handleChange('app_name', e.target.value)}
                                            placeholder="Ex: Nexfit App"
                                            className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">E-mail de Suporte</Label>
                                        <Input
                                            type="email"
                                            value={settings.support_email}
                                            onChange={(e) => handleChange('support_email', e.target.value)}
                                            placeholder="suporte@seudominio.com"
                                            className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Cor Principal (HEX)</Label>
                                        <div className="flex gap-3 items-center">
                                            <div
                                                className="w-10 h-10 rounded-lg border border-white/20 shadow-inner flex-shrink-0"
                                                style={{ backgroundColor: settings.primary_color || '#10b981' }}
                                            />
                                            <Input
                                                value={settings.primary_color}
                                                onChange={(e) => handleChange('primary_color', e.target.value)}
                                                placeholder="#10b981"
                                                className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SMTP TAB */}
                    <TabsContent value="smtp" className="focus-visible:outline-none mt-0 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
                            <CardHeader>
                                <CardTitle className="text-xl text-white font-semibold flex items-center gap-2">
                                    <KeyRound className="w-5 h-5 text-blue-400" />
                                    Integração de Disparos de E-mail
                                </CardTitle>
                                <CardDescription className="text-zinc-400">
                                    Defina aqui o provedor e as chaves de API para notificações por e-mail (ex: Senhas, Boas vindas).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Provedor SMTP / API</Label>
                                        <Input
                                            value={settings.smtp_provider}
                                            onChange={(e) => handleChange('smtp_provider', e.target.value)}
                                            placeholder="Ex: Resend, Sendgrid, AWS SES"
                                            className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50 focus-visible:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Chave da API (Secret Key)</Label>
                                        <Input
                                            type="password"
                                            value={settings.smtp_api_key}
                                            onChange={(e) => handleChange('smtp_api_key', e.target.value)}
                                            placeholder="sk_..."
                                            className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50 focus-visible:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">E-mail do Remetente (Sender)</Label>
                                        <Input
                                            type="email"
                                            value={settings.smtp_sender_email}
                                            onChange={(e) => handleChange('smtp_sender_email', e.target.value)}
                                            placeholder="noreply@seudominio.com"
                                            className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50 focus-visible:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Nome do Remetente (Sender Name)</Label>
                                        <Input
                                            value={settings.smtp_sender_name}
                                            onChange={(e) => handleChange('smtp_sender_name', e.target.value)}
                                            placeholder="Ex: Equipe Nexfit"
                                            className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50 focus-visible:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* POLICIES TAB */}
                    <TabsContent value="policies" className="focus-visible:outline-none mt-0 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/50 to-transparent" />
                            <CardHeader>
                                <CardTitle className="text-xl text-white font-semibold flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-purple-400" />
                                    Políticas e Conformidade
                                </CardTitle>
                                <CardDescription className="text-zinc-400">
                                    Links públicos para os termos que regem o aplicativo.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">URL dos Termos de Uso</Label>
                                        <Input
                                            value={settings.terms_of_use_url}
                                            onChange={(e) => handleChange('terms_of_use_url', e.target.value)}
                                            placeholder="https://sua-url.com/termos"
                                            className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500/50 focus-visible:border-purple-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">URL da Política de Privacidade</Label>
                                        <Input
                                            value={settings.privacy_policy_url}
                                            onChange={(e) => handleChange('privacy_policy_url', e.target.value)}
                                            placeholder="https://sua-url.com/privacidade"
                                            className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500/50 focus-visible:border-purple-500"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export default AdminSettingsPage;
