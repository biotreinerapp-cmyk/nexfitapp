import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Zap, MoreVertical, Phone, Video, Paperclip, Camera, Mic, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { PLAN_LABEL } from "@/lib/subscriptionPlans";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import drBioAvatar from "@/assets/dr-bio-avatar.png";
import { cn } from "@/lib/utils";

interface PerfilNutricionista {
  nome: string | null;
  peso_kg: number | null;
  altura_cm: number | null;
  objetivo: string | null;
  nivel: string | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  status: "sent" | "delivered" | "read";
}

interface TelemedProfissional {
  id: string;
  nome: string;
  bio: string | null;
  preco_base: number | null;
  disponivel: boolean | null;
}

const TYPING_DELAY_MS = 1200;
const HORARIOS_DISPONIVEIS = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00"] as const;

const SUGESTOES_RAPIDAS = [
  { id: "cafe", label: "☕ Café da manhã", texto: "Me sugira um café da manhã saudável" },
  { id: "hidratacao", label: "💧 Dicas de hidratação", texto: "Me dê dicas de como me manter hidratado ao longo do dia" },
  { id: "lanche", label: "🍎 Lanche saudável", texto: "Sugira um lanche saudável e prático" },
  { id: "almoco", label: "🍽️ Almoço balanceado", texto: "Me ajude a montar um almoço balanceado" },
  { id: "jantar", label: "🌙 Jantar leve", texto: "Sugira um jantar leve e nutritivo" },
  { id: "pos-treino", label: "💪 Pós-treino", texto: "O que comer após o treino?" },
] as const;

const CHAT_STORAGE_PREFIX = "biotreiner_chat_v2_" as const; // Changed prefix to force fresh start
const WELCOME_SESSION_PREFIX = "nexfit_welcome_dr_bio_shown_v2_" as const;

type HorarioDisponivel = (typeof HORARIOS_DISPONIVEIS)[number];

const NutricionistaPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { plan, hasNutritionAccess, hasTelemedAccess, isMaster, loading: planLoading } = useUserPlan();

  const [perfil, setPerfil] = useState<PerfilNutricionista | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingSugestaoId, setSendingSugestaoId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [modalSugestoesOpen, setModalSugestoesOpen] = useState(false);
  const [profissionais, setProfissionais] = useState<TelemedProfissional[]>([]);
  const [loadingProfissionais, setLoadingProfissionais] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<TelemedProfissional | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>();
  const [horaSelecionada, setHoraSelecionada] = useState<HorarioDisponivel | null>(null);
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);

  const { toast } = useToast();

  const planoAtual = useMemo(() => (isMaster ? "ELITE" : plan), [isMaster, plan]);

  useEffect(() => {
    const fetchPerfil = async () => {
      if (!user) return;
      setLoadingPerfil(true);
      const { data } = await supabase
        .from("profiles")
        .select("nome, peso_kg, altura_cm, objetivo, nivel")
        .eq("id", user.id)
        .maybeSingle();

      setPerfil((data as any) ?? null);
      setLoadingPerfil(false);
    };

    fetchPerfil();
  }, [user]);

  // Carrega histórico do chat do armazenamento local
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    try {
      const stored = window.localStorage.getItem(`${CHAT_STORAGE_PREFIX}${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate if it has new structure (createdAt)
          if (parsed[0].createdAt) {
            setMessages(parsed);
          } else {
            // Old format, clear it
            window.localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${user.id}`);
          }
        }
      }
    } catch (error) {
      console.error("Falha ao restaurar histórico do chat Dr. Bio", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user || (!hasTelemedAccess && !isMaster)) return;

    const fetchProfissionais = async () => {
      setLoadingProfissionais(true);
      const { data, error } = await supabase
        .from("telemedicina_profissionais")
        .select("id, nome, bio, preco_base, disponivel")
        .order("nome");

      if (error) {
        console.error("Erro ao carregar profissionais de telemedicina:", error.message);
      } else {
        setProfissionais((data as any) ?? []);
      }

      setLoadingProfissionais(false);
    };

    fetchProfissionais();
  }, [user, hasTelemedAccess, isMaster]);

  // Mensagem de boas-vindas apenas se não houver histórico restaurado
  useEffect(() => {
    if (!loadingPerfil && perfil && messages.length === 0) {
      try {
        if (typeof window !== "undefined" && user) {
          const key = `${WELCOME_SESSION_PREFIX}${user.id}`;
          if (window.sessionStorage.getItem(key) === "1") return;
          window.sessionStorage.setItem(key, "1");
        }
      } catch {
        // ignore
      }

      const nome = perfil.nome || "Aluno";
      const objetivo = perfil.objetivo || "melhorar sua saúde";
      const peso = perfil.peso_kg ? `${perfil.peso_kg}kg` : "seu peso atual";

      const saudacao = `Olá ${nome}! Sou o Dr. Bio, seu nutricionista virtual. Analisei seu perfil e vi que seu objetivo é ${objetivo} e você está com ${peso}. Como posso te ajudar hoje?`;

      setMessages([
        {
          id: "boas-vindas",
          role: "assistant",
          content: saudacao,
          createdAt: Date.now(),
          status: "read"
        },
      ]);
    }
  }, [loadingPerfil, perfil, messages.length, user]);

  // Persiste o histórico do chat sempre que houver alteração
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    try {
      window.localStorage.setItem(`${CHAT_STORAGE_PREFIX}${user.id}`, JSON.stringify(messages));
    } catch (error) {
      console.error("Falha ao salvar histórico do chat Dr. Bio", error);
    }
  }, [messages, user]);

  const canAccess = isMaster || hasNutritionAccess;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const streamDrBioChat = async (historyForApi: { role: "user" | "assistant"; content: string }[]) => {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    if (!accessToken) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const response = await fetch("https://affyffsmcvphrhbtxrgt.functions.supabase.co/dr-bio-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZmZ5ZnNtY3ZwaHJoYnR4cmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjU1NDYsImV4cCI6MjA4MjY0MTU0Nn0.cpLjvUADTJxzdr0MGIZFai_zYHPbnaU2P1I-EyDoqnw",
      },
      body: JSON.stringify({
        messages: historyForApi,
        profile: perfil,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error("Falha ao iniciar o streaming do Dr. Bio.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (delta) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "assistant") {
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, content: last.content + delta };
                return updated;
              }
              return [
                ...prev,
                {
                  id: `assistant-${Date.now()}`,
                  role: "assistant",
                  content: delta,
                  createdAt: Date.now(),
                  status: "read",
                },
              ];
            });
          }
        } catch {
          // JSON parcial; aguarda mais dados
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
      status: "read", // Assume read immediately for UI simplicity in this demo
    };

    const historyForApi = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      await streamDrBioChat(historyForApi);
    } catch (error) {
      console.error("Erro Dr. Bio streaming:", error);
      const fallback =
        "Tive um problema ao acessar minha base de conhecimento agora. Tente novamente em alguns instantes.";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: fallback,
          createdAt: Date.now(),
          status: "read",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSugestaoRapida = async (texto: string) => {
    if (sending) return;

    setModalSugestoesOpen(false);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: texto,
      createdAt: Date.now(),
      status: "read",
    };

    const historyForApi = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setSending(true);

    try {
      await streamDrBioChat(historyForApi);
    } catch (error) {
      console.error("Erro Dr. Bio streaming:", error);
      const fallback =
        "Tive um problema ao acessar minha base de conhecimento agora. Tente novamente em alguns instantes.";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: fallback,
          createdAt: Date.now(),
          status: "read",
        },
      ]);
    } finally {
      setSending(false);
      setSendingSugestaoId(null);
    }
  };

  const handleClear = () => {
    setMessages([]);
    if (typeof window !== "undefined" && user) {
      try {
        window.localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${user.id}`);
      } catch (error) {
        console.error("Falha ao limpar histórico do chat Dr. Bio", error);
      }
    }
  };

  const resetAgendaState = () => {
    setDataSelecionada(undefined);
    setHoraSelecionada(null);
    setProfissionalSelecionado(null);
  };

  const handleConfirmarAgendamento = async () => {
    if (!user || !profissionalSelecionado || !dataSelecionada || !horaSelecionada) return;

    const [hora, minuto] = horaSelecionada.split(":").map(Number);
    const data = new Date(dataSelecionada);
    data.setHours(hora, minuto, 0, 0);

    setSalvandoAgendamento(true);

    const { error } = await (supabase as any)
      .from("telemedicina_agendamentos")
      .insert({
        aluno_id: user.id,
        profissional_id: profissionalSelecionado.id,
        profissional_nome: profissionalSelecionado.nome,
        data_hora: data.toISOString(),
        status: "pendente",
      });

    setSalvandoAgendamento(false);

    if (error) {
      console.error("Erro ao salvar agendamento:", error.message);
      toast({ title: "Não foi possível agendar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Consulta agendada", description: "Seu agendamento foi registrado com sucesso." });

    resetAgendaState();
    setAgendaOpen(false);
  };

  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!canAccess && planoAtual === "FREE") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border border-accent/40 bg-card/90 p-6 text-xs">
          <h1 className="mb-1 text-base font-semibold text-foreground">Nutricionista Virtual bloqueado</h1>
          <p className="mb-3 text-[11px] text-muted-foreground">
            O Dr. Bio está disponível a partir do plano <span className="font-semibold text-primary">{PLAN_LABEL.ADVANCE}</span>.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate("/aluno/dashboard")}>
            Ver planos disponíveis
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <>
      <main className="safe-bottom-main flex h-screen flex-col bg-[#0b141a]"> {/* WhatsApp Dark Background */}
        {/* WhatsApp Header */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[#202c33] px-2 py-2 shadow-sm">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/aluno/dashboard")}
              className="text-[#aebac1] hover:bg-white/5 rounded-full h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/aluno/telemedicina")}>
              <div className="relative">
                <img
                  src={drBioAvatar}
                  alt="Dr. Bio"
                  className="h-9 w-9 rounded-full object-cover border border-white/5"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#202c33] bg-green-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#e9edef] leading-tight">Dr. Bio</span>
                <span className="text-[11px] text-[#8696a0] leading-tight">Online 24h</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-[#aebac1] hover:bg-white/5 rounded-full h-10 w-10">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-[#aebac1] hover:bg-white/5 rounded-full h-10 w-10">
              <Phone className="h-5 w-5 h-[1.1rem] w-[1.1rem]" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[#aebac1] hover:bg-white/5 rounded-full h-10 w-10">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#233138] border-[#233138] text-[#d1d7db]">
                <DropdownMenuItem onClick={() => setModalSugestoesOpen(true)} className="hover:bg-[#182229]">
                  Sugestões Rápidas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleClear} disabled={messages.length === 0} className="text-red-400 hover:bg-[#182229] focus:text-red-400">
                  Limpar conversa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Chat Area */}
        <section
          className="flex flex-1 flex-col overflow-hidden mt-[60px] relative"
          style={{
            backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
            backgroundRepeat: "repeat",
            backgroundSize: "400px",
            backgroundBlendMode: "overlay",
            backgroundColor: "#0b141a"
          }}
        >
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scroller">
            {/* Encryption Notice */}
            <div className="flex justify-center mb-6">
              <div className="bg-[#182229] text-[#ffd279] text-[10px] px-3 py-1.5 rounded-lg text-center shadow-sm max-w-[85%] leading-relaxed">
                <p>🔒 As mensagens são criptografadas e processadas pela IA Nexfit.</p>
              </div>
            </div>

            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "relative max-w-[85%] px-3 py-1.5 rounded-lg shadow-sm text-[13px] leading-relaxed break-words",
                      isUser
                        ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                        : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                    )}
                  >
                    <div className="markdown-prose">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    <div className={cn("flex items-center justify-end gap-1 mt-0.5 select-none", isUser ? "text-[#8696a0]" : "text-[#8696a0]")}>
                      <span className="text-[9px] font-medium">{formatMessageTime(msg.createdAt)}</span>
                      {isUser && (
                        <span className={cn(msg.status === "read" ? "text-[#53bdeb]" : "text-[#8696a0]")}>
                          <CheckCheck className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    {/* Tail SVG */}
                    <div className="absolute top-0">
                      {isUser ? (
                        <svg viewBox="0 0 8 13" height="13" width="8" className="absolute -right-[8px] top-0 fill-[#005c4b]"><path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path></svg>
                      ) : (
                        <svg viewBox="0 0 8 13" height="13" width="8" className="absolute -left-[8px] top-0 fill-[#202c33]"><path d="M-2.288 1h5.187c1.77 0 2.338 1.156 1.28 2.568L-2.289 12.193V1z"></path></svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#202c33] px-4 py-2 rounded-lg rounded-tl-none shadow-sm flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-[#8696a0] rounded-full animate-bounce delay-0"></span>
                  <span className="h-1.5 w-1.5 bg-[#8696a0] rounded-full animate-bounce delay-150"></span>
                  <span className="h-1.5 w-1.5 bg-[#8696a0] rounded-full animate-bounce delay-300"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSend}
            className="p-2 bg-[#202c33] flex items-end gap-2 z-50 pb-[calc(env(safe-area-inset-bottom)+8px)]"
          >
            <Button type="button" variant="ghost" size="icon" className="text-[#8696a0] hover:bg-white/5 rounded-full mb-1 h-10 w-10 shrink-0" onClick={() => setModalSugestoesOpen(true)}>
              <Zap className="h-5 w-5" />
            </Button>

            <div className="flex-1 bg-[#2a3942] rounded-2xl flex items-center px-3 py-1.5 min-h-[42px] mb-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Mensagem"
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 px-0 text-[#e9edef] placeholder:text-[#8696a0] text-[15px] h-auto max-h-[100px]"
              />
              <div className="flex items-center gap-3 ml-2">
                <Paperclip className="h-5 w-5 text-[#8696a0] -rotate-45" />
                {input.length === 0 && <Camera className="h-5 w-5 text-[#8696a0]" />}
              </div>
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              className={cn(
                "rounded-full h-10 w-10 mb-1 shrink-0 transition-colors shadow-none",
                input.trim() ? "bg-[#00a884] hover:bg-[#008f72] text-white" : "bg-[#00a884] text-white"
              )}
            >
              {input.trim() ? <Send className="h-5 w-5 ml-0.5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </form>
        </section>

        {/* Agendamento Dialog */}
        <Dialog
          open={agendaOpen}
          onOpenChange={(open) => {
            setAgendaOpen(open);
            if (!open) resetAgendaState();
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">Agendar consulta</DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground">
                Selecione a data e o horário desejados para sua consulta remota.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-foreground">
                {profissionalSelecionado ? profissionalSelecionado.nome : "Selecione um profissional"}
              </p>
              <Calendar
                mode="single"
                selected={dataSelecionada}
                onSelect={setDataSelecionada}
                className="pointer-events-auto rounded-lg border border-border/60 bg-background"
                disabled={(date) => date < new Date()}
              />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Horários disponíveis</p>
                <div className="flex flex-wrap gap-2">
                  {HORARIOS_DISPONIVEIS.map((horario) => (
                    <Button
                      key={horario}
                      type="button"
                      size="sm"
                      variant={horaSelecionada === horario ? "default" : "outline"}
                      className="h-7 px-3 text-[11px]"
                      onClick={() => setHoraSelecionada(horario)}
                    >
                      {horario}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[11px]"
                onClick={() => {
                  setAgendaOpen(false);
                  resetAgendaState();
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-[11px]"
                loading={salvandoAgendamento}
                disabled={!dataSelecionada || !horaSelecionada}
                onClick={handleConfirmarAgendamento}
              >
                Confirmar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sugestões Rápidas Dialog */}
        <Dialog open={modalSugestoesOpen} onOpenChange={setModalSugestoesOpen}>
          <DialogContent className="max-w-md bg-[#233138] border-[#233138] text-[#e9edef]">
            <DialogHeader>
              <DialogTitle className="text-[#e9edef]">Sugestões Rápidas</DialogTitle>
              <DialogDescription className="text-[#8696a0]">
                Toque em uma opção para enviar
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 pt-4">
              {SUGESTOES_RAPIDAS.map((sugestao) => (
                <Button
                  key={sugestao.id}
                  type="button"
                  variant="ghost"
                  loading={sending && sendingSugestaoId === sugestao.id}
                  disabled={sending}
                  onClick={() => {
                    setSendingSugestaoId(sugestao.id);
                    void handleSugestaoRapida(sugestao.texto);
                  }}
                  className="h-auto justify-start text-left text-sm hover:bg-[#182229] py-3 border-b border-[#2a3942] rounded-none last:border-0"
                >
                  <span className="mr-3 text-xl">{sugestao.label.split(" ")[0]}</span>
                  <div className="flex flex-col">
                    <span className="text-[#e9edef] font-medium">{sugestao.label.split(" ").slice(1).join(" ")}</span>
                    <span className="text-xs text-[#8696a0] font-normal truncate max-w-[250px]">{sugestao.texto}</span>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
};

export default NutricionistaPage;
