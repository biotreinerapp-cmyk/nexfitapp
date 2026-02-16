
import { Bell, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewsNotificationsAdminPanel } from "@/components/admin/NewsNotificationsAdminPanel";
import { HighlightOffersAdminPanel } from "@/components/admin/HighlightOffersAdminPanel";

export const AdminNotificationsPage = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Notificações</h1>
                    <p className="text-sm text-muted-foreground">
                        Central de avisos e gestão de push notifications.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="notifications" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-black/20 border-white/10">
                    <TabsTrigger value="notifications">
                        <Bell className="mr-2 h-4 w-4" />
                        Notificações
                    </TabsTrigger>
                    <TabsTrigger value="offers">
                        <Star className="mr-2 h-4 w-4" />
                        Ofertas Destaque
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="notifications" className="mt-4">
                    <NewsNotificationsAdminPanel />
                </TabsContent>

                <TabsContent value="offers" className="mt-4">
                    <HighlightOffersAdminPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminNotificationsPage;
