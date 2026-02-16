import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, DollarSign, Percent } from "lucide-react";

type PricingConfig = {
    key: string;
    value_cents: number | null;
    value_percent: number | null;
    config_type: "fixed" | "percentage";
    description: string | null;
};

export const ProfessionalPricingConfig = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState<string | null>(null);
    const [editedValues, setEditedValues] = useState<Record<string, number>>({});

    const { data: configs = [], isLoading } = useQuery<PricingConfig[]>({
        queryKey: ["platform-pricing-configs"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("platform_pricing_configs")
                .select("*")
                .order("key");
            if (error) throw error;
            return data || [];
        },
    });

    const handleValueChange = (key: string, value: string) => {
        const config = configs.find(c => c.key === key);
        if (!config) return;

        if (config.config_type === "fixed") {
            // Para valores fixos, limpa e converte para centavos
            const cleanValue = value.replace(/[^\d.]/g, '');
            const floatValue = parseFloat(cleanValue) || 0;
            setEditedValues((prev) => ({ ...prev, [key]: floatValue }));
        } else {
            // Para porcentagem, aceita decimais
            const cleanValue = value.replace(/[^\d.]/g, '');
            const numValue = parseFloat(cleanValue) || 0;
            setEditedValues((prev) => ({ ...prev, [key]: numValue }));
        }
    };

    const handleSave = async (config: PricingConfig) => {
        const newValue = editedValues[config.key];
        if (newValue === undefined) return;

        setSaving(config.key);
        try {
            const updateData =
                config.config_type === "fixed"
                    ? { value_cents: Math.round(newValue * 100) }
                    : { value_percent: newValue };

            const { error } = await supabase
                .from("platform_pricing_configs")
                .update(updateData)
                .eq("key", config.key);

            if (error) throw error;

            toast({ title: "Salvo", description: "Configuração atualizada com sucesso." });
            queryClient.invalidateQueries({ queryKey: ["platform-pricing-configs"] });
            setEditedValues((prev) => {
                const newState = { ...prev };
                delete newState[config.key];
                return newState;
            });
        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        } finally {
            setSaving(null);
        }
    };

    const getCurrentValue = (config: PricingConfig): number => {
        if (editedValues[config.key] !== undefined) {
            return editedValues[config.key];
        }
        return config.config_type === "fixed"
            ? (config.value_cents || 0) / 100
            : config.value_percent || 0;
    };

    const getDisplayValue = (config: PricingConfig): string => {
        const value = getCurrentValue(config);
        // Se estiver editando, mostra o valor editado sem formatting
        if (editedValues[config.key] !== undefined) {
            return value.toString();
        }
        // Se não estiver editando, mostra formatado
        return config.config_type === "fixed" ? value.toFixed(2) : value.toFixed(1);
    };

    const hasChanges = (key: string) => editedValues[key] !== undefined;

    const getConfigLabel = (key: string): string => {
        const labels: Record<string, string> = {
            lp_activation_price: "Ativação de Landing Page",
            platform_fee_percent: "Taxa da Plataforma",
            withdrawal_15d_fee: "Taxa de Saque (15 dias)",
            withdrawal_30d_fee: "Taxa de Saque (30 dias)",
        };
        return labels[key] || key;
    };

    if (isLoading) {
        return (
            <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white">Configurações de Precificação Profissional</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Gerencie taxas e valores relacionados aos serviços profissionais
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {configs.map((config) => (
                        <div key={config.key} className="flex items-end gap-4 rounded-lg border border-white/10 bg-black/20 p-4">
                            <div className="flex-1 space-y-2">
                                <Label className="text-white flex items-center gap-2">
                                    {config.config_type === "fixed" ? (
                                        <DollarSign className="h-4 w-4 text-green-400" />
                                    ) : (
                                        <Percent className="h-4 w-4 text-blue-400" />
                                    )}
                                    {getConfigLabel(config.key)}
                                </Label>
                                {config.config_type === "fixed" ? (
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                            R$
                                        </span>
                                        <Input
                                            type="text"
                                            value={getDisplayValue(config)}
                                            onChange={(e) => handleValueChange(config.key, e.target.value)}
                                            className="bg-black/20 border-white/10 pl-10"
                                            placeholder="0,00"
                                        />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            value={getDisplayValue(config)}
                                            onChange={(e) => handleValueChange(config.key, e.target.value)}
                                            className="bg-black/20 border-white/10 pr-8"
                                            placeholder="0,0"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                            %
                                        </span>
                                    </div>
                                )}
                                {config.description && (
                                    <p className="text-xs text-muted-foreground">{config.description}</p>
                                )}
                            </div>
                            <Button
                                size="sm"
                                onClick={() => handleSave(config)}
                                disabled={!hasChanges(config.key) || saving === config.key}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {saving === config.key ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar
                                    </>
                                )}
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};
