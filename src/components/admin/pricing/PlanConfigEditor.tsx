import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PlanConfig = {
    plan: "FREE" | "ADVANCE" | "ELITE";
    price_cents: number;
    features: string[];
};

export const PlanConfigEditor = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState<string | null>(null);

    const { data: planConfigs = [], isLoading } = useQuery<PlanConfig[]>({
        queryKey: ["plan-configs"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("plan_configs")
                .select("*")
                .order("plan");
            if (error) throw error;
            return data || [];
        },
    });

    const [editedConfigs, setEditedConfigs] = useState<Record<string, Partial<PlanConfig>>>({});

    const handlePriceChange = (plan: string, value: string) => {
        // Remove tudo exceto números e ponto decimal
        const cleanValue = value.replace(/[^\d.]/g, '');
        const floatValue = parseFloat(cleanValue) || 0;
        const cents = Math.round(floatValue * 100);
        setEditedConfigs((prev) => ({
            ...prev,
            [plan]: { ...prev[plan], price_cents: cents },
        }));
    };

    const handleSave = async (plan: string) => {
        const edited = editedConfigs[plan];
        if (!edited) return;

        setSaving(plan);
        try {
            const { error } = await supabase
                .from("plan_configs")
                .update({ price_cents: edited.price_cents })
                .eq("plan", plan);

            if (error) throw error;

            toast({ title: "Salvo", description: `Preço do plano ${plan} atualizado.` });
            queryClient.invalidateQueries({ queryKey: ["plan-configs"] });
            setEditedConfigs((prev) => {
                const newState = { ...prev };
                delete newState[plan];
                return newState;
            });
        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        } finally {
            setSaving(null);
        }
    };

    const getCurrentPrice = (planConfig: PlanConfig) => {
        return editedConfigs[planConfig.plan]?.price_cents ?? planConfig.price_cents;
    };

    const getDisplayValue = (planConfig: PlanConfig) => {
        const cents = getCurrentPrice(planConfig);
        return (cents / 100).toFixed(2);
    };

    const hasChanges = (plan: string) => {
        return editedConfigs[plan] !== undefined;
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
        <div className="grid gap-4 md:grid-cols-3">
            {planConfigs.map((config) => (
                <Card key={config.plan} className="border-white/5 bg-white/5 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-white">
                            <span>{config.plan}</span>
                            <Badge
                                variant="outline"
                                className={
                                    config.plan === "FREE"
                                        ? "border-gray-500/50 bg-gray-500/10"
                                        : config.plan === "ADVANCE"
                                            ? "border-blue-500/50 bg-blue-500/10"
                                            : "border-purple-500/50 bg-purple-500/10"
                                }
                            >
                                {config.plan === "FREE" ? "Grátis" : config.plan === "ADVANCE" ? "Intermediário" : "Premium"}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-white">Preço Mensal</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        R$
                                    </span>
                                    <Input
                                        type="text"
                                        value={getDisplayValue(config)}
                                        onChange={(e) => handlePriceChange(config.plan, e.target.value)}
                                        className="bg-black/20 border-white/10 pl-10"
                                        disabled={config.plan === "FREE"}
                                        placeholder="0,00"
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    onClick={() => handleSave(config.plan)}
                                    disabled={!hasChanges(config.plan) || saving === config.plan || config.plan === "FREE"}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {saving === config.plan ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Valor em centavos: {getCurrentPrice(config)}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Features</Label>
                            <div className="rounded-md border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
                                {config.features.length > 0 ? (
                                    <ul className="list-inside list-disc space-y-1">
                                        {config.features.map((feature, idx) => (
                                            <li key={idx}>{feature}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span className="italic">Nenhuma feature configurada</span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
