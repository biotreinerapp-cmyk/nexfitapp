import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import {
    GraduationCap,
    Play,
    Search,
    Loader2,
    Lock,
    Unlock,
    DollarSign,
    Star,
    Video,
    Clock,
    Flame,
    Zap,
    BookOpen
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export default function ProfessionalEducationPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedContent, setSelectedContent] = useState<any>(null);
    const [purchasing, setPurchasing] = useState(false);

    // Fetch Marketplace Contents
    const { data: contents, isLoading: loadingMarketplace, refetch: refetchMarketplace } = useQuery({
        queryKey: ["educational-marketplace"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("educational_contents")
                .select(`
                    *,
                    professional:professionals(id, profiles(display_name, avatar_url))
                `)
                .eq("is_published", true)
                .neq("professional_id", (await supabase.from("professionals").select("id").eq("user_id", user?.id).single()).data?.id);

            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    // Fetch My Purchases
    const { data: myPurchases, isLoading: loadingPurchases, refetch: refetchPurchases } = useQuery({
        queryKey: ["educational-purchases"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("educational_purchases")
                .select(`
                    *,
                    content:educational_contents(*)
                `)
                .eq("buyer_id", user?.id);

            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    const handlePurchase = async (content: any) => {
        setPurchasing(true);
        try {
            const { error } = await supabase
                .from("educational_purchases")
                .insert({
                    buyer_id: user?.id,
                    content_id: content.id
                });

            if (error) throw error;

            toast({
                title: "Acesso Liberado!",
                description: `Você agora tem acesso vitalício a ${content.title}.`
            });

            refetchPurchases();
            setSelectedContent(null);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro na aquisição", variant: "destructive" });
        } finally {
            setPurchasing(false);
        }
    };

    const isPurchased = (contentId: string) => {
        return myPurchases?.some((p: any) => p.content_id === contentId);
    };

    const filteredMarketplace = contents?.filter((c: any) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-black pb-28 safe-bottom-floating-nav">
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
                <div className="flex items-center gap-4">
                    <BackIconButton />
                    <h1 className="text-xl font-black uppercase tracking-tight text-white italic">e-Education</h1>
                </div>
            </div>

            <section className="px-4 py-6 space-y-8 max-w-lg mx-auto">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <Input
                        placeholder="Pesquisar treinamentos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus:border-primary/50 transition-all font-bold"
                    />
                </div>

                {/* My Learning */}
                {myPurchases && myPurchases.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Meus Acessos</h2>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                            {myPurchases.map((purchase: any) => (
                                <button
                                    key={purchase.id}
                                    onClick={() => navigate(`/professional/education/player/${purchase.content.id}`)}
                                    className="shrink-0 w-40 space-y-2 group"
                                >
                                    <div className="relative aspect-square rounded-3xl overflow-hidden bg-zinc-900 border border-white/5">
                                        {purchase.content.thumbnail_url ? (
                                            <img src={purchase.content.thumbnail_url} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-zinc-800">
                                                <GraduationCap className="h-10 w-10" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                                <Play className="h-4 w-4 text-black fill-black" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-[11px] font-black text-white uppercase text-center truncate px-2">{purchase.content.title}</h3>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Featured / Feed */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Em Destaque</h2>
                    </div>

                    {loadingMarketplace ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredMarketplace?.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 rounded-[32px] border border-dashed border-white/10">
                            <Zap className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
                            <p className="text-sm font-bold text-zinc-500">Nenhum conteúdo novo por enquanto.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {filteredMarketplace?.map((content: any) => (
                                <div
                                    key={content.id}
                                    onClick={() => setSelectedContent(content)}
                                    className="group relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] flex flex-col cursor-pointer transition-all hover:border-primary/20"
                                >
                                    <div className="relative aspect-[16/9] overflow-hidden">
                                        {content.thumbnail_url ? (
                                            <img src={content.thumbnail_url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                                                <Video className="h-12 w-12 text-zinc-800" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4 h-8 px-4 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center text-[10px] font-black text-primary uppercase tracking-tighter">
                                            {content.type}
                                        </div>
                                        <div className="absolute bottom-4 right-4 h-8 px-4 rounded-full bg-primary text-black flex items-center text-[11px] font-black uppercase shadow-lg">
                                            {isPurchased(content.id) ? "Adquirido" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(content.price)}
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-white/10 overflow-hidden border border-white/10">
                                                {content.professional?.profiles?.avatar_url && (
                                                    <img src={content.professional.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">{content.professional?.profiles?.display_name || "Profissional Nexfit"}</span>
                                        </div>
                                        <h3 className="text-lg font-black text-white uppercase leading-tight">{content.title}</h3>
                                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed font-medium">{content.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Content Preview Dialog */}
            <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
                <DialogContent className="bg-zinc-950 border-white/5 rounded-[40px] max-w-lg p-0 overflow-hidden outline-none">
                    {selectedContent && (
                        <div className="space-y-0 relative">
                            <div className="relative aspect-video">
                                {selectedContent.thumbnail_url ? (
                                    <img src={selectedContent.thumbnail_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full bg-zinc-900" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                            </div>

                            <div className="p-8 -mt-12 relative z-10 space-y-6">
                                <div className="space-y-4">
                                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase italic tracking-wider border border-primary/20">
                                        {selectedContent.type}
                                    </span>
                                    <DialogTitle className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                                        {selectedContent.title}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-zinc-400 leading-relaxed font-medium">
                                        {selectedContent.description}
                                    </DialogDescription>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 p-4 rounded-3xl bg-white/5 border border-white/5">
                                        <Clock className="h-4 w-4 text-primary" />
                                        <div>
                                            <p className="text-[9px] font-black text-zinc-500 uppercase">Acesso</p>
                                            <p className="text-xs font-bold text-white uppercase italic">Vitalício</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-3xl bg-white/5 border border-white/5">
                                        <Star className="h-4 w-4 text-yellow-500" />
                                        <div>
                                            <p className="text-[9px] font-black text-zinc-500 uppercase">Certificado</p>
                                            <p className="text-xs font-bold text-white uppercase italic">Incluso</p>
                                        </div>
                                    </div>
                                </div>

                                {isPurchased(selectedContent.id) ? (
                                    <Button
                                        onClick={() => {
                                            setSelectedContent(null);
                                            navigate(`/professional/education/player/${selectedContent.id}`);
                                        }}
                                        className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-tight text-lg shadow-xl shadow-primary/10 hover:scale-[1.02] transition-all"
                                    >
                                        Acessar Conteúdo
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => handlePurchase(selectedContent)}
                                        disabled={purchasing}
                                        className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-tight text-lg shadow-xl shadow-white/5 hover:scale-[1.02] transition-all"
                                    >
                                        {purchasing ? <Loader2 className="h-6 w-6 animate-spin" /> : `Adquirir por ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedContent.price)}`}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ProfessionalFloatingNavIsland />
        </main>
    );
}
