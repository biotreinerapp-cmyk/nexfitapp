
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Key, Eye, EyeOff } from "lucide-react";

export function IntegrationSettingsPanel() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showToken, setShowToken] = useState(false);

    const [perfectPayToken, setPerfectPayToken] = useState("");

    useEffect(() => {
        fetchConfigs();
    }, []);

    async function fetchConfigs() {
        try {
            setLoading(true);
            const { data, error } = await (supabase as any)
                .from("integration_configs")
                .select("key, value")
                .eq("key", "perfectpay_webhook_token");

            if (error) throw error;

            if (data && data.length > 0) {
                setPerfectPayToken(data[0].value || "");
            }
        } catch (err: any) {
            console.error("Error fetching configs:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        try {
            setSaving(true);
            const update = {
                key: "perfectpay_webhook_token",
                value: perfectPayToken,
                is_secret: true,
                description: "Perfect Pay Webhook Security Token"
            };

            const { error } = await (supabase as any)
                .from("integration_configs")
                .upsert(update);

            if (error) throw error;

            toast({
                title: "Configurações salvas",
                description: "O token da Perfect Pay foi atualizado com sucesso.",
            });
        } catch (err: any) {
            toast({
                title: "Erro ao salvar",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-green-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 py-2">
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                <p className="text-xs text-yellow-200/80">
                    <strong>Atenção:</strong> O token abaixo é usado para validar as notificações enviadas pela Perfect Pay. Certifique-se de que ele corresponde ao configurado na plataforma deles.
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="perfectpay_token" className="text-sm font-medium text-white flex items-center gap-2">
                        <Key className="h-4 w-4 text-green-500" />
                        Perfect Pay Webhook Token
                    </Label>
                    <div className="relative">
                        <Input
                            id="perfectpay_token"
                            type={showToken ? "text" : "password"}
                            placeholder="Insira o token da Perfect Pay..."
                            value={perfectPayToken}
                            onChange={(e) => setPerfectPayToken(e.target.value)}
                            className="bg-black/20 border-white/10 text-white pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                        >
                            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Este token é essencial para a segurança das transações automatizadas.</p>
                </div>
            </div>

            <div className="pt-4">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Integrações
                </Button>
            </div>
        </div>
    );
}
