
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Search,
    Loader2,
    Dumbbell,
    Filter,
    CheckCircle2,
    Clock,
    Youtube,
    Power,
    PowerOff,
    RefreshCw,
    ArrowRight,
    ShieldCheck,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// ─── Constants ────────────────────────────────────────────────────────────────

const TARGET_MUSCLES = [
    "Abdômen", "Adutores", "Antebraço", "Bíceps", "Cardio",
    "Dorsais", "Glúteos", "Isquiotibiais", "Lombar", "Ombros",
    "Panturrilhas", "Peitoral", "Quadríceps", "Trapézio", "Tríceps", "Geral",
].sort();

const EQUIPMENT_OPTIONS = [
    "Barra", "Halter", "Kettlebell", "Máquina", "Cabo / Polia",
    "Elástico", "Peso Corporal", "TRX / Suspensão", "Banco", "Geral",
].sort();

const ITEMS_PER_PAGE = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
    id: string;
    name: string;
    target_muscle: string;
    equipment: string | null;
    difficulty: string | null;
    video_url: string | null;
    is_active: boolean;
    is_verified: boolean;
    muscle_image_url: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminExercisesPage() {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [muscleFilter, setMuscleFilter] = useState("all");
    const [pendingOnly, setPendingOnly] = useState(false);   // ← NEW: filter not verified

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<Partial<Exercise> | null>(null);

    const queryClient = useQueryClient();
    const { toast } = useToast();

    // ── Data Fetching ──────────────────────────────────────────────────────────

    const { data, isLoading } = useQuery({
        queryKey: ["admin-exercises", page, searchTerm, muscleFilter, pendingOnly],
        queryFn: async () => {
            let query = supabase
                .from("exercises")
                .select("*", { count: "exact" });

            if (searchTerm) query = query.ilike("name", `%${searchTerm}%`);
            if (muscleFilter !== "all") query = query.eq("target_muscle", muscleFilter);
            if (pendingOnly) query = query.eq("is_verified", false);

            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error, count } = await query
                .range(from, to)
                .order("is_verified", { ascending: true })   // unverified first
                .order("name", { ascending: true });

            if (error) throw error;
            return { data: data as Exercise[], count };
        },
        placeholderData: (prev) => prev,
    });

    const { data: muscles } = useQuery({
        queryKey: ["exercises-muscles"],
        queryFn: async () => {
            const { data } = await supabase.from("exercises").select("target_muscle");
            const dbMuscles = Array.from(new Set(data?.map((i) => i.target_muscle))).filter(Boolean) as string[];
            return Array.from(new Set([...TARGET_MUSCLES, ...dbMuscles])).sort();
        },
    });

    // ── Derived state for "next unverified" ───────────────────────────────────

    /** IDs of all unverified exercises in the current page, in order */
    const unverifiedIds = useMemo(
        () => (data?.data ?? []).filter((e) => !e.is_verified).map((e) => e.id),
        [data]
    );

    function openNextUnverified(afterId: string) {
        const idx = unverifiedIds.indexOf(afterId);
        const nextId = unverifiedIds[idx + 1] ?? unverifiedIds[0];
        const next = data?.data?.find((e) => e.id === nextId);
        if (next) {
            setEditingExercise({ ...next });
        } else {
            setIsDialogOpen(false);
            toast({ title: "🎉 Curadoria concluída!", description: "Todos os exercícios desta página foram verificados." });
        }
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    const saveMutation = useMutation({
        mutationFn: async (exercise: Partial<Exercise>) => {
            if (exercise.id) {
                const { error } = await supabase.from("exercises").update(exercise).eq("id", exercise.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("exercises").insert([exercise]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
            toast({ title: "Exercício salvo", description: "Alterações aplicadas com sucesso." });
            setIsDialogOpen(false);
            setEditingExercise(null);
        },
        onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
    });

    /** Save + mark verified + open next unverified */
    const approveAndNextMutation = useMutation({
        mutationFn: async (exercise: Partial<Exercise>) => {
            if (!exercise.id) throw new Error("ID ausente");
            const { error } = await supabase
                .from("exercises")
                .update({ ...exercise, is_verified: true })
                .eq("id", exercise.id);
            if (error) throw error;
            return exercise.id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
            toast({ title: "✅ Aprovado!", description: "Exercício verificado. Abrindo o próximo..." });
            openNextUnverified(id);
        },
        onError: (e: Error) => toast({ title: "Erro ao aprovar", description: e.message, variant: "destructive" }),
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase.from("exercises").update({ is_active }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
            toast({ title: "Status atualizado" });
        },
        onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });

    const syncMutation = useMutation({
        mutationFn: async () => {
            const { data: bibData, error: bibError } = await supabase.from("biblioteca_exercicios").select("*");
            if (bibError) throw bibError;
            if (!bibData?.length) throw new Error("Nenhum exercício na biblioteca.");

            const { error: deleteError } = await supabase
                .from("exercises")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");
            if (deleteError) throw deleteError;

            const batch = bibData.map((ex) => ({
                name: ex.nome,
                target_muscle: ex.target_muscle || "Geral",
                equipment: ex.equipment || "Geral",
                difficulty: "beginner",
                video_url: ex.video_url,
                is_active: true,
                is_verified: false,
            }));

            for (let i = 0; i < batch.length; i += 50) {
                const { error } = await supabase.from("exercises").insert(batch.slice(i, i + 50));
                if (error) throw error;
            }
            return bibData.length;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
            queryClient.invalidateQueries({ queryKey: ["exercises-muscles"] });
            toast({ title: "Sincronização concluída", description: `${count} exercícios importados.` });
        },
        onError: (e: Error) => toast({ title: "Erro na sincronização", description: e.message, variant: "destructive" }),
    });

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleOpenCreate = () => {
        setEditingExercise({ name: "", target_muscle: "", equipment: "", difficulty: "beginner", video_url: "", is_active: true, is_verified: false });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (exercise: Exercise) => {
        setEditingExercise({ ...exercise });
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!editingExercise?.name || !editingExercise?.target_muscle) {
            toast({ title: "Campos obrigatórios", description: "Preencha nome e músculo alvo.", variant: "destructive" });
            return;
        }
        saveMutation.mutate(editingExercise);
    };

    const handleApproveAndNext = () => {
        if (!editingExercise?.name || !editingExercise?.target_muscle) {
            toast({ title: "Campos obrigatórios", description: "Preencha nome e músculo alvo.", variant: "destructive" });
            return;
        }
        approveAndNextMutation.mutate(editingExercise);
    };

    const totalPages = data?.count ? Math.ceil(data.count / ITEMS_PER_PAGE) : 1;
    const youtubePreviewed = editingExercise?.video_url ? getYouTubeId(editingExercise.video_url) : null;

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Biblioteca de Exercícios</h1>
                    <p className="text-sm text-muted-foreground">
                        {data?.count || 0} exercícios no sistema
                        {pendingOnly && ` · filtrando apenas não verificados`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                        onClick={() => syncMutation.mutate()}
                        disabled={syncMutation.isPending}
                    >
                        {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Sincronizar da Biblioteca
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleOpenCreate}>
                        <Dumbbell className="mr-2 h-4 w-4" />
                        Novo Exercício
                    </Button>
                </div>
            </div>

            <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <CardTitle className="text-white text-lg">Exercícios</CardTitle>
                        <div className="flex flex-wrap gap-2 items-center">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar exercício..."
                                    className="pl-8 bg-black/20 border-white/10 text-white w-[220px]"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                />
                            </div>

                            {/* Muscle filter */}
                            <Select value={muscleFilter} onValueChange={(v) => { setMuscleFilter(v); setPage(1); }}>
                                <SelectTrigger className="w-[170px] bg-black/20 border-white/10 text-white">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4" />
                                        <SelectValue placeholder="Músculo" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Músculos</SelectItem>
                                    {muscles?.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {/* Pending-only toggle */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setPendingOnly((p) => !p); setPage(1); }}
                                className={`border-white/10 gap-2 transition-colors ${pendingOnly
                                        ? "bg-amber-500/20 text-amber-300 border-amber-400/30 hover:bg-amber-500/30"
                                        : "bg-white/5 text-white hover:bg-white/10"
                                    }`}
                            >
                                <Clock className="h-4 w-4" />
                                {pendingOnly ? "Apenas Pendentes ✓" : "Apenas Pendentes"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="rounded-md border border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5 hover:bg-white/5">
                                    <TableHead className="text-gray-400">Exercício</TableHead>
                                    <TableHead className="text-gray-400">Músculo</TableHead>
                                    <TableHead className="text-gray-400">Equipamento</TableHead>
                                    <TableHead className="text-gray-400">Dificuldade</TableHead>
                                    <TableHead className="text-gray-400">Verificado</TableHead>
                                    <TableHead className="text-gray-400">Ativo</TableHead>
                                    <TableHead className="text-right text-gray-400">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Carregando...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data?.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            Nenhum exercício encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.data?.map((exercise) => (
                                        <TableRow
                                            key={exercise.id}
                                            className="border-white/5 hover:bg-white/5 transition-colors"
                                        >
                                            {/* Name + thumbnail */}
                                            <TableCell className="font-medium text-white">
                                                <div className="flex items-center gap-3">
                                                    {exercise.muscle_image_url ? (
                                                        <img
                                                            src={exercise.muscle_image_url}
                                                            alt={exercise.name}
                                                            className="w-9 h-9 rounded-md object-cover bg-white/10"
                                                            onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center">
                                                            <Dumbbell className="h-4 w-4 text-white/30" />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="text-sm">{exercise.name}</span>
                                                        {exercise.video_url && (
                                                            <span className="text-[10px] text-red-400 flex items-center gap-1">
                                                                <Youtube className="h-3 w-3" /> Vídeo
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Muscle */}
                                            <TableCell>
                                                <Badge variant="outline" className="border-white/10 bg-blue-500/10 text-blue-400 capitalize">
                                                    {exercise.target_muscle || "-"}
                                                </Badge>
                                            </TableCell>

                                            {/* Equipment */}
                                            <TableCell className="text-gray-300 text-sm capitalize">
                                                {exercise.equipment || "-"}
                                            </TableCell>

                                            {/* Difficulty */}
                                            <TableCell>
                                                {exercise.difficulty && (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${exercise.difficulty === "beginner"
                                                            ? "border-green-500/20 bg-green-500/10 text-green-400"
                                                            : exercise.difficulty === "intermediate"
                                                                ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                                                                : "border-red-500/20 bg-red-500/10 text-red-400"
                                                        }`}>
                                                        {exercise.difficulty === "beginner" ? "Iniciante" : exercise.difficulty === "intermediate" ? "Intermediário" : "Avançado"}
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Verified badge ← NEW */}
                                            <TableCell>
                                                {exercise.is_verified ? (
                                                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Verificado
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-amber-400/30 bg-amber-500/10 text-amber-400 gap-1">
                                                        <Clock className="h-3 w-3" /> Pendente
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            {/* Active */}
                                            <TableCell>
                                                <Badge variant="outline" className={`border-none ${exercise.is_active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                                    {exercise.is_active ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="hover:bg-white/10 hover:text-white text-zinc-400 text-xs"
                                                        onClick={() => handleOpenEdit(exercise)}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`hover:bg-white/10 ${exercise.is_active ? "text-zinc-400 hover:text-red-400" : "text-zinc-400 hover:text-green-400"}`}
                                                        onClick={() => toggleStatusMutation.mutate({ id: exercise.id, is_active: !exercise.is_active })}
                                                    >
                                                        {exercise.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-50">
                                Anterior
                            </Button>
                            <div className="text-xs text-muted-foreground">Página {page} de {totalPages}</div>
                            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-50">
                                Próxima
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Edit / Create Dialog ── */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingExercise?.is_verified && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                            {editingExercise?.id ? "Editar Exercício" : "Novo Exercício"}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {editingExercise?.id
                                ? "Curadoria: verifique o vídeo e preencha os campos, então aprove."
                                : "Preencha os dados do novo exercício."}
                        </DialogDescription>
                    </DialogHeader>

                    {editingExercise && (
                        <div className="grid gap-5 py-2">
                            {/* Name */}
                            <div className="grid gap-1.5">
                                <Label htmlFor="name">Nome do Exercício *</Label>
                                <Input
                                    id="name"
                                    value={editingExercise.name ?? ""}
                                    onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                                    className="bg-black/20 border-white/10 text-white"
                                    placeholder="Ex: Supino Reto com Barra"
                                />
                            </div>

                            {/* Muscle + Equipment selects */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-1.5">
                                    <Label>Músculo Alvo *</Label>
                                    <Select
                                        value={editingExercise.target_muscle ?? ""}
                                        onValueChange={(v) => setEditingExercise({ ...editingExercise, target_muscle: v })}
                                    >
                                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                            <SelectValue placeholder="Selecione o músculo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TARGET_MUSCLES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label>Equipamento *</Label>
                                    <Select
                                        value={editingExercise.equipment ?? ""}
                                        onValueChange={(v) => setEditingExercise({ ...editingExercise, equipment: v })}
                                    >
                                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                            <SelectValue placeholder="Selecione o equipamento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EQUIPMENT_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Difficulty + Toggles */}
                            <div className="grid grid-cols-3 gap-4 items-end">
                                <div className="grid gap-1.5">
                                    <Label>Dificuldade</Label>
                                    <Select
                                        value={editingExercise.difficulty ?? "beginner"}
                                        onValueChange={(v) => setEditingExercise({ ...editingExercise, difficulty: v })}
                                    >
                                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="beginner">Iniciante</SelectItem>
                                            <SelectItem value="intermediate">Intermediário</SelectItem>
                                            <SelectItem value="advanced">Avançado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2 pb-0.5">
                                    <Switch
                                        id="is_active"
                                        checked={editingExercise.is_active ?? true}
                                        onCheckedChange={(v) => setEditingExercise({ ...editingExercise, is_active: v })}
                                    />
                                    <Label htmlFor="is_active" className="cursor-pointer">Ativo</Label>
                                </div>
                                <div className="flex items-center gap-2 pb-0.5">
                                    <Switch
                                        id="is_verified"
                                        checked={editingExercise.is_verified ?? false}
                                        onCheckedChange={(v) => setEditingExercise({ ...editingExercise, is_verified: v })}
                                    />
                                    <Label htmlFor="is_verified" className="cursor-pointer text-emerald-400">Verificado</Label>
                                </div>
                            </div>

                            {/* YouTube URL + Live preview */}
                            <div className="grid gap-2">
                                <Label htmlFor="video_url">Link do YouTube</Label>
                                <Input
                                    id="video_url"
                                    value={editingExercise.video_url ?? ""}
                                    onChange={(e) => setEditingExercise({ ...editingExercise, video_url: e.target.value })}
                                    className="bg-black/20 border-white/10 text-white"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                />
                                {/* Auto-preview on paste */}
                                {youtubePreviewed && (
                                    <div className="mt-1 aspect-video rounded-lg overflow-hidden border border-white/10 shadow-lg">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${youtubePreviewed}`}
                                            className="w-full h-full"
                                            allowFullScreen
                                            title="YouTube Preview"
                                        />
                                    </div>
                                )}
                                {editingExercise.video_url && !youtubePreviewed && (
                                    <p className="text-xs text-amber-400">URL inválida — cole um link do YouTube válido para ver a preview.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => { setIsDialogOpen(false); setEditingExercise(null); }}
                            className="border-white/10 bg-transparent text-white hover:bg-white/5"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="border-white/10 bg-white/10 hover:bg-white/20 text-white"
                        >
                            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                        {/* Approve & Next — only shown when editing an existing exercise */}
                        {editingExercise?.id && (
                            <Button
                                onClick={handleApproveAndNext}
                                disabled={approveAndNextMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            >
                                {approveAndNextMutation.isPending
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <ShieldCheck className="h-4 w-4" />}
                                Aprovar e Próximo
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
