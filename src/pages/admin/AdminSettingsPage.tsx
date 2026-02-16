
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettingsPixPanel } from "@/components/admin/GeneralSettingsPixPanel";

export const AdminSettingsPage = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Configurações Gerais</h1>
                    <p className="text-sm text-muted-foreground">
                        Ajustes de sistema, financeiro e permissões.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="pix" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-black/20 border-white/10">
                    <TabsTrigger value="pix">Meios de Pagamento (Pix)</TabsTrigger>
                    <TabsTrigger value="plans">Planos e Permissões</TabsTrigger>
                </TabsList>

                <TabsContent value="pix" className="mt-4">
                    <GeneralSettingsPixPanel />
                </TabsContent>

                <TabsContent value="plans" className="mt-4">
                    <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-white">Planos e Permissões</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Configurações dos planos de assinatura serão implementadas aqui.
                                Por enquanto, os valores são definidos nos Meios de Pagamento.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminSettingsPage;
