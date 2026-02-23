import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import {
    PlayCircle,
    ChevronLeft,
    ChevronRight,
    List,
    CheckCircle2,
    Clock,
    MessageSquare,
    ChevronDown,
    Loader2,
    Video,
    BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export default function ProfessionalEducationPlayerPage() {
    const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [currentLesson, setCurrentLesson] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        const loadPlayerData = async () => {
            if (!user || !courseId) return;
            try {
                // 1. Fetch Content & Verify Purchase (RLS handles verification)
                const { data: course, error: courseError } = await supabase
                    .from("educational_contents")
                    .select("*")
                    .eq("id", courseId)
                    .single();

                if (courseError) throw courseError;
                setContent(course);

                // 2. Fetch Modules & Lessons
                const { data: mods, error: modsError } = await supabase
                    .from("educational_modules")
                    .select(`
                        *,
                        lessons:educational_lessons(*)
                    `)
                    .eq("content_id", courseId)
                    .order("order_index", { ascending: true });

                if (modsError) throw modsError;

                const sortedMods = (mods || []).map(m => ({
                    ...m,
                    lessons: (m.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index)
                }));
                setModules(sortedMods);

                // 3. Set Current Lesson
                let targetLesson = null;
                if (lessonId) {
                    targetLesson = sortedMods.flatMap(m => m.lessons).find(l => l.id === lessonId);
                } else if (sortedMods.length > 0 && sortedMods[0].lessons.length > 0) {
                    targetLesson = sortedMods[0].lessons[0];
                }
                setCurrentLesson(targetLesson);

            } catch (error) {
                console.error("Error loading player:", error);
                navigate("/professional/education");
            } finally {
                setLoading(false);
            }
        };

        loadPlayerData();
    }, [courseId, lessonId, user]);

    const getYouTubeId = (url: string) => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url?.match(regex);
        return match ? match[1] : null;
    };

    const handleLessonSelect = (lId: string) => {
        navigate(`/professional/education/player/${courseId}/${lId}`);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    const videoId = getYouTubeId(currentLesson?.video_url || "");

    return (
        <main className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen">
                {/* Topbar */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/40 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <BackIconButton to="/professional/education" />
                        <div className="hidden md:block">
                            <h1 className="text-sm font-black uppercase tracking-tighter text-zinc-400 leading-none mb-1">{content?.title}</h1>
                            <p className="text-xs font-bold text-white uppercase italic">{currentLesson?.title}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="md:hidden text-primary"
                    >
                        <List className="h-5 w-5" />
                    </Button>
                </div>

                {/* Video Player Area */}
                <div className="flex-1 overflow-y-auto bg-black">
                    <div className="max-w-5xl mx-auto w-full">
                        {/* Player Container */}
                        <div className="relative aspect-video bg-zinc-900 overflow-hidden shadow-2xl">
                            {videoId ? (
                                <iframe
                                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                                    className="absolute inset-0 w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 bg-zinc-900/50">
                                    <Video className="h-20 w-20 mb-4 opacity-20" />
                                    <p className="text-sm font-black uppercase tracking-widest italic opacity-40">Nenhum vídeo disponível</p>
                                </div>
                            )}
                        </div>

                        {/* Lesson Info */}
                        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                        Módulo {modules.findIndex(m => m.id === currentLesson?.module_id) + 1}
                                    </span>
                                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase">
                                        <Clock className="h-3 w-3" />
                                        <span>Duração Variável</span>
                                    </div>
                                </div>
                                <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-tight">
                                    {currentLesson?.title}
                                </h1>
                            </div>

                            <div className="grid gap-6">
                                <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-primary" />
                                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 italic">Notas da Aula</h2>
                                    </div>
                                    <div className="text-sm text-zinc-400 font-medium leading-relaxed whitespace-pre-wrap">
                                        {currentLesson?.content || "Nenhum material adicional fornecido para esta aula."}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar - Playlist */}
            <div className={cn(
                "w-full md:w-80 lg:w-96 bg-[#080808] border-l border-white/5 flex flex-col h-screen transition-all duration-300",
                !sidebarOpen && "hidden"
            )}>
                <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0">
                    <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Conteúdo do Treinamento</h2>
                </div>

                <ScrollArea className="flex-1">
                    <Accordion type="multiple" defaultValue={modules.map(m => m.id)} className="px-2">
                        {modules.map((mod, modIdx) => (
                            <AccordionItem key={mod.id} value={mod.id} className="border-none mt-2">
                                <AccordionTrigger className="hover:no-underline px-4 py-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] transition-all group">
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] font-black text-zinc-500">
                                            {modIdx + 1}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest leading-none mb-1">Módulo {modIdx + 1}</p>
                                            <h3 className="text-xs font-black text-white uppercase tracking-tight line-clamp-1">{mod.title}</h3>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-0">
                                    <div className="space-y-1 pl-4">
                                        {mod.lessons.map((lesson: any, lessonIdx: number) => (
                                            <button
                                                key={lesson.id}
                                                onClick={() => handleLessonSelect(lesson.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-4 rounded-xl transition-all group lg:hover:bg-primary/5",
                                                    currentLesson?.id === lesson.id
                                                        ? "bg-primary/10 border border-primary/20"
                                                        : "bg-transparent border border-transparent"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                                    currentLesson?.id === lesson.id ? "bg-primary text-black" : "bg-zinc-900 text-zinc-700"
                                                )}>
                                                    <PlayCircle className="h-3 w-3" />
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <h4 className={cn(
                                                        "text-[11px] font-black uppercase tracking-tight truncate",
                                                        currentLesson?.id === lesson.id ? "text-primary" : "text-zinc-400 group-hover:text-zinc-200"
                                                    )}>
                                                        {lesson.title}
                                                    </h4>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </ScrollArea>

                <div className="p-6 border-t border-white/5 bg-black/20 shrink-0">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black italic">
                            NX
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase leading-none mb-1">Certificação</p>
                            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Pendente</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
