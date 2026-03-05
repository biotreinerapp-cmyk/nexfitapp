import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Apple,
  ArrowLeft,
  Brain,
  Dumbbell,
  HeartPulse,
  Stethoscope,
  User,
  QrCode,
  Copy,
  CheckCircle2,
  DollarSign,
  Loader2,
  CreditCard,
  PersonStanding,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useToast } from "@/hooks/use-toast";
import { createPixPayment, PixPaymentResult } from "@/lib/pixPaymentTracking";
import { buildPixPayload, calculateFinalPrice } from "@/lib/pix";
import QRCode from "qrcode";
import { HubServiceButton } from "@/components/dashboard/HubServiceButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const HORARIOS_DISPONIVEIS = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00"] as const;
type HorarioDisponivel = (typeof HORARIOS_DISPONIVEIS)[number];

const getServicoIcon = (slug: string) => {
  const key = (slug || "").toLowerCase();

  if (key.includes("cardio") || key.includes("coracao") || key.includes("coração")) return HeartPulse;
  if (key.includes("psico") || key.includes("mente") || key.includes("terapia")) return Brain;
  if (key.includes("nutri") || key.includes("aliment") || key.includes("dieta")) return Apple;
  if (key.includes("fisio") || key.includes("ortop")) return PersonStanding;
  if (key.includes("educador") || key.includes("treino") || key.includes("fisico")) return Dumbbell;
  if (key.includes("endocrino")) return Activity;

  return Stethoscope;
};

interface TelemedServico {
  id: string;
  nome: string;
  slug: string;
  icone: string | null;
  icon_url: string | null;
}

interface TelemedProfissional {
  id: string;
  name: string;
  bio: string | null;
  base_price: number | null;
  is_available: boolean | null;
  telemedicina_servico_id: string | null;
  profile_image_url: string | null;
  pix_key?: string;
  pix_receiver_name?: string;
  pix_bank_name?: string;
}

const TelemedicinaPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasTelemedAccess, isMaster, plan } = useUserPlan();
  const { toast } = useToast();

  const [servicos, setServicos] = useState<TelemedServico[]>([]);
  const [profissionais, setProfissionais] = useState<TelemedProfissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroServico, setFiltroServico] = useState<string | null>(null);

  const [agendaOpen, setAgendaOpen] = useState(false);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<TelemedProfissional | null>(null);
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);

  // PIX Payment States
  const [showPixDialog, setShowPixDialog] = useState(false);
  const [pixData, setPixData] = useState<PixPaymentResult | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "expired">("pending");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const podeAcessar = isMaster || hasTelemedAccess;

  useEffect(() => {
    const carregarDados = async () => {
      if (!user) return;
      setLoading(true);

      const [{ data: servicosData }, { data: profData }] = await Promise.all([
        (supabase as any)
          .from("telemedicina_servicos")
          .select("id, nome, slug, icone, icon_url, ativo")
          .eq("ativo", true)
          .order("nome"),
        (supabase as any)
          .from("professionals")
          .select("id, name, bio, base_price, is_available, telemedicina_servico_id, profile_image_url, pix_key, pix_receiver_name, pix_bank_name")
          .not("telemedicina_servico_id", "is", null)
          .eq("is_available", true)
          .order("name"),
      ]);

      // Deduplicate service categories by name (case-insensitive) — keep first occurrence
      const rawServicos: TelemedServico[] = (servicosData as any) ?? [];
      const seenNomes = new Set<string>();
      const servicosUnicos = rawServicos.filter(s => {
        const key = s.nome.trim().toLowerCase();
        if (seenNomes.has(key)) return false;
        seenNomes.add(key);
        return true;
      });

      setServicos(servicosUnicos);
      setProfissionais((profData as any) ?? []);
      setLoading(false);
    };

    carregarDados();
  }, [user]);

  const resetAgendaState = () => {
    setProfissionalSelecionado(null);
  };

  const isEliteBlack = plan === "ELITE";
  const getDiscountedPrice = (price: number | null) => calculateFinalPrice(price, plan);

  const handleContratar = async (profissional: TelemedProfissional, method: "pix" | "card" = "pix") => {
    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado para contratar.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setPaymentMethod(method);
    try {
      const finalAmount = getDiscountedPrice(profissional.base_price);
      const isFree = finalAmount === 0;

      // ── Deduplication: abort if an active hire already exists for this pair ──
      const { data: existingHire } = await (supabase as any)
        .from("professional_hires")
        .select("id, status, paid_amount")
        .eq("professional_id", profissional.id)
        .eq("student_id", user.id)
        .in("status", ["pending", "awaiting_verification", "accepted"])
        .maybeSingle();

      if (existingHire) {
        // ── Self-heal: if the hire is accepted and free, ensure binding+chat exist ──
        if (existingHire.status === "accepted" && (existingHire.paid_amount ?? 0) === 0) {
          // Ensure binding exists
          await (supabase as any)
            .from("professional_student_bindings")
            .upsert({
              professional_id: profissional.id,
              student_id: user.id,
              hire_id: existingHire.id,
              status: "active",
            }, { onConflict: "professional_id,student_id" });

          // Ensure chat room exists
          const { data: existingRoom } = await (supabase as any)
            .from("professional_chat_rooms")
            .select("id")
            .eq("professional_id", profissional.id)
            .eq("student_id", user.id)
            .maybeSingle();

          if (!existingRoom) {
            await (supabase as any)
              .from("professional_chat_rooms")
              .insert({
                professional_id: profissional.id,
                student_id: user.id,
                last_message_at: new Date().toISOString(),
              });
          }

          toast({
            title: "Conexão ativa!",
            description: `Você já está vinculado a ${profissional.name}. Acesse o chat para falar com o profissional.`,
          });
          setAgendaOpen(false);
          setSubmitting(false);
          return;
        }

        const statusMsg: Record<string, string> = {
          pending: "aguardando aprovação do profissional",
          awaiting_verification: "aguardando verificação do pagamento",
          accepted: "já ativa — acesse o chat para falar com o profissional",
        };
        toast({
          title: "Solicitação já existe",
          description: `Você já tem uma contratação com este profissional ${statusMsg[existingHire.status] ?? "em andamento"}.`,
        });
        setSubmitting(false);
        setAgendaOpen(false);
        return;
      }
      // ───────────────────────────────────────────────────────────────────────

      // 1. Create the hire record
      const { data: hire, error: hireError }: any = await (supabase as any).from("professional_hires").insert({
        professional_id: profissional.id,
        student_id: user.id,
        message: "Contratação via Telemedicina",
        status: isFree ? "accepted" : "pending", // Auto-accept if free
        paid_amount: finalAmount,
        payment_status: isFree ? "paid" : "pending" // Auto-paid if free
      }).select("id").single();

      if (hireError) {
        if (hireError.code === "23505") { // Unique constraint
          toast({
            title: "Solicitação em andamento",
            description: "Você já tem uma solicitação ativa com este profissional.",
          });
          setAgendaOpen(false);
          return;
        }
        throw hireError;
      }

      // 2. If it's free, setup the binding and chat room immediately
      if (isFree) {
        // Create formal binding
        await (supabase as any)
          .from("professional_student_bindings")
          .upsert({
            professional_id: profissional.id,
            student_id: user.id,
            hire_id: hire.id,
            status: "active",
          }, { onConflict: "professional_id,student_id" });

        // Create chat room if not exists
        const { data: existingRoom } = await (supabase as any)
          .from("professional_chat_rooms")
          .select("id")
          .eq("professional_id", profissional.id)
          .eq("student_id", user.id)
          .maybeSingle();

        if (!existingRoom) {
          await (supabase as any)
            .from("professional_chat_rooms")
            .insert({
              professional_id: profissional.id,
              student_id: user.id,
              last_message_at: new Date().toISOString(),
            });
        }

        toast({
          title: "Conexão confirmada!",
          description: `Você agora está vinculado a ${profissional.name}. Acesse o chat para falar com o profissional.`,
        });
        setAgendaOpen(false);
        return;
      }

      // 3. Handle paid flows
      if (profissional.base_price && profissional.base_price > 0) {
        if (method === "pix") {
          if (!profissional.pix_key) {
            toast({ title: "Erro", description: "O profissional ainda não configurou uma chave Pix.", variant: "destructive" });
            setSubmitting(false);
            return;
          }
          const payload = buildPixPayload({
            pixKey: profissional.pix_key,
            receiverName: profissional.pix_receiver_name || profissional.name,
            amount: finalAmount,
            description: `Telemedicina: ${profissional.name}`.slice(0, 30) // max desc
          });
          const qrCode = await QRCode.toDataURL(payload, { width: 300, margin: 1, color: { dark: '#000000FF', light: '#FFFFFFFF' } });

          setPixData({
            paymentId: hire.id,
            pixPayload: payload,
            pixQrCode: qrCode,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
          setShowPixDialog(true);
          setAgendaOpen(false);
        } else {
          // Fallback to InfinitePay logic for Card payments
          const result = await createPixPayment({
            userId: user.id,
            amount: finalAmount,
            paymentType: "professional_service",
            referenceId: hire.id,
            description: `Telemedicina: ${profissional.name}`,
            paymentMethod: method,
          });

          setPixData(result);
          setPaymentUrl(result.paymentUrl || null);
          setShowPixDialog(true);
          setAgendaOpen(false);
        }
      }
    } catch (error: any) {
      console.error(`[Telemedicina] Erro ao iniciar contratação (${method}):`, error);
      toast({
        title: `Erro ao iniciar contratação`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!pixData?.paymentId || !showPixDialog) return;
    // Status checks are handled by handleCheckPayment.
  }, [pixData?.paymentId, showPixDialog]);

  const handleCheckPayment = async () => {
    if (!pixData) return;
    setCheckingPayment(true);
    try {
      if (paymentMethod === "pix") {
        // Direct Pix: simply notify professional and close
        await (supabase as any).from("professional_hires").update({
          payment_status: "awaiting_verification"
        }).eq("id", pixData.paymentId);

        toast({
          title: "Comprovante enviado!",
          description: "O profissional verificará o Pix e liberará sua consulta em breve.",
        });
        setPaymentStatus("paid");
        setTimeout(() => setShowPixDialog(false), 2000);
      } else {
        // Leave existing InfinitePay check if used for card
        toast({ title: "O pagamento via cartão está sendo processado." });
        setTimeout(() => setShowPixDialog(false), 2000);
      }
    } catch (error) {
      console.error("Check error:", error);
    } finally {
      setCheckingPayment(false);
    }
  };

  const professionalsFiltered = filtroServico
    ? profissionais.filter(p => p.telemedicina_servico_id === filtroServico)
    : profissionais;

  if (!podeAcessar && plan === "FREE") {
    return (
      <>
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md border border-accent/40 bg-card/90 p-6 text-xs">
            <h1 className="mb-1 text-base font-semibold text-foreground">Telemedicina bloqueada</h1>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Telemedicina está disponível apenas no plano <span className="font-semibold text-primary">+SAÚDE PRO</span>.
            </p>
            <p className="mb-4 text-[11px] text-muted-foreground">
              Faça o upgrade para desbloquear consultas remotas com especialistas.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="premium" className="w-full py-6" onClick={() => navigate("/aluno/planos")}>
                Ver planos disponíveis
              </Button>
              <Button
                variant="outline-premium"
                className="w-full py-6"
                onClick={() => navigate("/aluno/dashboard")}
              >
                Voltar ao dashboard
              </Button>
            </div>
          </Card>
        </main>
        <FloatingNavIsland />
      </>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background safe-bottom-floating-nav">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 border-b border-white/5 bg-background/80 px-4 py-4 backdrop-blur-xl safe-top">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/5 text-foreground"
            onClick={() => {
              if (filtroServico) {
                setFiltroServico(null);
              } else {
                navigate("/aluno/dashboard");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">
              {filtroServico
                ? servicos.find(s => s.id === filtroServico)?.nome
                : "Telemedicina"}
            </h1>
            <div className="flex items-center gap-2 font-black uppercase text-[8px] tracking-[0.2em] text-accent-foreground/60">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {filtroServico ? "Especialistas Disponíveis" : "Serviços em Destaque"}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6">
        {/* Step 1: Services View (ONLY show if no service filter is active) */}
        {!filtroServico ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Selecione um Serviço
              </h2>
              <p className="text-xs text-muted-foreground/60">Explore nossas especialidades e encontre o profissional ideal.</p>
            </div>

            {loading && servicos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {servicos.map((s, idx) => {
                  const Icon = getServicoIcon(s.slug);
                  const count = profissionais.filter(p => p.telemedicina_servico_id === s.id).length;

                  const colors = [
                    { color: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20", icon: "text-blue-400" },
                    { color: "from-emerald-500/10 to-emerald-600/5", border: "border-emerald-500/20", icon: "text-emerald-400" },
                    { color: "from-orange-500/10 to-orange-600/5", border: "border-orange-500/20", icon: "text-orange-400" },
                    { color: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/20", icon: "text-purple-400" },
                    { color: "from-red-500/10 to-red-600/5", border: "border-red-500/20", icon: "text-red-400" },
                    { color: "from-cyan-500/10 to-cyan-600/5", border: "border-cyan-500/20", icon: "text-cyan-400" },
                  ];
                  const c = colors[idx % colors.length];

                  return (
                    <button
                      key={s.id}
                      onClick={() => setFiltroServico(s.id)}
                      className={cn(
                        "relative flex flex-col items-start gap-4 overflow-hidden rounded-[24px] border bg-gradient-to-br p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md group h-40",
                        c.border,
                        c.color
                      )}
                    >
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 shadow-inner", c.icon)}>
                        {s.icon_url ? (
                          <img src={s.icon_url} alt={s.nome} className="h-6 w-6 object-contain" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <div className="mt-auto space-y-1">
                        <h3 className="text-sm font-bold text-white leading-none">{s.nome}</h3>
                        <p className="text-[10px] text-muted-foreground font-medium opacity-70">
                          {count} Profissional{count !== 1 ? 'is' : ''}
                        </p>
                      </div>
                      <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Icon className="h-16 w-16" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* Step 2: Professionals View (ONLY show if a service filter is active) */
          <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Profissionais Encontrados
                </h2>
                <p className="text-[10px] text-muted-foreground/60">{servicos.find(s => s.id === filtroServico)?.nome}</p>
              </div>
              <Badge variant="outline" className="text-[9px] border-white/10 uppercase tracking-widest px-3 py-1 bg-white/5">
                {professionalsFiltered.length} Especialistas
              </Badge>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-xs font-bold uppercase tracking-widest">Sincronizando Rede...</p>
              </div>
            ) : professionalsFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="mb-4 text-5xl grayscale opacity-30">👨‍⚕️</div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/40">
                  Sem Profissionais
                </h3>
                <p className="mt-1 text-[10px] text-muted-foreground/50 max-w-[200px]">Não encontramos especialistas disponíveis no momento nesta categoria.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-6 text-[10px] uppercase font-bold tracking-widest text-primary hover:bg-primary/10"
                  onClick={() => setFiltroServico(null)}
                >
                  Voltar para Categorias
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {professionalsFiltered.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setProfissionalSelecionado(p);
                      setAgendaOpen(true);
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10"
                  >
                    {/* Card Banner */}
                    <div className="relative aspect-[16/8] overflow-hidden">
                      {p.profile_image_url ? (
                        <img
                          src={p.profile_image_url}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-900/50">
                          <User className="h-10 w-10 text-white/10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="relative -mt-10 p-5 pt-0">
                      <div className="flex items-end justify-between">
                        <div className="h-16 w-16 rounded-2xl border-4 border-background bg-zinc-900 shadow-2xl flex items-center justify-center font-black text-primary text-xl uppercase overflow-hidden">
                          {p.profile_image_url ? <img src={p.profile_image_url} className="h-full w-full object-cover" /> : p.name.charAt(0)}
                        </div>
                        <div className="flex flex-col items-end gap-1 mb-2">
                          <Badge className="bg-primary text-black font-black uppercase text-[10px] px-3 py-1 shadow-lg shadow-primary/20">
                            R$ {getDiscountedPrice(p.base_price).toFixed(2)}
                          </Badge>
                          {isEliteBlack && p.base_price && p.base_price > 0 && (
                            <span className="text-[9px] text-primary font-bold uppercase tracking-tighter animate-pulse">
                              20% OFF ELITE
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors flex items-center gap-2 leading-none">
                          {p.name}
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        </h3>
                        <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-relaxed text-muted-foreground opacity-80">
                          {p.bio || "Especialista pronto para te atender de forma remota com toda excelência Nexfit."}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Disponível Agora</span>
                        </div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Agendar <span className="text-lg">→</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog
        open={agendaOpen}
        onOpenChange={(open) => {
          setAgendaOpen(open);
          if (!open) {
            resetAgendaState();
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-sm border-white/10 bg-black/90 p-0 backdrop-blur-3xl overflow-hidden rounded-[32px] outline-none flex flex-col max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Agendar Consulta</DialogTitle>
            <DialogDescription>Selecione um horário para agendar sua telemedicina.</DialogDescription>
          </DialogHeader>
          {profissionalSelecionado && (
            <div className="flex flex-col">
              <div className="relative h-40 overflow-hidden">
                <img
                  src={profissionalSelecionado.profile_image_url || "https://images.unsplash.com/photo-1576091160550-217359f51f8c?q=80&w=2070"}
                  className="h-full w-full object-cover opacity-60"
                  alt="Banner"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                <div className="absolute bottom-4 left-6 flex items-end gap-4">
                  <div className="h-16 w-16 rounded-2xl border-2 border-primary bg-zinc-900 flex items-center justify-center font-black text-primary text-2xl overflow-hidden shadow-2xl">
                    {profissionalSelecionado.profile_image_url ? <img src={profissionalSelecionado.profile_image_url} className="h-full w-full object-cover" alt="Profile" /> : profissionalSelecionado.name.charAt(0)}
                  </div>
                  <div className="mb-1">
                    <h3 className="text-xl font-black text-white leading-none mb-1">{profissionalSelecionado.name}</h3>
                    <Badge className="bg-primary/20 text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest">
                      Profissional Verificado
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6">
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Bio Profissional</p>
                  <p className="text-sm leading-relaxed text-white/80 italic font-medium">
                    "{profissionalSelecionado.bio || "Especialista dedicado a proporcionar o melhor atendimento focado em seu desempenho e saúde."}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Investimento</p>
                    <p className="text-lg font-black text-primary">
                      {profissionalSelecionado.base_price && profissionalSelecionado.base_price > 0
                        ? `R$ ${profissionalSelecionado.base_price.toFixed(2)}`
                        : "GRÁTIS"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex flex-col justify-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Duração</p>
                    <p className="text-xs font-bold text-white uppercase tracking-tighter">50 Minutos</p>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-3 sm:flex-col p-6 pt-0">
                {profissionalSelecionado.base_price && profissionalSelecionado.base_price > 0 ? (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <Button
                      variant="default"
                      className="h-12 bg-white/5 border border-white/10 text-white font-bold gap-2"
                      onClick={() => handleContratar(profissionalSelecionado!, "pix")}
                      disabled={submitting}
                    >
                      {submitting && paymentMethod === "pix" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                      Pagar com PIX
                    </Button>
                    <Button
                      variant="default"
                      className="h-12 bg-white/5 border border-white/10 text-white font-bold gap-2"
                      onClick={() => handleContratar(profissionalSelecionado!, "card")}
                      disabled={submitting}
                    >
                      {submitting && paymentMethod === "card" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Pagar com Cartão
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="premium"
                    className="h-12 w-full font-bold gap-2"
                    onClick={() => handleContratar(profissionalSelecionado!, "pix")}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirmar Contratação Gratuita
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setAgendaOpen(false)} className="text-muted-foreground">
                  Cancelar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PIX Payment Dialog */}
      <Dialog open={showPixDialog} onOpenChange={setShowPixDialog}>
        <DialogContent className="w-[98vw] max-w-[400px] sm:max-w-md max-h-[92vh] overflow-y-auto border-white/10 bg-black/95 text-white backdrop-blur-3xl rounded-[32px] flex flex-col p-4 sm:p-6 outline-none">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center sm:justify-start gap-2 text-2xl font-black">
              <QrCode className="h-6 w-6 text-primary" />
              Pagamento
            </DialogTitle>
            <DialogDescription className="text-white/60 text-xs text-center sm:text-left">
              Finalize o pagamento para confirmar sua contratação.
            </DialogDescription>
          </DialogHeader>

          {pixData && (
            <div className="flex flex-col items-center space-y-6 py-6 w-full">
              {paymentStatus === "paid" ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Pagamento Confirmado!</h3>
                    <p className="text-sm text-zinc-400">Sua consulta foi agendada.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold">
                      {paymentMethod === "pix" ? "Pagar com PIX" : "Pagar com Cartão"}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {paymentMethod === "pix"
                        ? "Escaneie o QR Code ou copie o código abaixo."
                        : "Clique no botão abaixo para pagar com segurança."}
                    </p>
                  </div>

                  {paymentMethod === "pix" ? (
                    <div className="flex flex-col w-full gap-5 items-center justify-center">
                      <div className="flex justify-center bg-white p-4 rounded-3xl shadow-2xl shadow-white/5 w-fit mx-auto">
                        <img
                          src={pixData?.pixQrCode}
                          alt="QR Code PIX"
                          className="w-[180px] h-[180px] xs:w-[220px] xs:h-[220px] sm:w-[260px] sm:h-[260px] object-contain"
                        />
                      </div>

                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">
                          <span>Código Copia e Cola</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full flex flex-col gap-4">
                          <p className="text-[10px] sm:text-xs font-mono text-zinc-400 break-all select-all text-center leading-relaxed">
                            {pixData?.pixPayload}
                          </p>
                          <Button
                            variant="secondary"
                            className="w-full text-xs font-black uppercase tracking-widest gap-2 bg-primary text-black hover:bg-primary/90 h-12 rounded-xl transition-all active:scale-95"
                            onClick={() => {
                              navigator.clipboard.writeText(pixData?.pixPayload || "");
                              toast({ title: "Copiado!", description: "Código PIX pronto para colar." });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            Copiar Código
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-6 py-4">
                      <div className="flex justify-center">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-10 w-10 text-primary" />
                        </div>
                      </div>
                      <Button
                        className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-xl"
                        onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
                      >
                        Finalizar Pagamento
                      </Button>
                    </div>
                  )}

                  <div className="w-full space-y-3 pt-4">
                    <Button
                      onClick={handleCheckPayment}
                      disabled={checkingPayment}
                      className="w-full h-12 bg-white/5 border border-white/10 text-white font-bold"
                    >
                      {checkingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                      Já realizei o pagamento
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <FloatingNavIsland />
    </main>
  );
};

export default TelemedicinaPage;
