import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type PixConfig = {
    id: string;
    pix_key: string;
    receiver_name: string;
    cidade: string | null;
    store_id: string | null;
    marketplace_store_id: string | null;
};

export const PixConfigManager = () => {
    const { data: pixConfigs = [], isLoading } = useQuery<PixConfig[]>({
        queryKey: ["pix-configs"],
        queryFn: async () => {
            const { data, error } = await supabase.from("pix_configs").select("*");
            if (error) throw error;
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
                <CardTitle className="text-white">Configurações PIX</CardTitle>
            </CardHeader>
            <CardContent>
                {pixConfigs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-black/20 py-12 text-center">
                        <p className="text-sm text-muted-foreground">Nenhuma configuração PIX cadastrada</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            As chaves PIX são configuradas automaticamente pelos usuários
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/5">
                                <TableHead className="text-muted-foreground">Chave PIX</TableHead>
                                <TableHead className="text-muted-foreground">Nome do Recebedor</TableHead>
                                <TableHead className="text-muted-foreground">Cidade</TableHead>
                                <TableHead className="text-muted-foreground">Tipo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pixConfigs.map((config) => (
                                <TableRow key={config.id} className="border-white/5 hover:bg-white/5">
                                    <TableCell className="font-mono text-sm text-white">{config.pix_key}</TableCell>
                                    <TableCell className="text-muted-foreground">{config.receiver_name}</TableCell>
                                    <TableCell className="text-muted-foreground">{config.cidade || "-"}</TableCell>
                                    <TableCell>
                                        {config.marketplace_store_id ? (
                                            <Badge className="bg-blue-500/20 text-blue-400">Marketplace</Badge>
                                        ) : config.store_id ? (
                                            <Badge className="bg-green-500/20 text-green-400">Loja</Badge>
                                        ) : (
                                            <Badge className="bg-purple-500/20 text-purple-400">Plataforma</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};
