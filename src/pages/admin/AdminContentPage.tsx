
import { useState, useEffect, ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardOutdoorAdminPanel } from "@/components/admin/DashboardOutdoorAdminPanel";

export const AdminContentPage = () => {
    const { toast } = useToast();
    const [loadingAiConfig, setLoadingAiConfig] = useState(false);
    const [savingAiConfig, setSavingAiConfig] = useState(false);

    // Dr. Bio State
    const [aiProvider, setAiProvider] = useState<"api_ninjas_nutrition" | "openai_vision" | "custom_endpoint">("api_ninjas_nutrition");
    const [aiApiKey, setAiApiKey] = useState("");
    const [showAiApiKey, setShowAiApiKey] = useState(false);
    const [aiBaseUrl, setAiBaseUrl] = useState("");
    const [aiSystemContext, setAiSystemContext] = useState("");
    const [aiInstructions, setAiInstructions] = useState("");

    // Test Dr. Bio State
    const [testPrompt, setTestPrompt] = useState("");
    const [testLoading, setTestLoading] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);
    const [testRawGatewayResponse, setTestRawGatewayResponse] = useState("");
    const [testAiResponse, setTestAiResponse] = useState("");

    // Load AI Config
    useEffect(() => {
        const loadConfig = async () => {
            setLoadingAiConfig(true);
            try {
                const { data, error } = await supabase.from("config_ai_agents").select("*").eq("agent_key", "dr_bio").single();
                if (error && error.code !== "PGRST116") throw error; // Ignore not found

                if (data) {
                    setAiProvider(data.provider as any || "api_ninjas_nutrition");
                    setAiApiKey(data.api_key || "");
                    setAiBaseUrl(data.base_url || "");
                    setAiSystemContext(data.system_context || "");
                    setAiInstructions(data.instructions_layer || "");
                }
            } catch (error: any) {
                toast({ title: "Erro ao carregar configurações", description: error.message, variant: "destructive" });
            } finally {
                setLoadingAiConfig(false);
            }
        };
        loadConfig();
    }, []);

    const handleSaveAiConfig = async () => {
        setSavingAiConfig(true);
        try {
            const { error } = await supabase.from("config_ai_agents").upsert({
                agent_key: "dr_bio",
                provider: aiProvider,
                api_key: aiApiKey,
                base_url: aiBaseUrl,
                system_context: aiSystemContext,
                instructions_layer: aiInstructions,
                updated_at: new Date().toISOString()
            }, { onConflict: "agent_key" });

            if (error) throw error;
            toast({ title: "Sucesso", description: "Configurações do Dr. Bio salvas." });
        } catch (error: any) {
            toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        } finally {
            setSavingAiConfig(false);
        }
    };

    const handleTestDrBio = async () => {
        if (!testPrompt.trim()) return;
        setTestLoading(true);
        setTestError(null);
        setTestRawGatewayResponse("");
        setTestAiResponse("");

        try {
            const { data, error } = await supabase.functions.invoke("dr-bio-agent", {
                body: {
                    action: "chat",
                    message: testPrompt,
                    debug: true,
                    // Pass current config to test without waiting for DB propagation if function supports it,
                    // otherwise it relies on DB. Assuming DB for now or function reads DB.
                    // For safety, we saved first? No, UI says "Save" button. 
                }
            });

            if (error) throw error;

            // Assuming response format matches AdminMaster analysis
            if (data?.reply) setTestAiResponse(data.reply);
            if (data?.debug_info) setTestRawGatewayResponse(JSON.stringify(data.debug_info, null, 2));

        } catch (error: any) {
            setTestError(error.message);
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gestão de Conteúdo</h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie o Dr. Bio, Outdoors e Destaques.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="outdoor" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-black/20 border-white/10">
                    <TabsTrigger value="outdoor">Outdoor / Banners</TabsTrigger>
                    <TabsTrigger value="dr-bio">Agente Dr. Bio</TabsTrigger>
                </TabsList>

                <TabsContent value="outdoor" className="mt-4">
                    <DashboardOutdoorAdminPanel />
                </TabsContent>

                <TabsContent value="dr-bio" className="mt-4 space-y-4">
                    <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-white">Configurações do Dr. Bio</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* API Gateway */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Gateway de API</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Provedor</Label>
                                        <Select value={aiProvider} onValueChange={(v: any) => setAiProvider(v)}>
                                            <SelectTrigger className="bg-black/20 border-white/10"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="api_ninjas_nutrition">API-Ninjas Nutrition</SelectItem>
                                                <SelectItem value="openai_vision">OpenAI Vision</SelectItem>
                                                <SelectItem value="custom_endpoint">Custom Endpoint</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>API Key</Label>
                                        <div className="relative">
                                            <Input
                                                type={showAiApiKey ? "text" : "password"}
                                                value={aiApiKey}
                                                onChange={e => setAiApiKey(e.target.value)}
                                                className="bg-black/20 border-white/10 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowAiApiKey(!showAiApiKey)}
                                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-white"
                                            >
                                                {showAiApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Endpoint Base</Label>
                                        <Input value={aiBaseUrl} onChange={e => setAiBaseUrl(e.target.value)} className="bg-black/20 border-white/10" />
                                    </div>
                                </div>
                            </div>

                            {/* Personality */}
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Personalidade</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Contexto do Sistema</Label>
                                        <Textarea
                                            value={aiSystemContext}
                                            onChange={e => setAiSystemContext(e.target.value)}
                                            rows={5}
                                            className="bg-black/20 border-white/10"
                                            placeholder="Ex: Você é um nutricionista..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Instruções de Camada</Label>
                                        <Textarea
                                            value={aiInstructions}
                                            onChange={e => setAiInstructions(e.target.value)}
                                            rows={5}
                                            className="bg-black/20 border-white/10"
                                            placeholder="Instruções para processar dados da API..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sandbox */}
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Teste Rápido</h3>
                                    <Button size="sm" onClick={handleTestDrBio} disabled={testLoading || savingAiConfig}>
                                        {testLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Testar"}
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        value={testPrompt}
                                        onChange={e => setTestPrompt(e.target.value)}
                                        placeholder="Digite uma mensagem de teste..."
                                        className="bg-black/20 border-white/10"
                                    />
                                </div>
                                {testError && <p className="text-xs text-red-400">{testError}</p>}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Resposta Formatada</Label>
                                        <Textarea readOnly value={testAiResponse} rows={4} className="bg-black/20 border-white/10 text-xs" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Debug Raw</Label>
                                        <Textarea readOnly value={testRawGatewayResponse} rows={4} className="bg-black/20 border-white/10 text-xs font-mono" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-white/10">
                                <Button onClick={handleSaveAiConfig} disabled={savingAiConfig} className="bg-green-600 hover:bg-green-700">
                                    {savingAiConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Configurações"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminContentPage;
