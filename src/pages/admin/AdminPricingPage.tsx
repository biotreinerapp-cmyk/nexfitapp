import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanConfigEditor } from "@/components/admin/pricing/PlanConfigEditor";
import { ProfessionalPricingConfig } from "@/components/admin/pricing/ProfessionalPricingConfig";
import { HighlightOffersManager } from "@/components/admin/pricing/HighlightOffersManager";
import { PixConfigManager } from "@/components/admin/pricing/PixConfigManager";
import { WithdrawalRequestsManager } from "@/components/admin/pricing/WithdrawalRequestsManager";

export const AdminPricingPage = () => {
    const [activeTab, setActiveTab] = useState("plans");

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Central de Cobranças</h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie preços, taxas e solicitações de pagamento em um só lugar.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-5 bg-white/5 border border-white/10">
                    <TabsTrigger value="plans" className="data-[state=active]:bg-primary/20">
                        Planos
                    </TabsTrigger>
                    <TabsTrigger value="professional" className="data-[state=active]:bg-primary/20">
                        Profissionais
                    </TabsTrigger>
                    <TabsTrigger value="marketplace" className="data-[state=active]:bg-primary/20">
                        Marketplace
                    </TabsTrigger>
                    <TabsTrigger value="pix" className="data-[state=active]:bg-primary/20">
                        PIX Configs
                    </TabsTrigger>
                    <TabsTrigger value="withdrawals" className="data-[state=active]:bg-primary/20">
                        Saques
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="plans" className="space-y-4">
                    <PlanConfigEditor />
                </TabsContent>

                <TabsContent value="professional" className="space-y-4">
                    <ProfessionalPricingConfig />
                </TabsContent>

                <TabsContent value="marketplace" className="space-y-4">
                    <HighlightOffersManager />
                </TabsContent>

                <TabsContent value="pix" className="space-y-4">
                    <PixConfigManager />
                </TabsContent>

                <TabsContent value="withdrawals" className="space-y-4">
                    <WithdrawalRequestsManager />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminPricingPage;
