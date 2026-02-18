import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Users, Trophy, Target, MapPin, Clock, ArrowLeft, Share2, Copy, Link2, ShieldCheck, MoreVertical, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface ClubPost {
  id: string;
  club_id: string;
  user_id: string;
  activity_id: string;
  image_url: string | null;
  caption: string | null;
  created_at: string;
  distance_km: number;
  duration_minutes: number;
  recorded_at: string;
  author_name: string | null;
  author_initials: string | null;
  activity_type: string | null;
  pace: string | null;
  calories: number | null;
  author_avatar_url: string | null;
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

const RunningClubDetailPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();

  const [club, setClub] = useState<RunningClub | null>(null);
  const [membership, setMembership] = useState<RunningClubMember | null>(null);
  const [activities, setActivities] = useState<RunningActivity[]>([]);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [challenges, setChallenges] = useState<RunningChallenge[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isLeavingClub, setIsLeavingClub] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, { id: string; user_id: string; comment: string; created_at: string }[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentSubmittingId, setCommentSubmittingId] = useState<string | null>(null);
  const [commentDialogPostId, setCommentDialogPostId] = useState<string | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [detailDialogPost, setDetailDialogPost] = useState<ClubPost | null>(null);
  const [detailActivity, setDetailActivity] = useState<{
    id: string;
    tipo_atividade: string;
    iniciado_em: string | null;
    finalizado_em: string | null;
    distance_km: number | null;
    calorias_estimadas: number | null;
    pace_avg: number | null;
    bpm_medio: number | null;
  } | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const location = useLocation();

  const editForm = useForm({
    defaultValues: {
      name: club?.name || "",
      description: club?.description || "",
      city: club?.city || "",
      state: club?.state || "",
      visibility: (club?.visibility || "public") as "public" | "private",
    },
  });

  useEffect(() => {
    if (club) {
      editForm.reset({
        name: club.name,
        description: club.description || "",
        city: club.city || "",
        state: club.state || "",
        visibility: club.visibility,
      });
    }
  }, [club, editForm]);

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

  const myRankings = useMemo<RankingEntry[]>(() => {
    if (!activities.length) return [];
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
  }, [activities]);

  const totalDistanceKm = activities.reduce((sum, activity) => sum + (activity.distance_km || 0), 0);
  const totalCalories = totalDistanceKm * 60;

  const loadClubAndFeed = useCallback(async () => {
    if (!user || !clubId) return;

    setIsFeedLoading(true);
    setFeedError(null);

    try {
      console.log("[RunningClubDetail] Carregando dados do clube e feed", { clubId, userId: user.id });

      const { data: clubData, error: clubError } = await supabase
        .from("running_clubs")
        .select("id, name, description, visibility, invite_code, city, state")
        .eq("id", clubId)
        .maybeSingle();

      if (clubError || !clubData) {
        toast({
          title: "Clube não encontrado",
          description: clubError?.message ?? "",
          variant: "destructive",
        });
        navigate("/aluno/running-club", { replace: true });
        setFeedError(clubError?.message ?? "Clube não encontrado");
        return;
      }

      setClub(clubData as RunningClub);

      const { data: memberData } = await supabase
        .from("running_club_members")
        .select("id, club_id, user_id, role, status")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .maybeSingle();

      setMembership((memberData as RunningClubMember) ?? null);

      const [{ data: activitiesData }, { data: challengesData }] = await Promise.all([
        supabase
          .from("running_club_activities")
          .select(
            "id, club_id, user_id, distance_km, duration_minutes, recorded_at, activity_image_url, caption, author_name, author_initials",
          )
          .eq("club_id", clubId)
          .order("recorded_at", { ascending: false })
          .limit(100),
        supabase
          .from("running_club_challenges")
          .select("id, club_id, title, description, target_distance_km, start_date, end_date, active")
          .eq("club_id", clubId)
          .order("start_date", { ascending: false }),
      ]);

      setActivities((activitiesData as RunningActivity[]) ?? []);
      setChallenges((challengesData as RunningChallenge[]) ?? []);

      console.log("[RunningClubDetail] Carregando feed do clube a partir de club_posts", {
        selectedClubId: clubData.id,
        queryClubId: clubData.id,
      });

      const { data: postsData, error: postsError } = await supabase
        .from("club_posts")
        .select(
          "id, club_id, user_id, activity_id, image_url, caption, created_at, distance_km, duration_minutes, pace, calories, activity_type, author_name, author_initials, author_avatar_url",
        )
        .eq("club_id", clubData.id)
        .order("created_at", { ascending: false })
        .limit(100);

      console.log("[RunningClubDetail] Resultado da query em club_posts", {
        clubIdRoute: clubId,
        clubIdQuery: clubData.id,
        postsCount: postsData?.length ?? 0,
        sampleClubIds: postsData?.slice(0, 3).map((p: any) => p.club_id) ?? [],
      });

      if (postsError) {
        console.error("[RunningClubDetail] Erro ao carregar posts do clube", postsError);
        setFeedError("Erro ao carregar o feed do clube.");
        return;
      }

      if (postsData) {
        const mappedPosts: ClubPost[] = (postsData as any[]).map((row) => ({
          id: row.id,
          club_id: row.club_id,
          user_id: row.user_id,
          activity_id: row.activity_id,
          image_url: row.image_url,
          caption: row.caption,
          created_at: row.created_at,
          distance_km: row.distance_km ?? 0,
          duration_minutes: row.duration_minutes ?? 0,
          recorded_at: row.created_at,
          author_name: row.author_name ?? null,
          author_initials: row.author_initials ?? null,
          activity_type: row.activity_type ?? null,
          pace: row.pace ?? null,
          calories: row.calories ?? null,
          author_avatar_url: row.author_avatar_url ?? null,
        }));

        setPosts(mappedPosts);

        const postIds = mappedPosts.map((p) => p.id);
        if (postIds.length > 0) {
          const [{ data: likesData }, { data: commentsData }] = await Promise.all([
            supabase.from("club_post_likes").select("post_id, user_id").in("post_id", postIds),
            supabase.from("club_post_comments").select("id, post_id, user_id, comment, created_at").in("post_id", postIds),
          ]);

          const likeCountMap: Record<string, number> = {};
          const likedByMeMap: Record<string, boolean> = {};
          const commentsMap: Record<string, { id: string; user_id: string; comment: string; created_at: string }[]> = {};

          (likesData ?? []).forEach((like) => {
            likeCountMap[like.post_id] = (likeCountMap[like.post_id] ?? 0) + 1;
            if (like.user_id === user.id) {
              likedByMeMap[like.post_id] = true;
            }
          });

          const commentCountMap: Record<string, number> = {};
          (commentsData ?? []).forEach((comment) => {
            commentCountMap[comment.post_id] = (commentCountMap[comment.post_id] ?? 0) + 1;
            const list = commentsMap[comment.post_id] ?? [];
            list.push({
              id: comment.id,
              user_id: comment.user_id,
              comment: comment.comment,
              created_at: comment.created_at,
            });
            commentsMap[comment.post_id] = list;
          });

          setLikeCounts(likeCountMap);
          setLikedPosts(likedByMeMap);
          setCommentCounts(commentCountMap);
          setCommentsByPost(commentsMap);
        }
      }
    } catch (error) {
      console.error("[RunningClubDetail] Erro inesperado ao carregar clube e feed", error);
      setFeedError("Erro inesperado ao carregar o feed do clube.");
    } finally {
      setIsFeedLoading(false);
    }
  }, [user, clubId, toast, navigate]);

  useEffect(() => {
    void loadClubAndFeed();
  }, [loadClubAndFeed]);

  useEffect(() => {
    const state = location.state as { newPost?: ClubPost } | null;
    if (state?.newPost) {
      setPosts((prev) => {
        if (prev.some((p) => p.id === state.newPost!.id)) return prev;
        return [state.newPost!, ...prev];
      });
    }
  }, [location.state]);

  // Atualizações em tempo real do feed (novos posts e atualizações de imagem)
  useEffect(() => {
    if (!clubId) return;

    const channel = supabase
      .channel("running-club-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "club_posts", filter: `club_id=eq.${clubId}` },
        (payload: any) => {
          console.log("[RunningClubDetail] Novo post inserido em club_posts (realtime)", payload);
          const newPost = payload.new;

          const mapped: ClubPost = {
            id: newPost.id,
            club_id: newPost.club_id,
            user_id: newPost.user_id,
            activity_id: newPost.activity_id,
            image_url: newPost.image_url,
            caption: newPost.caption,
            created_at: newPost.created_at,
            distance_km: newPost.distance_km ?? 0,
            duration_minutes: newPost.duration_minutes ?? 0,
            recorded_at: newPost.created_at,
            author_name: newPost.author_name ?? null,
            author_initials: newPost.author_initials ?? null,
            activity_type: newPost.activity_type ?? null,
            pace: newPost.pace ?? null,
            calories: newPost.calories ?? null,
            author_avatar_url: newPost.author_avatar_url ?? null,
          };

          setPosts((prev) => [mapped, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "club_posts", filter: `club_id=eq.${clubId}` },
        (payload: any) => {
          console.log("[RunningClubDetail] Atualização em club_posts (realtime)", payload);
          const updated = payload.new;
          setPosts((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, image_url: updated.image_url ?? p.image_url } : p)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId]);

  const isAdmin = membership?.role === "admin";

  const handleGoBack = () => {
    navigate("/aluno/running-club");
  };

  const handleOpenDetailDialog = async (post: ClubPost) => {
    if (!post.activity_id) {
      toast({
        title: "Sem detalhes do treino",
        description: "Este post não está vinculado a uma sessão de treino.",
        variant: "destructive",
      });
      return;
    }

    setDetailDialogPost(post);
    setIsDetailLoading(true);
    setDetailActivity(null);

    const { data, error } = await supabase
      .from("atividade_sessao")
      .select(
        "id, tipo_atividade, iniciado_em, finalizado_em, distance_km, calorias_estimadas, pace_avg, bpm_medio",
      )
      .eq("id", post.activity_id)
      .maybeSingle();

    if (error) {
      console.error("[RunningClubDetail] Erro ao carregar detalhes da sessão", error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível carregar os detalhes completos do treino.",
        variant: "destructive",
      });
    } else if (data) {
      setDetailActivity(data as any);
    }

    setIsDetailLoading(false);
  };
  const handleAddActivity = async (values: { distance_km: string; duration_minutes: string }) => {
    if (!user || !club) return;

    const distance = Number(values.distance_km.replace(",", "."));
    const duration = Number(values.duration_minutes);

    if (!distance || !duration) {
      toast({ title: "Dados inválidos", description: "Preencha distância e duração corretamente.", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("running_club_activities")
      .insert({
        club_id: club.id,
        user_id: user.id,
        distance_km: distance,
        duration_minutes: duration,
      })
      .select("id, club_id, user_id, distance_km, duration_minutes, recorded_at, activity_image_url, caption")
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
    if (!user || !club || !membership) return;
    setIsLeavingClub(true);

    const { error } = await supabase
      .from("running_club_members")
      .delete()
      .eq("id", membership.id);

    if (error) {
      toast({ title: "Erro ao sair do clube", description: error.message, variant: "destructive" });
      setIsLeavingClub(false);
      return;
    }

    toast({ title: "Você saiu do clube", description: "Esperamos te ver de volta em breve!" });
    navigate("/aluno/running-club");
  };

  const handleEditClub = async (values: {
    name: string;
    description: string;
    city: string;
    state: string;
    visibility: "public" | "private";
  }) => {
    if (!club) return;

    const { data, error } = await supabase
      .from("running_clubs")
      .update({
        name: values.name,
        description: values.description,
        city: values.city,
        state: values.state,
        visibility: values.visibility,
      })
      .eq("id", club.id)
      .select()
      .single();

    if (error || !data) {
      toast({ title: "Erro ao atualizar clube", description: error?.message ?? "", variant: "destructive" });
      return;
    }

    setClub(data as RunningClub);
    setEditDialogOpen(false);
    toast({ title: "Clube atualizado", description: "As informações do clube foram atualizadas com sucesso." });
  };

  const handleCopyInviteLink = () => {
    if (!club) return;
    const url = getInviteUrl(club.invite_code);
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado", description: "Compartilhe o link para convidar novos membros." });
  };

  if (!club) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground pb-32">
        <span>Carregando clube...</span>
        <FloatingNavIsland />
      </div>
    );
  }

  const isMember = Boolean(membership);

  return (
    <main className="safe-bottom-main flex min-h-screen flex-col gap-4 bg-background px-4 pb-32 pt-4">
      <header className="mb-2 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleGoBack}
          className="mr-1 text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.3em] text-accent-foreground/80">Running Club</span>
          <h1 className="mt-1 page-title-gradient text-xl font-semibold tracking-tight">{club.name}</h1>
        </div>
      </header>

      {isMember && (
        <section className="space-y-3">
          <Card className="border border-accent/50 bg-card/80">
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span>Detalhes do clube</span>
                </CardTitle>
              </div>
              <div className="flex items-center gap-1 self-start">
                {isAdmin && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/60 bg-background/80">
                    <ShieldCheck className="h-3 w-3 text-accent" aria-label="Admin do clube" />
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      aria-label="Ações do clube"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="z-50 bg-popover text-popover-foreground border border-border/60"
                  >
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                        Editar clube
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                      Compartilhar convite
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        void handleLeaveClub();
                      }}
                      className="text-destructive"
                    >
                      Sair do clube
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                  Foto
                </div>
                <div className="flex flex-col text-xs">
                  <span className="text-[11px] text-muted-foreground">KMs do clube</span>
                  <span className="text-base font-semibold">{totalDistanceKm.toFixed(1)} km</span>
                  <span className="mt-1 text-[11px] text-muted-foreground">
                    Calorias estimadas: {Math.round(totalCalories).toLocaleString()} kcal
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                "Convide amigos e transforme treino em comunidade." Quanto mais gente correndo junto, maior a constância.
              </p>
            </CardContent>
          </Card>

          <Tabs defaultValue="atividades" className="w-full">
            <TabsList className="w-full justify-between">
              <TabsTrigger value="atividades" className="flex-1 text-xs">
                <MapPin className="mr-1 h-3 w-3" /> Feed
              </TabsTrigger>
              <TabsTrigger value="ranking" className="flex-1 text-xs">
                <Trophy className="mr-1 h-3 w-3" /> Ranking
              </TabsTrigger>
              <TabsTrigger value="desafios" className="flex-1 text-xs">
                <Target className="mr-1 h-3 w-3" /> Desafios
              </TabsTrigger>
            </TabsList>

            <TabsContent value="atividades" className="mt-3 space-y-3">
              <Card className="border border-border/60 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">Feed do clube</CardTitle>
                  <CardDescription className="text-[11px]">
                    Atividades compartilhadas pelos membros, em formato de feed social.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 space-y-3">
                  {isFeedLoading && (
                    <p className="text-[11px] text-muted-foreground">Carregando feed do clube...</p>
                  )}

                  {!isFeedLoading && feedError && (
                    <div className="space-y-2 text-[11px]">
                      <p className="text-destructive">Erro ao carregar o feed do clube.</p>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-7 px-3 text-[11px]"
                        onClick={() => {
                          void loadClubAndFeed();
                        }}
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  )}

                  {!isFeedLoading && !feedError && posts.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Ainda não há posts no feed. Compartilhe sua próxima corrida para o clube.
                    </p>
                  )}

                  {!isFeedLoading &&
                    posts.map((post) => {
                      const pace = post.distance_km > 0 ? post.duration_minutes / post.distance_km : 0;
                      const date = new Date(post.recorded_at || post.created_at);
                      const liked = likedPosts[post.id] ?? false;
                      const likeCount = likeCounts[post.id] ?? 0;
                      const comments = commentsByPost[post.id] ?? [];
                      const timeLabel = date.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      });

                      return (
                        <article
                          key={post.id}
                          className="overflow-hidden rounded-xl border border-border/60 bg-background/80 text-xs shadow-sm"
                        >
                          {/* Header estilo Instagram */}
                          <header className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-[11px] font-semibold text-foreground">
                                {post.author_initials || (post.author_name ? post.author_name[0]?.toUpperCase() : "C")}
                              </div>
                              <div className="flex flex-col leading-tight">
                                <span className="text-[11px] font-semibold text-foreground">
                                  {post.author_name || "Corredor"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">Running Club • {timeLabel}</span>
                              </div>
                            </div>
                            <MoreVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </header>

                          {/* Imagem / placeholder */}
                          {post.image_url ? (
                            <div className="bg-black">
                              <img
                                src={post.image_url}
                                alt={post.caption || "Atividade do clube"}
                                className="aspect-[4/5] w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="flex aspect-[4/5] w-full flex-col justify-center gap-1 bg-muted/40 px-4 text-[11px] text-muted-foreground">
                              <span className="font-semibold text-foreground">Resumo do treino</span>
                              <span>
                                {post.distance_km.toFixed(2)} km • {post.duration_minutes} min
                                {post.pace && ` • Ritmo médio ${post.pace}`}
                              </span>
                            </div>
                          )}

                          {/* Barra de ações */}
                          <div className="flex items-center justify-between px-3 pt-2 text-[11px]">
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 p-0 text-foreground hover:bg-accent/20"
                                onClick={async () => {
                                  if (!user) return;
                                  const newLiked = !liked;
                                  setLikedPosts((prev) => ({ ...prev, [post.id]: newLiked }));
                                  setLikeCounts((prev) => ({
                                    ...prev,
                                    [post.id]: (prev[post.id] ?? 0) + (newLiked ? 1 : -1),
                                  }));

                                  if (newLiked) {
                                    const { error } = await supabase.from("club_post_likes").insert({
                                      post_id: post.id,
                                      user_id: user.id,
                                    });
                                    if (error) {
                                      console.error("Erro ao curtir post", error);
                                      setLikedPosts((prev) => ({ ...prev, [post.id]: liked }));
                                      setLikeCounts((prev) => ({
                                        ...prev,
                                        [post.id]: likeCount,
                                      }));
                                    }
                                  } else {
                                    const { error } = await supabase
                                      .from("club_post_likes")
                                      .delete()
                                      .eq("post_id", post.id)
                                      .eq("user_id", user.id);
                                    if (error) {
                                      console.error("Erro ao remover curtida", error);
                                      setLikedPosts((prev) => ({ ...prev, [post.id]: liked }));
                                      setLikeCounts((prev) => ({
                                        ...prev,
                                        [post.id]: likeCount,
                                      }));
                                    }
                                  }
                                }}
                              >
                                {liked ? "❤" : "♡"}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 p-0 text-foreground hover:bg-accent/20"
                                onClick={() => setCommentDialogPostId(post.id)}
                                aria-label="Ver comentários do post"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                              {comments.length > 0 && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  {comments.length === 1
                                    ? "1 comentário"
                                    : `${comments.length} comentários`}
                                </span>
                              )}
                            </div>
                            <Share2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </div>

                          {/* Metricas + legenda */}
                          <div className="space-y-1 px-3 pt-1 pb-2 text-[11px]">
                            {likeCount > 0 && (
                              <p className="font-semibold text-foreground">
                                {likeCount === 1 ? "1 curtida" : `${likeCount} curtidas`}
                              </p>
                            )}

                            <p className="text-foreground">
                              <span className="font-semibold mr-1">{post.author_name || "Corredor"}</span>
                              {post.caption || "Compartilhou um treino com o clube."}
                            </p>

                            <p className="text-muted-foreground">
                              {post.distance_km.toFixed(2)} km • {post.duration_minutes} min
                              {post.distance_km > 0 && pace > 0 && ` • Ritmo ~ ${pace.toFixed(1)} min/km`}
                              {post.calories ? ` • ${Math.round(post.calories)} kcal` : ""}
                            </p>

                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="mt-1 h-7 px-2 text-[10px]"
                              onClick={() => {
                                void handleOpenDetailDialog(post);
                              }}
                            >
                              Ver detalhes do treino
                            </Button>

                            {comments.length > 0 && (
                              <button
                                type="button"
                                className="mt-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                                onClick={() => setCommentDialogPostId(post.id)}
                              >
                                Ver todos os comentários
                              </button>
                            )}

                            <p className="pt-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                              {date.toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ranking tab content */}
            <TabsContent value="ranking" className="mt-3 space-y-3">
              <Card className="border border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">Ranking semanal</CardTitle>
                  <CardDescription className="text-[11px]">
                    Distância total percorrida pelos membros nos últimos 7 dias.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {myRankings.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Nenhuma corrida registrada nos últimos 7 dias.</p>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1 text-[11px]">
                      {myRankings.map((entry, index) => (
                        <li key={entry.user_id} className="flex justify-between">
                          <span>{entry.user_id}</span>
                          <span>
                            {entry.total_distance.toFixed(2)} km em {entry.runs} corrida{entry.runs > 1 ? "s" : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Desafios tab content */}
            <TabsContent value="desafios" className="mt-3 space-y-3">
              <Card className="border border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">Desafios</CardTitle>
                  <CardDescription className="text-[11px]">
                    Desafios ativos e passados do clube.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 space-y-2">
                  {challenges.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Nenhum desafio criado ainda.</p>
                  ) : (
                    challenges.map((challenge) => (
                      <div key={challenge.id} className="rounded border border-border/60 p-2 text-xs">
                        <h3 className="font-semibold">{challenge.title}</h3>
                        <p className="text-muted-foreground">{challenge.description}</p>
                        <p className="mt-1 text-[11px]">
                          Meta: {challenge.target_distance_km} km | De {new Date(challenge.start_date).toLocaleDateString()} até {new Date(challenge.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-[11px] font-medium">
                          Status: {challenge.active ? "Ativo" : "Inativo"}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      )}

      {/* Comments Dialog */}
      <Dialog open={Boolean(commentDialogPostId)} onOpenChange={(open) => !open && setCommentDialogPostId(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comentários do post</DialogTitle>
            <DialogDescription>
              Veja o que outros membros comentaram e participe da conversa.
            </DialogDescription>
          </DialogHeader>

          {commentDialogPostId && (
            <div className="space-y-3 text-[11px]">
              <div className="space-y-2 max-h-64 overflow-y-auto border border-border/40 rounded-md p-2 bg-muted/40">
                {(commentsByPost[commentDialogPostId] ?? []).map((comment) => {
                  const commentDate = new Date(comment.created_at);
                  return (
                    <div key={comment.id} className="flex items-start justify-between gap-2">
                      <p className="flex-1 text-foreground">
                        <span className="font-semibold mr-1">Membro</span>
                        {comment.comment}
                      </p>
                      <span className="text-[9px] text-muted-foreground">
                        {commentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}

                {(commentsByPost[commentDialogPostId] ?? []).length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Seja o primeiro a comentar neste post.</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Adicione um comentário..."
                  className="h-8 text-[11px]"
                  value={commentInputs[commentDialogPostId] ?? ""}
                  onChange={(e) =>
                    setCommentInputs((prev) => ({
                      ...prev,
                      [commentDialogPostId]: e.target.value,
                    }))
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-3 text-[11px]"
                  disabled={
                    !user ||
                    !commentDialogPostId ||
                    !commentInputs[commentDialogPostId]?.trim() ||
                    (commentSubmittingId !== null && commentSubmittingId === commentDialogPostId)
                  }
                  onClick={async () => {
                    if (!user || !commentDialogPostId) return;
                    const text = commentInputs[commentDialogPostId]?.trim();
                    if (!text) return;

                    setCommentSubmittingId(commentDialogPostId);
                    try {
                      const { data, error } = await supabase
                        .from("club_post_comments")
                        .insert({
                          post_id: commentDialogPostId,
                          user_id: user.id,
                          comment: text,
                        })
                        .select("id, post_id, user_id, comment, created_at")
                        .single();

                      if (error || !data) {
                        console.error("Erro ao adicionar comentário", error);
                        return;
                      }

                      setCommentsByPost((prev) => {
                        const list = prev[commentDialogPostId] ?? [];
                        return {
                          ...prev,
                          [commentDialogPostId]: [...list, data],
                        };
                      });
                      setCommentCounts((prev) => ({
                        ...prev,
                        [commentDialogPostId]: (prev[commentDialogPostId] ?? 0) + 1,
                      }));
                      setCommentInputs((prev) => ({
                        ...prev,
                        [commentDialogPostId]: "",
                      }));
                    } finally {
                      setCommentSubmittingId((current) => (current === commentDialogPostId ? null : current));
                    }
                  }}
                >
                  Publicar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Workout Detail Dialog */}
      <Dialog
        open={Boolean(detailDialogPost)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailDialogPost(null);
            setDetailActivity(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do treino</DialogTitle>
            <DialogDescription>Resumo completo da sessão compartilhada com o clube.</DialogDescription>
          </DialogHeader>

          {!detailDialogPost && <p className="text-xs text-muted-foreground">Nenhum treino selecionado.</p>}

          {detailDialogPost && (
            <div className="space-y-3 text-xs">
              {isDetailLoading && <p className="text-muted-foreground">Carregando detalhes do treino...</p>}

              {!isDetailLoading && (
                <>
                  {detailDialogPost.image_url && (
                    <img
                      src={detailDialogPost.image_url}
                      alt={detailDialogPost.caption || "Imagem do treino"}
                      className="w-full rounded-md object-cover"
                    />
                  )}

                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {detailDialogPost.author_name || "Corredor"}
                    </p>
                    <p className="text-muted-foreground">{detailDialogPost.caption}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-md border border-border/60 bg-background/80 p-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Distância</span>
                      <p className="text-sm font-semibold">
                        {detailActivity?.distance_km ?? detailDialogPost.distance_km} km
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Duração</span>
                      <p className="text-sm font-semibold">{detailDialogPost.duration_minutes} min</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Ritmo médio</span>
                      <p className="text-sm font-semibold">
                        {detailActivity?.pace_avg
                          ? `${detailActivity.pace_avg.toFixed(1)} min/km`
                          : detailDialogPost.pace ?? "--"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Calorias</span>
                      <p className="text-sm font-semibold">
                        {detailActivity?.calorias_estimadas
                          ? `${Math.round(detailActivity.calorias_estimadas)} kcal`
                          : detailDialogPost.calories
                            ? `${Math.round(detailDialogPost.calories)} kcal`
                            : "--"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">BPM médio</span>
                      <p className="text-sm font-semibold">
                        {detailActivity?.bpm_medio ? `${detailActivity.bpm_medio} bpm` : "--"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Tipo de atividade</span>
                      <p className="text-sm font-semibold">
                        {detailActivity?.tipo_atividade ?? detailDialogPost.activity_type ?? "--"}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    {detailActivity?.iniciado_em && detailActivity?.finalizado_em
                      ? `Início: ${new Date(detailActivity.iniciado_em).toLocaleString("pt-BR")} • Fim: ${new Date(
                        detailActivity.finalizado_em,
                      ).toLocaleString("pt-BR")}`
                      : `Publicado em ${new Date(detailDialogPost.created_at).toLocaleString("pt-BR")}`}
                  </p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Club Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar clube</DialogTitle>
            <DialogDescription>Atualize as informações do seu clube.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEditClub)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do clube" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrição do clube" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="Estado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibilidade</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full rounded border border-border bg-background px-2 py-1 text-sm">
                        <option value="public">Público</option>
                        <option value="private">Privado</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Share Invite Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar convite</DialogTitle>
            <DialogDescription>
              Compartilhe o link abaixo para convidar novos membros para o clube.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              readOnly
              value={club ? getInviteUrl(club.invite_code) : ""}
              className="w-full rounded border border-border bg-muted px-2 py-1 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                Fechar
              </Button>
              <Button onClick={handleCopyInviteLink}>Copiar link</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Club Confirmation Dialog */}
      <AlertDialog open={isLeavingClub} onOpenChange={setIsLeavingClub}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair do clube? Você perderá acesso às atividades e desafios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsLeavingClub(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveClub} className="text-destructive">
              Sair do clube
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <FloatingNavIsland />
    </main>
  );
};

export default RunningClubDetailPage;
