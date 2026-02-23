import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { Briefcase, Plus, Search, Loader2, MapPin, Star, GraduationCap, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function ProfessionalConsultoriaPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [contents, setContents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchContents = async () => {
            if (!user) return;
            try {
                const { data: pro } = await supabase
                    .from("professionals")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();

                if (pro) {
                    const { data, error } = await supabase
                        .from("educational_contents")
                        .select("*")
                        .eq("professional_id", pro.id)
                        .order("created_at", { ascending: false });

                    if (error) throw error;
                    setContents(data || []);
                }
            } catch (error) {
                console.error("Error fetching consultancies:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchContents();
    }, [user]);

    const filteredContents = contents.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-black pb-28 safe-bottom-floating-nav">
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackIconButton />
                        <h1 className="text-xl font-black uppercase tracking-tight text-white italic">Minha Consultoria</h1>
                    </div>
                    <button
                        onClick={() => navigate("/professional/consultoria/gerenciar")}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-black hover:scale-105 transition-transform"
                    >
                        <Plus className="h-6 w-6" />
                    </button>
                </div>
            </div>

            <section className="px-4 py-8 space-y-6 max-w-lg mx-auto">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <Input
                        placeholder="Buscar conteúdo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus:border-primary/50 transition-all font-bold"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : filteredContents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Briefcase className="h-10 w-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Comece sua Mentoria</h2>
                            <p className="text-sm text-zinc-500 max-w-[280px] mx-auto">Crie cursos e programas de mentoria para comercializar na nossa rede e-Education.</p>
                        </div>
                        <button
                            onClick={() => navigate("/professional/consultoria/gerenciar")}
                            className="bg-primary text-black px-6 py-3 rounded-2xl font-black uppercase tracking-tighter hover:scale-105 transition-all text-sm"
                        >
                            Criar Primeiro Conteúdo
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredContents.map((content) => (
                            <button
                                key={content.id}
                                onClick={() => navigate(`/professional/consultoria/gerenciar/${content.id}`)}
                                className="w-full group relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-primary/20 hover:bg-white/[0.05]"
                            >
                                <div className="flex gap-4">
                                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-900">
                                        {content.thumbnail_url ? (
                                            <img src={content.thumbnail_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-zinc-700">
                                                <Video className="h-8 w-8" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-black text-white uppercase tracking-tighter">
                                            {content.type}
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                                content.is_published
                                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                    : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                                            )}>
                                                {content.is_published ? "Publicado" : "Rascunho"}
                                            </span>
                                            <span className="text-sm font-black text-primary">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(content.price)}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-black text-white leading-tight uppercase line-clamp-2">
                                            {content.title}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold">
                                                <GraduationCap className="h-3 w-3" />
                                                <span>Aulas Gerenciáveis</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <ProfessionalFloatingNavIsland />
        </main>
    );
}
