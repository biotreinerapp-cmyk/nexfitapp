import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";

export const WithdrawalRequestsManager = () => {
    const { data: withdrawals = [], isLoading } = useQuery({
        queryKey: ["professional-withdrawals"],
        queryFn: async () => {
            // Check if table exists by attempting to query it
            const { data, error } = await supabase
                .from("professional_withdrawals")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Withdrawal query error:", error);
                return [];
            }
            return data || [];
        },
    });

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
        <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white">Solicitações de Saque</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Gerencie solicitações de saque dos profissionais
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-yellow-400">Funcionalidade em Desenvolvimento</p>
                            <p className="text-xs text-yellow-400/80">
                                A tabela <code className="rounded bg-black/20 px-1 py-0.5">professional_withdrawals</code> será criada
                                automaticamente quando o primeiro profissional solicitar um saque através do sistema.
                            </p>
                            <p className="text-xs text-yellow-400/80 mt-2">
                                Até lá, esta aba permanecerá vazia. A funcionalidade completa de aprovação estará disponível assim
                                que houver solicitações pendentes.
                            </p>
                        </div>
                    </div>
                </div>

                {withdrawals.length > 0 && (
                    <div className="mt-4">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5">
                                    <TableHead className="text-muted-foreground">Profissional</TableHead>
                                    <TableHead className="text-muted-foreground">Valor</TableHead>
                                    <TableHead className="text-muted-foreground">Taxa</TableHead>
                                    <TableHead className="text-muted-foreground">Líquido</TableHead>
                                    <TableHead className="text-muted-foreground">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {withdrawals.map((withdrawal: any) => (
                                    <TableRow key={withdrawal.id} className="border-white/5 hover:bg-white/5">
                                        <TableCell className="text-white">{withdrawal.professional_id}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            R$ {((withdrawal.amount || 0) / 100).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{withdrawal.fee_percent}%</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            R$ {((withdrawal.net_amount || 0) / 100).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={
                                                    withdrawal.status === "paid"
                                                        ? "bg-green-500/20 text-green-400"
                                                        : withdrawal.status === "pending"
                                                            ? "bg-yellow-500/20 text-yellow-400"
                                                            : "bg-red-500/20 text-red-400"
                                                }
                                            >
                                                {withdrawal.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
