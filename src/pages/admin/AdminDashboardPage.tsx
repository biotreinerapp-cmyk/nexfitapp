
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Activity, ArrowUpRight, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const AdminDashboardPage = () => {
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [stats, setStats] = useState({
        users: 0,
        revenue: 0,
        activeNow: 0,
    });

    useEffect(() => {
        const fetchStats = async () => {
            // Fetch real user count
            const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });

            // Mocked revenue for now as we don't have a transactions table sum ready in this context
            // In a real scenario we would sum the 'pagamentos' table where status = approved

            setStats({
                users: count || 0,
                revenue: 12450.00, // Placeholder
                activeNow: 12, // Placeholder
            });
        };
        fetchStats();
    }, []);

    const handleResyncExercises = async () => {
        try {
            setIsSyncing(true);
            const { data, error } = await supabase.functions.invoke("sync-exercises", {});
            if (error) throw error;
            toast({
                title: "Sincronização iniciada",
                description: `Biblioteca atualizada com ${data?.imported ?? 0} novos exercícios.`,
            });
        } catch (error) {
            toast({
                title: "Erro na sincronização",
                description: "Falha ao conectar com ExerciseDB.",
                variant: "destructive",
            });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Visão geral do sistema.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResyncExercises}
                        disabled={isSyncing}
                        className="border-white/10 bg-white/5 text-xs hover:bg-white/10"
                    >
                        <Repeat className={`mr-2 h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                        Sincronizar Exercícios
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-white/5 bg-white/5 backdrop-blur-sm transition-all hover:bg-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Totais</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.users}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <span className="text-green-500 flex items-center mr-1">
                                +12% <ArrowUpRight className="h-3 w-3 ml-0.5" />
                            </span>
                            desde o último mês
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-white/5 backdrop-blur-sm transition-all hover:bg-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Receita Estimada</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <span className="text-green-500 flex items-center mr-1">
                                +8.5% <ArrowUpRight className="h-3 w-3 ml-0.5" />
                            </span>
                            referente a planos ativos
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-white/5 backdrop-blur-sm transition-all hover:bg-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ativos Agora</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.activeNow}</div>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-[45%] rounded-full bg-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-white/5 bg-white/5 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white">Transações Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 text-muted-foreground">
                            Gráfico de Receita (Em Breve)
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-white/5 bg-white/5 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white">Novos Usuários</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="h-9 w-9 rounded-full bg-white/10" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-white leading-none">Usuário {i}</p>
                                        <p className="text-xs text-muted-foreground">usuario{i}@email.com</p>
                                    </div>
                                    <div className="ml-auto font-medium text-green-500 text-xs">+ Plan Elite</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
