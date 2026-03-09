import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Users, Trophy, Target, MapPin, Clock, ArrowLeft, Share2, Copy, ShieldCheck, MoreVertical, MessageCircle, Zap, Medal, Plus, UserMinus } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

interface RunningRace {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  registration_link: string | null;
  price: number | null;
  active: boolean;
}

interface RankingEntry {
  user_id: string;
  total_distance: number;
  runs: number;
  name?: string;
}

interface ClubMemberProfile {
  id: string;
  user_id: string;
  role: "admin" | "member";
  status: "active" | "pending";
  name: string;
  initials: string;
  avatar_url: string | null;
}

interface ClubMedal {
  id: string;
  user_id: string;
  medal_type: string;
  title: string;
  awarded_at: string;
}

const MEDAL_ICONS: Record<string, string> = {
  first_run: "\uD83C\uDFC3",
  top_runner: "\uD83E\uDD47",
  challenge_complete: "\uD83C\uDFC6",
  consistency: "\uD83D\uDD25",
  custom: "\u2B50",
};

const MEDAL_LABELS: Record<string, string> = {
  first_run: "Primeiro Treino",
  top_runner: "Mais Veloz",
  challenge_complete: "Desafio Completo",
  consistency: "Mais Constante",
  custom: "Destaque Especial",
};

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
  const [races, setRaces] = useState<RunningRace[]>([]);
  const [members, setMembers] = useState<ClubMemberProfile[]>([]);
  const [medals, setMedals] = useState<ClubMedal[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isLeavingClub, setIsLeavingClub] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createChallengeOpen, setCreateChallengeOpen] = useState(false);
  const [createRaceOpen, setCreateRaceOpen] = useState(false);
  const [isCreatingRace, setIsCreatingRace] = useState(false);
  const [medalDialogMember, setMedalDialogMember] = useState<ClubMemberProfile | null>(null);
  const [isAwardingMedal, setIsAwardingMedal] = useState(false);
  const [selectedMedalType, setSelectedMedalType] = useState<string>("custom");
  const [customMedalTitle, setCustomMedalTitle] = useState("");
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
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

  const raceForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      event_date: "",
      location: "",
      price: "",
      registration_link: "",
    },
  });

  const loadMembers = useCallback(async () => {
    if (!clubId) return;
    const { data } = await supabase
      .from("running_club_members")
      .select("id, user_id, role, status, profiles:profiles(nome, display_name, avatar_url)")
      .eq("club_id", clubId)
      .eq("status", "active");

    if (data) {
      const mapped: ClubMemberProfile[] = (data as any[]).map((m) => {
        const p = m.profiles;
        const name = p?.display_name || p?.nome || "Corredor";
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          status: m.status,
          name,
          initials: name.slice(0, 2).toUpperCase(),
          avatar_url: p?.avatar_url ?? null,
        };
      });
      setMembers(mapped);
    }

    const { data: medalsData } = await supabase
      .from("club_member_medals")
      .select("id, user_id, medal_type, title, awarded_at")
      .eq("club_id", clubId);

    if (medalsData) setMedals(medalsData as ClubMedal[]);
  }, [clubId]);

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
      .map(([user_id, { distance, runs }]) => {
        const memberProfile = members.find((m) => m.user_id === user_id);
        const postWithName = (activities as any[]).find((a: any) => a.user_id === user_id && a.author_name);
        return { user_id, total_distance: distance, runs, name: memberProfile?.name || postWithName?.author_name };
      })
      .sort((a, b) => b.total_distance - a.total_distance);
  }, [activities, members]);

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

      const [{ data: activitiesData }, { data: challengesData }, { data: racesData }] = await Promise.all([
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
        supabase
          .from("running_club_races")
          .select("*")
          .eq("club_id", clubId)
          .order("event_date", { ascending: false }),
      ]);

      setActivities((activitiesData as RunningActivity[]) ?? []);
      setChallenges((challengesData as RunningChallenge[]) ?? []);
      setRaces((racesData as RunningRace[]) ?? []);

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
    void loadMembers();
  }, [loadClubAndFeed, loadMembers]);

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

  const handleRemoveMember = async (member: ClubMemberProfile) => {
    if (!isAdmin || !clubId) return;
    const { error } = await supabase.from("running_club_members").delete().eq("id", member.id);
    if (error) {
      toast({ title: "Erro ao remover membro", description: error.message, variant: "destructive" });
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast({ title: "Membro removido", description: `${member.name} foi removido do clube.` });
    }
  };

  const handleAwardMedal = async () => {
    if (!isAdmin || !medalDialogMember || !clubId || !user) return;
    setIsAwardingMedal(true);
    const title = customMedalTitle.trim() || MEDAL_LABELS[selectedMedalType];
    const { data, error } = await supabase
      .from("club_member_medals")
      .insert({ club_id: clubId, user_id: medalDialogMember.user_id, awarded_by: user.id, medal_type: selectedMedalType, title })
      .select()
      .single();
    setIsAwardingMedal(false);
    if (error) {
      toast({ title: "Erro ao conceder medalha", description: error.message, variant: "destructive" });
    } else {
      setMedals((prev) => [...prev, data as ClubMedal]);
      setMedalDialogMember(null);
      setCustomMedalTitle("");
      setIsCreatingRace(false);
    }
  };

  const handleCreateRace = async (values: any) => {
    if (!user || !clubId) return;

    setIsCreatingRace(true);
    try {
      const dbPrice = values.price ? parseFloat(values.price) : null;
      const { data, error } = await supabase.from("running_club_races").insert({
        club_id: clubId,
        title: values.title,
        description: values.description || null,
        event_date: new Date(values.event_date).toISOString(),
        location: values.location || null,
        registration_link: values.registration_link || null,
        price: dbPrice,
        active: true,
        created_by: user.id,
      }).select().single();

      if (error) {
        toast({
          title: "Erro ao criar corrida",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setRaces([data as RunningRace, ...races]);
      setCreateRaceOpen(false);
      raceForm.reset();
      toast({
        title: "Corrida criada!",
        description: "A corrida foi cadastrada no clube com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Não foi possível criar a corrida no momento.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingRace(false);
    }
  };

  const handleCreateChallenge = async (values: { title: string; description: string; target_distance_km: string; start_date: string; end_date: string }) => {
    if (!club || !isAdmin || !user) return;
    setIsCreatingChallenge(true);
    const { data, error } = await supabase
      .from("running_club_challenges")
      .insert({
        club_id: club.id,
        title: values.title,
        description: values.description,
        target_distance_km: Number(values.target_distance_km),
        start_date: values.start_date,
        end_date: values.end_date,
        active: true,
        created_by: user.id
      })
      .select()
      .single();
    setIsCreatingChallenge(false);
    if (error) {
      toast({ title: "Erro ao criar desafio", description: error.message, variant: "destructive" });
    } else {
      setChallenges((prev) => [data as RunningChallenge, ...prev]);
      setCreateChallengeOpen(false);
      challengeForm.reset();
      toast({ title: "Desafio criado! 🎯", description: "O novo desafio já está visível para os membros." });
    }
  };

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
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-bold">Running Club</p>
            <h1 className="text-2xl font-black italic text-foreground tracking-tighter uppercase leading-none truncate max-w-[250px]">
              {club.name}
            </h1>
          </div>
        </header>

        {isMember && (
          <section className="space-y-6">
            <Card className="border-white/5 bg-black/40 backdrop-blur-2xl shadow-xl">
              <CardHeader className="pb-4 flex flex-row items-center justify-between gap-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black italic uppercase tracking-wider text-foreground">
                      Dashboard do Clube
                    </CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 shadow-[0_0_10px_rgba(var(--primary),0.3)]">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-label="Admin do clube" />
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-xl"
                        aria-label="Ações do clube"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="z-50 bg-black/90 backdrop-blur-xl border-white/10 text-foreground"
                    >
                      {isAdmin && (
                        <DropdownMenuItem className="focus:bg-primary/20 focus:text-white" onClick={() => setEditDialogOpen(true)}>
                          Editar clube
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <DropdownMenuItem className="focus:bg-primary/20 focus:text-white" onClick={() => document.getElementById("membros-dialog-trigger")?.click()}>
                          Ver Membros
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="focus:bg-primary/20 focus:text-white" onClick={() => setShareDialogOpen(true)}>
                        Compartilhar convite
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          void handleLeaveClub();
                        }}
                        className="text-destructive focus:bg-destructive/20 focus:text-destructive font-bold"
                      >
                        Sair do clube
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="h-20 w-20 rounded-2xl border-2 border-white/10 bg-white/5 flex items-center justify-center text-[10px] text-muted-foreground overflow-hidden relative z-10">
                      <Users className="h-8 w-8 opacity-20" />
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Volume de Treino</span>
                    <div className="text-4xl font-black italic text-primary tracking-tighter shadow-primary/20 drop-shadow-xl">
                      {totalDistanceKm.toFixed(1)} <span className="text-xs uppercase font-bold tracking-normal text-foreground/60 not-italic ml-1">KM</span>
                    </div>
                    <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1 w-fit border border-white/5">
                      <Clock className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        {Math.round(totalCalories).toLocaleString()} kcal estimadas
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[11px] text-muted-foreground font-medium italic leading-relaxed">
                    "O objetivo não é ser melhor que os outros, mas sim melhor do que você foi ontem." Convide seu pelotão e bora pra pista!
                  </p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="atividades" className="w-full">
              <TabsList className={`w-full h-12 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl p-1 shadow-2xl grid grid-cols-3`}>
                <TabsTrigger value="atividades" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">
                  <MapPin className="mr-1 h-3 w-3" /> Feed
                </TabsTrigger>
                <TabsTrigger value="ranking" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">
                  <Trophy className="mr-1 h-3 w-3" /> Ranking
                </TabsTrigger>
                <TabsTrigger value="desafios" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">
                  <Target className="mr-1 h-3 w-3" /> Eventos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="atividades" className="mt-6 space-y-6">
                <div className="flex flex-col gap-1 px-1">
                  <h3 className="text-sm font-black italic uppercase tracking-widest text-foreground">Timeline</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-60">
                    Atividades recentes do pelotão
                  </p>
                </div>

                <div className="space-y-6">
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
                          className="overflow-hidden rounded-[24px] border border-white/5 bg-black/40 backdrop-blur-2xl shadow-2xl transition-all"
                        >
                          {/* Header Premium */}
                          <header className="flex items-center justify-between p-4 bg-white/5">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full" />
                                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/40 border border-primary/20 text-xs font-black text-primary shadow-inner">
                                  {post.author_initials || (post.author_name ? post.author_name[0]?.toUpperCase() : "C")}
                                </div>
                              </div>
                              <div className="flex flex-col leading-tight">
                                <span className="text-xs font-black uppercase italic tracking-tight text-foreground">
                                  {post.author_name || "Corredor"}
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">{timeLabel}</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </header>

                          {/* Imagem Premium */}
                          {post.image_url ? (
                            <div className="bg-black relative group w-full">
                              <img
                                src={post.image_url}
                                alt={post.caption || "Atividade do clube"}
                                className="w-full h-auto object-cover max-h-[600px]"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/5 to-white/[0.02] px-6 text-center border-y border-white/5">
                              <Zap className="h-8 w-8 text-primary/40 animate-pulse" />
                              <div className="space-y-1">
                                <span className="text-sm font-black italic uppercase tracking-tight text-foreground/80 block">Resumo do Treino</span>
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block opacity-70">
                                  {post.distance_km.toFixed(2)} km • {post.duration_minutes} min
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Barra de ações (Instagram style) */}
                          <div className="flex items-center justify-between px-3 pt-3 pb-2">
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 p-0 rounded-full hover:bg-white/10 transition-colors ${liked ? 'text-red-500' : 'text-foreground'}`}
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
                                {liked ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                                  </svg>
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 p-0 text-foreground hover:bg-white/10 rounded-full transition-colors"
                                onClick={() => setCommentDialogPostId(post.id)}
                                aria-label="Ver comentários do post"
                              >
                                <MessageCircle className="h-6 w-6" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 p-0 text-foreground hover:bg-white/10 rounded-full transition-colors"
                                onClick={() => handleOpenDetailDialog(post)}
                                aria-label="Compartilhar post"
                              >
                                <Share2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>

                          {/* Metricas + legenda */}
                          <div className="space-y-1.5 px-4 pb-4 text-[12px]">
                            {likeCount > 0 && (
                              <p className="font-semibold text-foreground text-[13px]">
                                {likeCount === 1 ? "1 curtida" : `${likeCount} curtidas`}
                              </p>
                            )}

                            <p className="text-foreground leading-tight">
                              <span className="font-semibold mr-1">{post.author_name || "Corredor"}</span>
                              {post.caption || "Compartilhou um treino com o clube."}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-medium text-primary">
                              {post.distance_km > 0 && (
                                <span className="bg-primary/10 px-2 py-0.5 rounded-sm">🏃 {post.distance_km.toFixed(2)} km</span>
                              )}
                              {post.duration_minutes > 0 && (
                                <span className="bg-primary/10 px-2 py-0.5 rounded-sm">⏱ {post.duration_minutes} min</span>
                              )}
                              {post.distance_km > 0 && pace > 0 && (
                                <span className="bg-primary/10 px-2 py-0.5 rounded-sm">⚡ {pace.toFixed(1)} min/km</span>
                              )}
                              {post.calories && (
                                <span className="bg-primary/10 px-2 py-0.5 rounded-sm">🔥 {Math.round(post.calories)} kcal</span>
                              )}
                            </div>

                            {comments.length > 0 && (
                              <button
                                type="button"
                                className="pt-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setCommentDialogPostId(post.id)}
                              >
                                {comments.length === 1 ? "Ver 1 comentário" : `Ver todos os ${comments.length} comentários`}
                              </button>
                            )}
                            <p className="pt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                              {timeLabel}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </TabsContent>

              {/* Ranking tab content */}
              <TabsContent value="ranking" className="mt-6 space-y-6">
                <Card className="border-white/5 bg-black/40 backdrop-blur-2xl shadow-xl overflow-hidden">
                  <CardHeader className="pb-4 bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black italic uppercase tracking-widest text-foreground">
                          Pelotão de Elite
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">
                          Últimos 7 dias de glória
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {myRankings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground mb-4 opacity-20">
                          <Trophy className="h-6 w-6" />
                        </div>
                        <p className="text-[11px] font-black italic uppercase tracking-widest text-muted-foreground/50">Nenhuma corrida registrada</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {myRankings.map((entry, index) => {
                          const entryMedals = medals.filter((m) => m.user_id === entry.user_id);
                          return (
                            <div key={entry.user_id} className="flex items-center justify-between p-4 bg-white/0 hover:bg-white/[0.02] transition-colors">
                              <div className="flex items-center gap-4">
                                <span className={`text-xl font-black italic ${index === 0 ? "text-primary shadow-primary/20 drop-shadow-lg" : "text-muted-foreground/30"}`}>
                                  #{index + 1}
                                </span>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black uppercase italic tracking-tight text-foreground truncate max-w-[130px]">
                                      {entry.name || entry.user_id.slice(0, 8) + "..."}
                                    </span>
                                    {entryMedals.slice(0, 2).map((medal) => (
                                      <span key={medal.id} title={medal.title} className="text-sm leading-none">
                                        {MEDAL_ICONS[medal.medal_type]}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                    {entry.runs} CORRIDA{entry.runs > 1 ? "S" : ""}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end text-right">
                                <span className="text-lg font-black text-primary tracking-tighter">
                                  {entry.total_distance.toFixed(1)} <span className="text-[10px] uppercase font-bold tracking-normal italic">KM</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="desafios" className="mt-6 space-y-6">
                <Card className="border-white/5 bg-black/40 backdrop-blur-2xl shadow-xl overflow-hidden">
                  <CardHeader className="pb-4 bg-white/5 border-b border-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                          <Target className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-black italic uppercase tracking-widest text-foreground">
                            Missões do Clube
                          </CardTitle>
                          <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">
                            Desafios e conquistas
                          </CardDescription>
                        </div>
                      </div>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary hover:bg-primary hover:text-white rounded-xl transition-all"
                            >
                              <Plus className="mr-1 h-3 w-3" /> Criar
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-white/10 bg-black/95 text-white backdrop-blur-xl">
                            <DropdownMenuItem onClick={() => setCreateChallengeOpen(true)} className="focus:bg-primary/20 focus:text-primary">
                              Criar Desafio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCreateRaceOpen(true)} className="focus:bg-primary/20 focus:text-primary">
                              Criar Corrida
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {challenges.length === 0 && races.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-[11px] font-black italic uppercase tracking-widest text-muted-foreground/50">Nenhum evento ativo</p>
                      </div>
                    ) : (
                      <>
                        {races.map((race) => (
                          <div key={race.id} className="relative group overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4 transition-all hover:bg-primary/10 shadow-lg">
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary" /> {race.title}
                                </h3>
                                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase italic tracking-widest ${race.active ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/10 text-muted-foreground"}`}>
                                  {race.active ? "ATIVO" : "ENCERRADA"}
                                </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground font-medium mb-3 leading-tight leading-relaxed">{race.description}</p>

                              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Local</span>
                                  <span className="text-[10px] font-bold text-foreground">{race.location || "A definir"}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Data</span>
                                  <span className="text-[10px] font-bold text-primary">{new Date(race.event_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Inscrição</span>
                                  {race.price ? (
                                    <span className="text-[10px] font-bold text-foreground">R$ {race.price.toFixed(2)}</span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-green-400">Gratuita</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {challenges.map((challenge) => (
                          <div key={challenge.id} className="relative group overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/[0.08]">
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-black italic uppercase tracking-tight text-foreground">{challenge.title}</h3>
                                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase italic tracking-widest ${challenge.active ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/10 text-muted-foreground"}`}>
                                  {challenge.active ? "ATIVO" : "ENCERRADO"}
                                </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground font-medium mb-3 leading-tight leading-relaxed">{challenge.description}</p>
                              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Meta</span>
                                  <span className="text-xs font-black italic text-primary">{challenge.target_distance_km} KM</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Prazo</span>
                                  <span className="text-[10px] font-bold text-foreground">{new Date(challenge.end_date).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Members Dialog trigger (hidden) */}
              <Dialog>
                <DialogTrigger id="membros-dialog-trigger" className="hidden" />
                <DialogContent className="border-white/10 bg-black/95 backdrop-blur-3xl sm:rounded-[32px] max-w-md w-full p-0 overflow-hidden">
                  <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <DialogTitle className="text-sm font-black italic uppercase tracking-widest text-foreground">Gestão do Pelotão</DialogTitle>
                        <DialogDescription className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">
                          {members.length} membro{members.length !== 1 ? "s" : ""} ativo{members.length !== 1 ? "s" : ""}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="p-0 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {members.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-[11px] font-black italic uppercase tracking-widest text-muted-foreground/50">Nenhum membro ainda</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {members.map((member) => {
                          const memberMedals = medals.filter((m) => m.user_id === member.user_id);
                          return (
                            <div key={member.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary">
                                    {member.initials}
                                  </div>
                                  {member.role === "admin" && (
                                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                                      <ShieldCheck className="h-2.5 w-2.5 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black uppercase italic tracking-tight text-foreground">{member.name}</span>
                                    {memberMedals.slice(0, 3).map((medal) => (
                                      <span key={medal.id} title={medal.title} className="text-sm">{MEDAL_ICONS[medal.medal_type]}</span>
                                    ))}
                                  </div>
                                  <span className="text-[9px] font-bold uppercase text-muted-foreground opacity-60">{member.role === "admin" ? "Admin" : "Membro"}</span>
                                </div>
                              </div>
                              {member.user_id !== user?.id && isAdmin && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-xl">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="z-50 bg-black/90 backdrop-blur-xl border-white/10 text-foreground">
                                    <DropdownMenuItem
                                      className="focus:bg-primary/20 focus:text-white"
                                      onClick={() => { setMedalDialogMember(member); setSelectedMedalType("custom"); setCustomMedalTitle(""); }}
                                    >
                                      <Medal className="mr-2 h-4 w-4" /> Conceder Medalha
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:bg-destructive/20 focus:text-destructive font-bold"
                                      onClick={() => handleRemoveMember(member)}
                                    >
                                      <UserMinus className="mr-2 h-4 w-4" /> Remover do Clube
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </Tabs>
          </section>
        )}

      </div>

      {/* ===== CREATE CHALLENGE DIALOG (ADMIN) ===== */}
      <Dialog open={createChallengeOpen} onOpenChange={setCreateChallengeOpen}>
        <DialogContent className="border-white/10 bg-black/95 backdrop-blur-3xl sm:rounded-[32px]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-black italic tracking-tighter text-foreground uppercase">Criar Desafio 🎯</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">Crie um desafio semanal ou mensal para motivar o pelotão.</DialogDescription>
          </DialogHeader>
          <Form {...challengeForm}>
            <form onSubmit={challengeForm.handleSubmit(handleCreateChallenge)} className="flex flex-col gap-4">
              <FormField control={challengeForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Título do Desafio</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Agosto 100km" {...field} className="h-12 bg-white/5 border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={challengeForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhe o desafio para os membros..." {...field} className="min-h-[80px] bg-white/5 border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50 resize-none p-4" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={challengeForm.control} name="target_distance_km" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Meta de Distância (km)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100" {...field} className="h-12 bg-white/5 border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={challengeForm.control} name="start_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-12 bg-white/5 border-white/10 rounded-2xl text-foreground focus-visible:ring-primary/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={challengeForm.control} name="end_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-12 bg-white/5 border-white/10 rounded-2xl text-foreground focus-visible:ring-primary/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-2">
                <Button type="button" variant="ghost" onClick={() => setCreateChallengeOpen(false)} className="rounded-xl px-6 text-muted-foreground hover:text-white hover:bg-white/10">Cancelar</Button>
                <Button type="submit" variant="premium" disabled={isCreatingChallenge} className="rounded-xl px-8 font-bold tracking-widest uppercase">
                  {isCreatingChallenge ? "Criando..." : "Criar Desafio"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ===== AWARD MEDAL DIALOG (ADMIN) ===== */}
      <Dialog open={Boolean(medalDialogMember)} onOpenChange={(open) => !open && setMedalDialogMember(null)}>
        <DialogContent className="border-white/10 bg-black/95 backdrop-blur-3xl sm:rounded-[32px] max-w-sm">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-black italic tracking-tighter text-foreground uppercase">Conceder Medalha 🏅</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Escolha o tipo de destaque para {medalDialogMember?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MEDAL_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedMedalType(type)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-center transition-all ${selectedMedalType === type
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                >
                  <span className="text-2xl">{MEDAL_ICONS[type]}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{label}</span>
                </button>
              ))}
            </div>
            {selectedMedalType === "custom" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Título Personalizado</label>
                <Input
                  placeholder="Ex: Melhor Pace do Mês"
                  value={customMedalTitle}
                  onChange={(e) => setCustomMedalTitle(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <Button variant="ghost" onClick={() => setMedalDialogMember(null)} className="rounded-xl text-muted-foreground hover:text-white hover:bg-white/10">Cancelar</Button>
              <Button
                variant="premium"
                disabled={isAwardingMedal || (selectedMedalType === "custom" && !customMedalTitle.trim())}
                onClick={handleAwardMedal}
                className="rounded-xl px-6 font-bold tracking-widest uppercase"
              >
                {isAwardingMedal ? "Concedendo..." : "Conceder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={Boolean(commentDialogPostId)} onOpenChange={(open) => !open && setCommentDialogPostId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-black/95 backdrop-blur-3xl sm:rounded-[32px]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-black italic tracking-tighter text-foreground uppercase">Comentários</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Veja o que outros membros comentaram e participe.
            </DialogDescription>
          </DialogHeader>

          {commentDialogPostId && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-[50vh] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10">
                {(commentsByPost[commentDialogPostId] ?? []).map((comment) => {
                  const commentDate = new Date(comment.created_at);
                  return (
                    <div key={comment.id} className="flex gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs font-bold text-foreground">Membro</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">
                            {commentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground/90 leading-relaxed">
                          {comment.comment}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {(commentsByPost[commentDialogPostId] ?? []).length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-[11px] font-black italic uppercase tracking-widest text-muted-foreground/50 text-center">Nenhum comentário ainda.<br />Seja o primeiro a incentivar!</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <Input
                  placeholder="Seu comentário..."
                  className="h-12 text-xs bg-white/5 border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50 flex-1"
                  value={commentInputs[commentDialogPostId] ?? ""}
                  onChange={(e) =>
                    setCommentInputs((prev) => ({
                      ...prev,
                      [commentDialogPostId]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const submitBtn = document.getElementById("submit-comment-btn");
                      if (submitBtn && !submitBtn.hasAttribute("disabled")) submitBtn.click();
                    }
                  }}
                />
                <Button
                  id="submit-comment-btn"
                  type="button"
                  className="h-12 w-12 rounded-2xl bg-primary text-white hover:bg-primary/90 flex-shrink-0"
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
                  <Share2 className="h-5 w-5" style={{ transform: 'rotate(45deg)' }} />
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
        <DialogContent className="max-w-md border-white/10 bg-black/95 backdrop-blur-3xl sm:rounded-[32px] overflow-hidden">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-black italic tracking-tighter text-foreground uppercase">Detalhes da Sessão</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">Resumo completo da atividade compartilhada com o clube.</DialogDescription>
          </DialogHeader>

          {!detailDialogPost && <p className="text-xs text-muted-foreground p-4 text-center">Nenhum treino selecionado.</p>}

          {detailDialogPost && (
            <div className="space-y-4">
              {isDetailLoading && <p className="text-sm font-bold text-muted-foreground text-center py-4">Carregando detalhes...</p>}

              {!isDetailLoading && (
                <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                  {detailDialogPost.image_url && (
                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
                      <img
                        src={detailDialogPost.image_url}
                        alt={detailDialogPost.caption || "Imagem do treino"}
                        className="w-full h-auto object-cover max-h-64"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-lg font-black italic tracking-tight text-foreground uppercase">
                      {detailDialogPost.author_name || "Corredor"}
                    </p>
                    {detailDialogPost.caption && (
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                        "{detailDialogPost.caption}"
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col justify-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Distância</span>
                      <p className="text-2xl font-black italic text-primary tracking-tighter">
                        {detailActivity?.distance_km ?? detailDialogPost.distance_km} <span className="text-[10px] font-bold tracking-normal text-foreground/60 not-italic">km</span>
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col justify-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Duração</span>
                      <p className="text-2xl font-black italic text-primary tracking-tighter">
                        {detailDialogPost.duration_minutes} <span className="text-[10px] font-bold tracking-normal text-foreground/60 not-italic">min</span>
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col justify-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Ritmo</span>
                      <p className="text-lg font-black text-foreground tracking-tight">
                        {detailActivity?.pace_avg
                          ? `${detailActivity.pace_avg.toFixed(1)} min/km`
                          : detailDialogPost.pace ?? "--"}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col justify-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Calorias</span>
                      <p className="text-lg font-black text-foreground tracking-tight">
                        {detailActivity?.calorias_estimadas
                          ? `${Math.round(detailActivity.calorias_estimadas)} kcal`
                          : detailDialogPost.calories
                            ? `${Math.round(detailDialogPost.calories)} kcal`
                            : "--"}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col justify-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">BPM Médio</span>
                      <p className="text-sm font-bold text-foreground">
                        {detailActivity?.bpm_medio ? `${detailActivity.bpm_medio} bpm` : "--"}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col justify-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Tipo</span>
                      <p className="text-sm font-bold text-foreground capitalize">
                        {detailActivity?.tipo_atividade ?? detailDialogPost.activity_type ?? "--"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 text-center border-t border-white/5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                      {detailActivity?.iniciado_em && detailActivity?.finalizado_em
                        ? `Início: ${new Date(detailActivity.iniciado_em).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })} • Fim: ${new Date(
                          detailActivity.finalizado_em,
                        ).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })} • ${new Date(detailActivity.finalizado_em).toLocaleDateString("pt-BR")}`
                        : `Publicado em ${new Date(detailDialogPost.created_at).toLocaleString("pt-BR")}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Club Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-white/10 bg-black/95 backdrop-blur-3xl sm:rounded-[32px]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-black italic tracking-tighter text-foreground uppercase">Editar Clube</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">Atualize as informações do seu clube.</DialogDescription>
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
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do clube" {...field} className="h-12 bg-white/5 border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50 text-sm" />
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
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrição do clube" {...field} className="min-h-[100px] bg-white/5 border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50 text-sm resize-none p-4" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Cidade" {...field} className="h-12 bg-white/5 border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50 text-sm" />
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
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="UF" {...field} className="h-12 bg-white/5 border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50 text-sm uppercase" maxLength={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Visibilidade</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                        <option value="public" className="bg-background">Público (Aberto para todos)</option>
                        <option value="private" className="bg-background">Privado (Requer convite)</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-2">
                <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="rounded-xl px-6 text-muted-foreground hover:text-white hover:bg-white/10">
                  Cancelar
                </Button>
                <Button type="submit" variant="premium" className="rounded-xl px-8 font-bold tracking-widest uppercase">
                  Salvar Clube
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Share Invite Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="border-white/10 bg-black/95 backdrop-blur-3xl sm:rounded-[32px] max-w-sm">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-black italic tracking-tighter text-foreground uppercase text-center">Convite de Elite</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium text-center">
              Compartilhe o link abaixo para recrutar novos corredores.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="text"
                readOnly
                value={club ? getInviteUrl(club.invite_code) : ""}
                className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 px-4 pr-12 text-sm text-foreground focus:outline-none"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-10 w-10 text-primary hover:bg-primary/20 hover:text-primary rounded-xl"
                onClick={handleCopyInviteLink}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-center pt-2">
              <Button variant="premium" className="w-full rounded-2xl h-12 font-bold tracking-widest uppercase" onClick={handleCopyInviteLink}>
                <Share2 className="mr-2 h-4 w-4" /> Copiar Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Club Confirmation Dialog */}
      <AlertDialog open={isLeavingClub} onOpenChange={setIsLeavingClub}>
        <AlertDialogContent className="border-white/10 bg-black/95 backdrop-blur-3xl sm:rounded-[32px] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black italic tracking-tighter text-foreground uppercase text-center">Desertar o Pelotão?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground font-medium text-center mt-2 leading-relaxed">
              Você perderá acesso imediato às atividades, posts e rankings deste Running Club. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col gap-3 sm:flex-col sm:space-x-0">
            <AlertDialogAction onClick={handleLeaveClub} className="w-full h-12 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black tracking-widest uppercase">
              Sim, Sair do Clube
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setIsLeavingClub(false)} className="w-full h-12 rounded-2xl mt-0 bg-transparent border border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white font-bold uppercase tracking-widest">
              Ficar no Clube
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={createRaceOpen} onOpenChange={setCreateRaceOpen}>
        <DialogContent className="border-white/10 bg-black/95 text-white backdrop-blur-xl sm:rounded-3xl max-w-sm rounded-t-[2.5rem] p-0 w-[95%]">
          <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/20 sm:hidden" />
          <DialogHeader className="px-6 pt-10 pb-0 text-left">
            <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              Nova <span className="text-primary">Corrida</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Adicione uma corrida para os membros participarem.
            </DialogDescription>
          </DialogHeader>

          <Form {...raceForm}>
            <form onSubmit={raceForm.handleSubmit(handleCreateRace)} className="px-6 pb-8 pt-4 space-y-4">
              <FormField
                control={raceForm.control}
                name="title"
                rules={{ required: "Título é obrigatório" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/70">
                      Nome da Corrida *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Corrida Noturna Nexfit" className="h-12 rounded-2xl border-white/10 bg-white/5 text-sm text-white focus:border-primary/50 focus:ring-primary/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={raceForm.control}
                  name="event_date"
                  rules={{ required: "Data é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/70">
                        Data *
                      </FormLabel>
                      <FormControl>
                        <Input type="date" className="h-12 rounded-2xl border-white/10 bg-white/5 text-[11px] sm:text-sm text-white focus:border-primary/50 focus:ring-primary/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={raceForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/70">
                        Valor (R$)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 50.00" className="h-12 rounded-2xl border-white/10 bg-white/5 text-sm text-white focus:border-primary/50 focus:ring-primary/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={raceForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/70">
                      Local
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Parque Ibirapuera" className="h-12 rounded-2xl border-white/10 bg-white/5 text-sm text-white focus:border-primary/50 focus:ring-primary/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={raceForm.control}
                name="registration_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/70">
                      Link de Inscrição
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: https://ticketagora.com.br/..." className="h-12 rounded-2xl border-white/10 bg-white/5 text-sm text-white focus:border-primary/50 focus:ring-primary/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={raceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/70">
                      Detalhes e Regras
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="Explique os detalhes da corrida..." className="min-h-[80px] rounded-2xl border-white/10 bg-white/5 text-sm text-white focus:border-primary/50 focus:ring-primary/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse gap-2 pt-4">
                <Button type="button" variant="ghost" className="h-12 rounded-2xl text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-white/5 hover:text-white transition-all" onClick={() => setCreateRaceOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="h-12 rounded-2xl bg-primary text-xs font-bold uppercase tracking-widest text-white hover:bg-primary/90 hover:shadow-lg transition-all" disabled={isCreatingRace}>
                  Criar Corrida
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <FloatingNavIsland />
    </main >
  );
};

export default RunningClubDetailPage;
