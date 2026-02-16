import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Send,
    Search,
    User,
    ChevronLeft,
    MoreVertical,
    MessageSquare,
    Loader2,
    Lock,
    Stethoscope
} from "lucide-react";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";

interface ChatRoom {
    id: string;
    student_id: string;
    professional_id: string;
    last_message_at: string;
    professional: {
        nome: string;
        foto_url: string | null;
    };
}

interface Message {
    id: string;
    room_id: string;
    sender_id: string;
    content: string;
    created_at: string;
}

export default function AlunoChatPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { isElite, isMaster, loading: loadingPlan } = useUserPlan();
    const canAccessChat = isElite || isMaster;
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (canAccessChat && user) {
            loadRooms();
        }
    }, [user, canAccessChat]);

    useEffect(() => {
        if (activeRoom) {
            loadMessages(activeRoom.id);
            const unsubscribe = subscribeToMessages(activeRoom.id);
            return () => unsubscribe();
        }
    }, [activeRoom]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadRooms = async () => {
        if (!user) return;
        setLoadingRooms(true);
        try {
            const { data, error } = await supabase
                .from("professional_chat_rooms")
                .select(`
                    *,
                    professional:professionals(nome:name, foto_url:profile_image_url)
                `)
                .eq("student_id", user.id)
                .order("last_message_at", { ascending: false });

            if (error) throw error;
            setRooms(data as any);
        } catch (error: any) {
            console.error("Load rooms error:", error);
            toast({
                title: "Erro ao carregar conversas",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoadingRooms(false);
        }
    };

    const loadMessages = async (roomId: string) => {
        setLoadingMessages(true);
        try {
            const { data, error } = await supabase
                .from("professional_chat_messages")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setMessages(data as any);
        } catch (error: any) {
            console.error("Load messages error:", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const subscribeToMessages = (roomId: string) => {
        const channel = supabase
            .channel(`room-${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "professional_chat_messages",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    setMessages((current) => [...current, payload.new as Message]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!user || !activeRoom || !newMessage.trim()) return;

        const content = newMessage;
        setNewMessage("");

        try {
            const { error } = await supabase.from("professional_chat_messages").insert({
                room_id: activeRoom.id,
                sender_id: user.id,
                content: content,
            });

            if (error) throw error;

            await supabase
                .from("professional_chat_rooms")
                .update({ last_message_at: new Date().toISOString() })
                .eq("id", activeRoom.id);

        } catch (error: any) {
            toast({
                title: "Erro ao enviar",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    if (loadingPlan) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!canAccessChat) {
        return (
            <main className="flex h-screen bg-black overflow-hidden flex-col items-center justify-center p-8 text-center">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                    <Lock className="h-12 w-12" />
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Plano Elite Necessário</h1>
                <p className="text-zinc-500 max-w-md mb-8">
                    O chat direto com profissionais é uma funcionalidade exclusiva do plano Elite. Faça o upgrade para começar agora!
                </p>
                <Button onClick={() => navigate("/aluno/planos")} className="bg-primary text-black hover:bg-primary/90 rounded-full px-8 h-12 font-bold uppercase tracking-wider">
                    Ver Planos
                </Button>
                <FloatingNavIsland />
            </main>
        );
    }

    return (
        <main className="flex h-screen bg-black overflow-hidden">
            {/* Rooms Sidebar */}
            <div className={cn(
                "w-full md:w-80 border-r border-white/5 bg-zinc-950 flex flex-col transition-all duration-300",
                !sidebarOpen && "hidden md:flex"
            )}>
                <div className="p-4 border-b border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/dashboard")} className="text-zinc-400">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-black text-white uppercase tracking-tight">Chat</h1>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Buscar profissional..."
                            className="pl-9 bg-white/5 border-white/5 text-xs h-9 rounded-full text-white"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {loadingRooms ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="p-10 text-center space-y-6">
                            <div className="h-20 w-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                                <MessageSquare className="h-10 w-10 text-zinc-700" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-white uppercase tracking-tight">Nenhuma conversa</p>
                                <p className="text-[11px] text-zinc-500 leading-relaxed">
                                    Você ainda não iniciou conversas com profissionais. Explore nossa rede de telemedicina para contratar um especialista.
                                </p>
                            </div>
                            <Button
                                onClick={() => navigate("/telemedicina")}
                                className="w-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-2xl h-12 font-bold uppercase tracking-wider text-xs"
                            >
                                <Stethoscope className="mr-2 h-4 w-4" /> Explorar Telemedicina
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {rooms.map((room) => (
                                <button
                                    key={room.id}
                                    onClick={() => {
                                        setActiveRoom(room);
                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                    }}
                                    className={cn(
                                        "w-full p-4 flex items-center gap-3 transition-colors hover:bg-white/5 text-left",
                                        activeRoom?.id === room.id && "bg-white/5"
                                    )}
                                >
                                    <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {room.professional?.foto_url ? (
                                            <img src={room.professional.foto_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <User className="h-6 w-6 text-zinc-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-sm font-bold text-white truncate">{room.professional?.nome || "Profissional"}</p>
                                            <span className="text-[9px] text-zinc-500">
                                                {new Date(room.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-500 truncate">Ver conversa</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 md:hidden">
                    <FloatingNavIsland />
                </div>
            </div>

            {/* Chat Area */}
            <div className={cn(
                "flex-1 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-fixed",
                sidebarOpen && rooms.length > 0 && "hidden md:flex"
            )}>
                {activeRoom ? (
                    <>
                        <header className="p-4 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSidebarOpen(true)}
                                    className="md:hidden text-white"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                    {activeRoom.professional?.foto_url ? (
                                        <img src={activeRoom.professional.foto_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <User className="h-5 w-5 text-zinc-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white leading-none">{activeRoom.professional?.nome || "Profissional"}</p>
                                    <p className="text-[10px] text-primary mt-1 flex items-center gap-1 font-bold uppercase tracking-wider">
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Online
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-zinc-400"><MoreVertical className="h-5 w-5" /></Button>
                        </header>

                        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                            <div className="space-y-4 max-w-4xl mx-auto">
                                {messages.map((msg) => {
                                    const isMe = msg.sender_id === user?.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex flex-col max-w-[85%] md:max-w-[70%]",
                                                isMe ? "ml-auto items-end" : "mr-auto items-start"
                                            )}
                                        >
                                            <div className={cn(
                                                "px-4 py-3 rounded-2xl text-sm shadow-sm",
                                                isMe
                                                    ? "bg-primary text-black rounded-tr-none"
                                                    : "bg-zinc-800 text-white rounded-tl-none border border-white/5"
                                            )}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[9px] text-zinc-600 mt-1 px-1">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        <footer className="p-4 bg-zinc-950/80 backdrop-blur-md border-t border-white/5 z-10">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Escreva sua mensagem..."
                                    className="bg-white/5 border-white/5 text-sm h-12 rounded-2xl text-white placeholder:text-zinc-600 focus:ring-primary/20"
                                />
                                <Button type="submit" size="icon" className="h-12 w-12 rounded-2xl bg-primary text-black hover:bg-primary/90">
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                        </footer>
                    </>
                ) : rooms.length > 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black/40">
                        <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <MessageSquare className="h-12 w-12 text-zinc-800" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Suas Conversas</h2>
                        <p className="text-sm text-zinc-500 max-w-xs mt-3 leading-relaxed">
                            Selecione um profissional na lista para iniciar seu atendimento personalizado.
                        </p>
                    </div>
                ) : null}
            </div>

            <div className="hidden md:block">
                <FloatingNavIsland />
            </div>
        </main>
    );
}
