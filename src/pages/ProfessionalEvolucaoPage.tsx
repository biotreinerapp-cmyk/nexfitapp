import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { TrendingUp, Users, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProfessionalEvolucaoPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchStudents = async () => {
            if (!user) return;
            try {
                const { data: pro } = await supabase
                    .from("professionals")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();

                if (pro) {
                    const { data: hires, error } = await supabase
                        .from("professional_hires")
                        .select(`
                            student_id,
                            created_at,
                            profiles:profiles!professional_hires_student_id_fkey(id, display_name, avatar_url)
                        `)
                        .eq("professional_id", pro.id)
                        .eq("status", "accepted");

                    if (error) throw error;
                    setStudents(hires || []);
                }
            } catch (error) {
                console.error("Error fetching students:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [user]);

    const filteredStudents = students.filter(s =>
        s.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.profiles?.nome?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-black pb-28 safe-bottom-floating-nav">
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
                <div className="flex items-center gap-4">
                    <BackIconButton />
                    <h1 className="text-xl font-black uppercase tracking-tight text-white italic">Evolução dos Alunos</h1>
                </div>
            </div>

            <section className="px-4 py-8 space-y-6 max-w-lg mx-auto">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <Input
                        placeholder="Buscar aluno..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus:border-primary/50 transition-all font-bold"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <TrendingUp className="h-10 w-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Nenhum Aluno Encontrado</h2>
                            <p className="text-sm text-zinc-500 max-w-[280px] mx-auto">Sua lista de alunos ativos aparecerá aqui.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredStudents.map((hire) => (
                            <button
                                key={hire.student_id}
                                onClick={() => navigate(`/professional/aluno/${hire.student_id}/evolucao`)}
                                className="group flex flex-col items-center p-5 rounded-[28px] border border-white/5 bg-white/[0.03] backdrop-blur-xl hover:border-primary/30 transition-all text-center space-y-3"
                            >
                                <div className="relative">
                                    <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary/10 group-hover:border-primary/50 transition-all shadow-xl shadow-primary/5">
                                        {hire.profiles?.avatar_url ? (
                                            <img
                                                src={hire.profiles?.avatar_url}
                                                alt={hire.profiles?.display_name || 'Aluno'}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xl font-black text-primary">{hire.profiles?.display_name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-lg bg-green-500 border-2 border-black flex items-center justify-center">
                                        <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-sm font-black text-white truncate max-w-[120px]">
                                        {hire.profiles?.display_name || hire.profiles?.nome || 'Aluno'}
                                    </h3>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-bold text-primary uppercase tracking-tight italic">Contratado</span>
                                        <span className="text-[9px] font-medium text-zinc-500 capitalize">
                                            {format(new Date(hire.created_at), "EEEE", { locale: ptBR })}
                                        </span>
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
