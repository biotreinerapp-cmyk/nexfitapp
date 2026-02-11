import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Zap, MoreVertical } from "lucide-react";
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

const CHAT_STORAGE_PREFIX = "biotreiner_chat_" as const;
const WELCOME_SESSION_PREFIX = "nexfit_welcome_dr_bio_shown_" as const;

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
          setMessages(parsed);
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
      // Evita repetir a saudação se o componente apenas remontar (ex.: alternar abas).
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

      const saudacao = `Olá ${nome}! Sou o Dr. Bio, seu nutricionista virtual. Analisei seu perfil e vi que seu objetivo é ${objetivo} e você está com ${peso}.`;

      setMessages([
        {
          id: "boas-vindas",
          role: "assistant",
          content: saudacao,
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

    const response = await fetch("https://afffyfsmcvphrhbtxrgt.functions.supabase.co/dr-bio-chat", {
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

  const handleAbrirAgenda = (profissional: TelemedProfissional) => {
    if (!hasTelemedAccess && !isMaster) {
      return;
    }

    setProfissionalSelecionado(profissional);
    setAgendaOpen(true);
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

  if (!canAccess && planoAtual === "FREE") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border border-accent/40 bg-card/90 p-6 text-xs">
          <h1 className="mb-1 text-base font-semibold text-foreground">Nutricionista Virtual bloqueado</h1>
          <p className="mb-3 text-[11px] text-muted-foreground">
            O Dr. Bio está disponível a partir do plano <span className="font-semibold text-primary">{PLAN_LABEL.ADVANCE}</span>.
          </p>
          <p className="mb-4 text-[11px] text-muted-foreground">
            Faça o upgrade para desbloquear orientações alimentares personalizadas, dicas de hidratação e sugestões
            de refeições rápidas alinhadas ao seu objetivo.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" size="lg" onClick={() => navigate("/aluno/dashboard")}>
              Ver planos disponíveis
            </Button>
            <Button
              className="flex-1"
              size="lg"
              variant="outline"
              onClick={() => navigate("/aluno/dashboard")}
            >
              Voltar ao dashboard
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <>
      <main className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Cabeçalho fixo estilo WhatsApp */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-card/95 px-4 py-3 shadow-[0_4px_18px_rgba(0,0,0,0.85)] backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/aluno/dashboard")}
          aria-label="Voltar"
          className="mr-1 text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-card text-[11px] font-semibold text-primary-foreground shadow-md shadow-black/40">
            <img
              src={drBioAvatar}
              alt="Foto de perfil do Dr. Bio, nutricionista virtual da Nexfit"
              className="h-9 w-9 rounded-full object-cover"
            />
            <span className="absolute bottom-0 right-0 inline-flex h-2.5 w-2.5 rounded-full border border-background bg-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Dr. Bio</span>
            <span className="text-[11px] font-medium text-primary">Online</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary"
            onClick={() => setModalSugestoesOpen(true)}
            aria-label="Sugestões rápidas"
          >
            <Zap className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                aria-label="Menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleClear}
                disabled={messages.length === 0}
                className="text-destructive focus:text-destructive"
              >
                Limpar conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Área principal do chat em tela cheia com scroll */}
      <section className="flex flex-1 flex-col bg-background overflow-hidden mt-[60px] mb-[120px]">
        <div className="relative flex h-full flex-1 flex-col">
          {/* Lista de mensagens com rolagem independente */}
          <div className="flex-1 max-h-full space-y-2 overflow-y-auto bg-gradient-to-b from-background via-background/95 to-background/90 px-3 py-3">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-lg shadow-black/40 ${
                      isUser
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted/80 text-foreground"
                    }`}
                  >
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}

            {messages.length === 0 && (
              <p className="pt-6 text-center text-xs text-muted-foreground">
                Assim que seu perfil for carregado, o Dr. Bio iniciará a conversa com orientações iniciais.
              </p>
            )}

            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[60%] rounded-2xl rounded-bl-sm bg-muted/80 px-3 py-2 text-[11px] text-muted-foreground shadow-lg shadow-black/40 animate-fade-in">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 pulse" style={{ animationDelay: "0.15s" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 pulse" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Aviso informativo fixo no rodapé */}
          <div className="fixed bottom-[56px] left-0 right-0 z-40 bg-muted/95 px-4 py-2 text-[11px] text-muted-foreground shadow-[0_-6px_20px_rgba(0,0,0,0.9)] backdrop-blur-sm border-t border-border/40">
            O Dr. Bio se trata de uma Inteligência Artificial e sua função é de suporte e acesso rápido a informações de saúde. Para mais informações, acesse o painel de Telemedicina.
          </div>

          {/* Barra de entrada fixa flutuante estilo WhatsApp */}
          <form
            onSubmit={handleSend}
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2 bg-card/95 px-3 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.95)] backdrop-blur-md border-t border-border/40"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
             <div className="flex flex-1 items-center rounded-full bg-card/60 px-3 py-1.5">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua dúvida ou peça uma sugestão de refeição..."
                className="h-7 flex-1 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              aria-label="Enviar mensagem"
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>

      <Dialog
        open={agendaOpen}
        onOpenChange={(open) => {
          setAgendaOpen(open);
          if (!open) {
            resetAgendaState();
          }
        }}
      >
        <DialogContent className="max-w-sm border border-accent/40 bg-card/95">
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
    </main>

    {/* Modal de Sugestões Rápidas */}
    <Dialog open={modalSugestoesOpen} onOpenChange={setModalSugestoesOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sugestões Rápidas</DialogTitle>
          <DialogDescription>
            Escolha uma pergunta frequente para começar a conversa com o Dr. Bio
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 pt-4">
          {SUGESTOES_RAPIDAS.map((sugestao) => (
            <Button
              key={sugestao.id}
              type="button"
              variant="outline"
              loading={sending && sendingSugestaoId === sugestao.id}
              disabled={sending}
              onClick={() => {
                setSendingSugestaoId(sugestao.id);
                void handleSugestaoRapida(sugestao.texto);
              }}
              className="h-auto justify-start border-primary/30 text-left text-sm hover:bg-primary/10 hover:text-primary py-3"
            >
              <span className="mr-2 text-lg">{sugestao.label.split(" ")[0]}</span>
              <span>{sugestao.label.split(" ").slice(1).join(" ")}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
};

export default NutricionistaPage;
