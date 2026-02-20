import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Users, Trophy, Target, Link2, Share2, Copy, Plus, MapPin, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";

interface RunningClub {
  id: string;
  name: string;
  description: string | null;
  visibility: "public" | "private";
  invite_code: string;
  city: string | null;
  state: string | null;
}

interface RunningClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: "admin" | "member";
  status: "active" | "pending";
}

interface RunningActivity {
  id: string;
  club_id: string;
  user_id: string;
  distance_km: number;
  duration_minutes: number;
  recorded_at: string;
}

interface RunningChallenge {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  target_distance_km: number;
  start_date: string;
  end_date: string;
  active: boolean;
}

interface RankingEntry {
  user_id: string;
  total_distance: number;
  runs: number;
}

const getInviteUrl = (inviteCode: string) => {
  if (typeof window === "undefined") return inviteCode;
  const url = new URL(window.location.origin + "/aluno/running-club");
  url.searchParams.set("invite", inviteCode);
  return url.toString();
};

const RunningClubPage = () => {
  const { user } = useAuth();
  const { plan } = useUserPlan();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const isFree = plan === "FREE";

  const [clubs, setClubs] = useState<RunningClub[]>([]);
  const [memberships, setMemberships] = useState<RunningClubMember[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [activities, setActivities] = useState<RunningActivity[]>([]);
  const [challenges, setChallenges] = useState<RunningChallenge[]>([]);
  const [clubTotals, setClubTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [isLeavingClub, setIsLeavingClub] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const searchParams = new URLSearchParams(location.search);
  const inviteFromUrl = searchParams.get("invite");

  const createForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      city: "",
      state: "",
      visibility: "public" as "public" | "private",
    },
  });

  const activityForm = useForm({
    defaultValues: {
      distance_km: "",
      duration_minutes: "",
    },
  });

  const challengeForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      target_distance_km: "20",
      start_date: "",
      end_date: "",
    },
  });

  const selectedClub = useMemo(() => clubs.find((c) => c.id === selectedClubId) ?? clubs[0] ?? null, [clubs, selectedClubId]);

  const myMembership = useMemo(
    () => (selectedClub ? memberships.find((m) => m.club_id === selectedClub.id && m.user_id === user?.id) ?? null : null),
    [memberships, selectedClub, user?.id],
  );

  const isAdmin = myMembership?.role === "admin";

  const myRankings = useMemo<RankingEntry[]>(() => {
    if (!selectedClub) return [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const map = new Map<string, { distance: number; runs: number }>();
    activities
      .filter((a) => new Date(a.recorded_at) >= sevenDaysAgo)
      .forEach((a) => {
        const entry = map.get(a.user_id) ?? { distance: 0, runs: 0 };
        entry.distance += a.distance_km;
        entry.runs += 1;
        map.set(a.user_id, entry);
      });

    return Array.from(map.entries())
      .map(([user_id, { distance, runs }]) => ({ user_id, total_distance: distance, runs }))
      .sort((a, b) => b.total_distance - a.total_distance);
  }, [activities, selectedClub]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);

      const { data: memberData, error: memberError } = await supabase
        .from("running_club_members")
        .select("id, club_id, user_id, role, status")
        .eq("user_id", user.id);

      if (memberError) {
        toast({ title: "Erro ao carregar clubes", description: memberError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      setMemberships((memberData as RunningClubMember[]) ?? []);

      const clubIds = (memberData ?? []).map((m: any) => m.club_id);

      const { data: clubsData, error: clubsError } = await supabase
        .from("running_clubs")
        .select("id, name, description, visibility, invite_code, city, state")
        .in("id", clubIds.length ? clubIds : ["00000000-0000-0000-0000-000000000000"]);

      if (clubsError) {
        toast({ title: "Erro ao carregar clubes", description: clubsError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      setClubs((clubsData as RunningClub[]) ?? []);

      if (clubIds.length) {
        const { data: totalsData } = await supabase
          .from("running_club_activities")
          .select("club_id, distance_km")
          .in("club_id", clubIds);

        if (totalsData) {
          const totalsMap: Record<string, number> = {};
          (totalsData as { club_id: string; distance_km: number }[]).forEach((a) => {
            totalsMap[a.club_id] = (totalsMap[a.club_id] ?? 0) + (a.distance_km || 0);
          });
          setClubTotals(totalsMap);
        }
      }

      setLoading(false);
    };

    void loadData();
  }, [user, toast]);

  useEffect(() => {
    const loadClubData = async () => {
      if (!user || !selectedClub) return;

      const { data: activitiesData } = await supabase
        .from("running_club_activities")
        .select("id, club_id, user_id, distance_km, duration_minutes, recorded_at")
        .eq("club_id", selectedClub.id)
        .order("recorded_at", { ascending: false })
        .limit(100);

      const { data: challengesData } = await supabase
        .from("running_club_challenges")
        .select("id, club_id, title, description, target_distance_km, start_date, end_date, active")
        .eq("club_id", selectedClub.id)
        .order("start_date", { ascending: false });

      setActivities((activitiesData as RunningActivity[]) ?? []);
      setChallenges((challengesData as RunningChallenge[]) ?? []);
    };

    void loadClubData();
  }, [user, selectedClub?.id]);

  useEffect(() => {
    const handleInviteFromUrl = async () => {
      if (!user || !inviteFromUrl) return;

      const { data: club, error } = await supabase
        .from("running_clubs")
        .select("id, name, description, visibility, invite_code, city, state")
        .eq("invite_code", inviteFromUrl)
        .maybeSingle();

      if (error || !club) {
        toast({ title: "Convite inválido", description: "Não encontramos esse clube.", variant: "destructive" });
        return;
      }

      setClubs((prev) => {
        const exists = prev.find((c) => c.id === club.id);
        if (exists) return prev;
        return [...prev, club as RunningClub];
      });
      setSelectedClubId(club.id);
    };

    void handleInviteFromUrl();
  }, [user, inviteFromUrl, toast]);

  const handleCreateClub = async (values: { name: string; description: string; city: string; state: string; visibility: "public" | "private" }) => {
    if (!user) {
      toast({
        title: "Você precisa estar logado",
        description: "Entre na sua conta para criar um clube de corrida.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingClub(true);

      const inviteCode = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);

      const { data: club, error } = await supabase
        .from("running_clubs")
        .insert({
          name: values.name,
          description: values.description,
          city: values.city || null,
          state: values.state || null,
          visibility: values.visibility,
          invite_code: inviteCode,
          created_by: user.id,
        })
        .select("id, name, description, visibility, invite_code, city, state")
        .single();

      if (error || !club) {
        console.error("Erro ao criar clube", error);
        toast({
          title: "Não foi possível criar o clube",
          description: error?.message || "Ocorreu um erro inesperado. Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        return;
      }

      const { error: memberError } = await supabase.from("running_club_members").insert({
        club_id: club.id,
        user_id: user.id,
        role: "admin",
        status: "active",
      });

      if (memberError) {
        console.error("Clube criado, mas houve erro ao adicionar membro", memberError);
        toast({
          title: "Clube criado, mas houve erro ao te adicionar",
          description:
            memberError.message ||
            "Seu clube foi criado, mas não conseguimos te adicionar como membro automaticamente.",
          variant: "destructive",
        });
      }

      setClubs((prev) => [...prev, club as RunningClub]);
      setMemberships((prev) => [
        ...prev,
        {
          id: "temp",
          club_id: club.id,
          user_id: user.id,
          role: "admin",
          status: "active",
        },
      ]);
      setSelectedClubId(club.id);
      setCreateDialogOpen(false);
      toast({
        title: "Clube criado com sucesso",
        description: "Convide amigos e comece a correr junto.",
      });
    } catch (err) {
      console.error("Erro inesperado ao criar clube", err);
      toast({
        title: "Erro ao criar clube",
        description: "Algo inesperado aconteceu. Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingClub(false);
    }
  };

  const handleJoinSelectedClub = async () => {
    if (!user || !selectedClub) return;
    setIsJoining(true);

    const isPrivate = selectedClub.visibility === "private";

    const { error } = await supabase.from("running_club_members").insert({
      club_id: selectedClub.id,
      user_id: user.id,
      role: "member",
      status: isPrivate ? "pending" : "active",
    });

    setIsJoining(false);

    if (error) {
      toast({ title: "Erro ao entrar no clube", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: isPrivate ? "Pedido enviado" : "Você entrou no clube!",
      description: isPrivate
        ? "Aguarde aprovação do administrador para começar a participar."
        : "Agora é só correr junto com o seu clube.",
    });
  };

  const handleAddActivity = async (values: { distance_km: string; duration_minutes: string }) => {
    if (!user || !selectedClub) return;

    const distance = Number(values.distance_km.replace(",", "."));
    const duration = Number(values.duration_minutes);

    if (!distance || !duration) {
      toast({ title: "Dados inválidos", description: "Preencha distância e duração corretamente.", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("running_club_activities")
      .insert({
        club_id: selectedClub.id,
        user_id: user.id,
        distance_km: distance,
        duration_minutes: duration,
      })
      .select("id, club_id, user_id, distance_km, duration_minutes, recorded_at")
      .single();

    if (error || !data) {
      toast({ title: "Erro ao registrar corrida", description: error?.message ?? "", variant: "destructive" });
      return;
    }

    setActivities((prev) => [data as RunningActivity, ...prev]);
    activityForm.reset();
    toast({ title: "Corrida registrada", description: "Boa! Sua constância está fazendo diferença." });
  };

  const handleLeaveClub = async () => {
    if (!user || !selectedClub || !myMembership) return;

    setIsLeavingClub(true);

    const { error } = await supabase.from("running_club_members").delete().eq("id", myMembership.id);

    setIsLeavingClub(false);

    if (error) {
      toast({
        title: "Erro ao sair do clube",
        description: error.message || "Não foi possível concluir sua saída. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setMemberships((prev) => prev.filter((m) => m.id !== myMembership.id));
    setClubs((prev) => prev.filter((c) => c.id !== selectedClub.id));

    const remainingMembership = memberships.find((m) => m.id !== myMembership.id);
    setSelectedClubId(remainingMembership ? remainingMembership.club_id : null);

    toast({
      title: "Você saiu do clube",
      description: "Quando quiser, é só entrar em outro clube ou criar o seu.",
    });
  };

  const handleCreateChallenge = async (values: {
    title: string;
    description: string;
    target_distance_km: string;
    start_date: string;
    end_date: string;
  }) => {
    if (!user || !selectedClub || !isAdmin) return;

    const target = Number(values.target_distance_km.replace(",", "."));

    const { data, error } = await supabase
      .from("running_club_challenges")
      .insert({
        club_id: selectedClub.id,
        title: values.title,
        description: values.description,
        target_distance_km: target,
        start_date: values.start_date,
        end_date: values.end_date,
        created_by: user.id,
      })
      .select("id, club_id, title, description, target_distance_km, start_date, end_date, active")
      .single();

    if (error || !data) {
      toast({ title: "Erro ao criar desafio", description: error?.message ?? "", variant: "destructive" });
      return;
    }

    setChallenges((prev) => [data as RunningChallenge, ...prev]);
    challengeForm.reset();
    toast({ title: "Desafio criado", description: "Agora é só correr e bater a meta com o clube." });
  };

  const handleCopyInvite = () => {
    if (!selectedClub) return;
    const url = getInviteUrl(selectedClub.invite_code);
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copiado", description: "Envie para amigos e monte seu pelotão de corrida." });
    });
  };

  const handleGoBack = () => {
    navigate("/aluno/dashboard");
  };

  const emptyState = !loading && !selectedClub;

  const filteredClubs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const stateTerm = stateFilter.trim().toLowerCase();
    const cityTerm = cityFilter.trim().toLowerCase();

    return clubs
      .filter((club) => {
        const name = (club.name ?? "").toLowerCase();
        const city = (club.city ?? "").toLowerCase();
        const state = (club.state ?? "").toLowerCase();

        const matchesSearch = term ? name.includes(term) : true;
        const matchesVisibility = visibilityFilter === "all" ? true : club.visibility === visibilityFilter;
        const matchesState = stateTerm ? state.includes(stateTerm) : true;
        const matchesCity = cityTerm ? city.includes(cityTerm) : true;

        return matchesSearch && matchesVisibility && matchesState && matchesCity;
      });
  }, [clubs, searchTerm, visibilityFilter, stateFilter, cityFilter]);

  if (isFree) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background px-4 pb-32 pt-6">
        {/* Premium Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
          <div className="absolute -top-[40%] -left-[20%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-3xl filter" />
          <div className="absolute top-[20%] -right-[20%] h-[600px] w-[600px] rounded-full bg-accent/10 blur-3xl filter" />
          <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        <div className="relative z-10">
          <header className="mb-8 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/aluno/dashboard")} className="mr-1 text-foreground hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-bold">Running Club</p>
              <h1 className="text-2xl font-black italic text-foreground tracking-tighter uppercase">
                RECURSO <span className="text-primary">PREMIUM</span>
              </h1>
            </div>
          </header>

          <section className="mt-12 flex flex-col items-center text-center">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 ring-1 ring-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
              <Lock className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <h2 className="text-3xl font-black italic text-foreground uppercase tracking-tight mb-4">Junte-se ao Pelotão</h2>
            <p className="text-sm text-muted-foreground mb-10 max-w-xs font-medium leading-relaxed">
              O Running Club é um ecossistema exclusivo para membros <span className="text-foreground font-bold italic">Advance</span> e <span className="text-foreground font-bold italic">Elite</span>.
              Participe de clubes, desafios épicos e rankings globais.
            </p>
            <Button
              variant="premium"
              size="lg"
              className="w-full py-7 text-lg font-black uppercase tracking-wider shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all"
              onClick={() => navigate("/aluno/plano")}
            >
              UPGRADE PARA LIBERAR
            </Button>
          </section>
        </div>
        <FloatingNavIsland />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 pb-32 pt-6">
      {/* Premium Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="absolute -top-[40%] -left-[20%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-3xl filter" />
        <div className="absolute top-[20%] -right-[20%] h-[600px] w-[600px] rounded-full bg-accent/10 blur-3xl filter" />
        <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="relative z-10">
        <header className="mb-8 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
            className="mr-1 text-foreground hover:bg-white/10"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-bold">Running Club</p>
            <h1 className="text-2xl font-black italic text-foreground tracking-tighter uppercase leading-none">
              CORRA <span className="text-primary">JUNTO</span>. EVOLUA <span className="text-primary">JUNTO</span>.
            </h1>
          </div>
        </header>

        <section className="space-y-6">
          <Button
            variant="premium"
            className="w-full py-6 text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-5 w-5" /> Criar meu clube de corrida
          </Button>

          {clubs.length > 0 && (
            <>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" className="w-full text-[13px]">
                      Filtrar clubes
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="z-50 w-80 bg-card p-3">
                    <div className="space-y-2">
                      <Input
                        placeholder="Buscar clube pelo nome"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Select
                        value={visibilityFilter}
                        onValueChange={(value: "all" | "public" | "private") => setVisibilityFilter(value)}
                      >
                        <SelectTrigger className="h-9 w-full text-xs">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="public">Públicos</SelectItem>
                          <SelectItem value="private">Privados</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Estado"
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Input
                        placeholder="Cidade"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-6 space-y-3">
                {filteredClubs.map((club) => {
                  const city = club.city || "Cidade não informada";
                  const state = club.state || "Estado não informado";
                  const totalKm = clubTotals[club.id] ?? 0;

                  return (
                    <Card
                      key={club.id}
                      className={`group border-white/5 bg-black/40 backdrop-blur-xl transition-all hover:scale-[1.01] active:scale-[0.99] ${selectedClub?.id === club.id ? "ring-2 ring-primary bg-primary/10" : "hover:bg-white/5"
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClubId(club.id);
                          navigate(`/aluno/running-club/${club.id}`);
                        }}
                        className="flex w-full items-center gap-4 p-4 text-left"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-primary ring-1 ring-white/10 group-hover:bg-primary/20 group-hover:text-white transition-colors">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <span className="text-base font-black italic uppercase tracking-tight text-foreground">{club.name}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            <MapPin className="h-3 w-3" />
                            {city} • {state}
                          </div>
                        </div>
                        <div className="flex flex-col items-end text-right">
                          <span className="text-xl font-black text-primary tracking-tighter">{totalKm.toFixed(1)} <span className="text-[10px] uppercase font-bold tracking-normal italic">KM</span></span>
                          <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none">TOTAL</span>
                        </div>
                      </button>
                    </Card>
                  );
                })}
              </div>
            </>
          )}


          {/* Conteúdo interno do clube removido desta página a pedido do usuário.
            Agora esta tela exibe apenas o botão de criação, filtros e cards de clubes. */}
        </section>

        {emptyState && (
          <section className="mt-4 space-y-3">
            <Card className="border border-accent/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Comece seu Running Club</CardTitle>
                <CardDescription className="text-[11px]">
                  Crie um clube em menos de 1 minuto, convide amigos e transforme treino em comunidade.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 text-[11px] text-muted-foreground space-y-1">
                <p>
                  • Crie um clube público ou privado.
                </p>
                <p>
                  • Compartilhe o link exclusivo pelo WhatsApp.
                </p>
                <p>
                  • Registre corridas, participe de desafios e acompanhe rankings semanais.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar meu clube de corrida</DialogTitle>
              <DialogDescription className="text-xs">
                Defina um nome, uma descrição curta e escolha se ele será público ou privado.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form
                className="space-y-3"
                onSubmit={createForm.handleSubmit((values) => void handleCreateClub(values))}
              >
                <FormField
                  control={createForm.control}
                  name="name"
                  rules={{ required: "Informe o nome do clube" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do clube</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Pelotão 5AM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição curta</FormLabel>
                      <FormControl>
                        <Textarea rows={2} placeholder="Clube para quem quer constância e corridas leves durante a semana." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={createForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: SP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibilidade</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => field.onChange(v as "public" | "private")}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">Público (entrada direta)</SelectItem>
                          <SelectItem value="private">Privado (apenas com aprovação)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="mt-2">
                  <Button type="submit" className="w-full" disabled={isCreatingClub}>
                    {isCreatingClub ? "Criando..." : "Criar clube agora"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={shareDialogOpen && !!selectedClub} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Compartilhar clube</DialogTitle>
              <DialogDescription className="text-xs">
                Use o link exclusivo para convidar amigos e montar sua comunidade de corrida.
              </DialogDescription>
            </DialogHeader>
            {selectedClub && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Link do clube</p>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={getInviteUrl(selectedClub.invite_code)} className="text-[11px]" />
                    <Button type="button" size="icon" variant="outline" onClick={handleCopyInvite}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleCopyInvite}
                  >
                    <Share2 className="mr-1 h-3 w-3" /> WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleCopyInvite}
                  >
                    <Link2 className="mr-1 h-3 w-3" /> Outras redes
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Dica: envie o link em grupos de WhatsApp, salve no Instagram ou compartilhe com seu treinador para manter o
                  pelotão sempre ativo.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <FloatingNavIsland />
    </main>
  );
};

export default RunningClubPage;
