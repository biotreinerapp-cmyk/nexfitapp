
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Search, Loader2, Dumbbell, Filter } from "lucide-react";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Video, Youtube, Eye, Trash2, Power, PowerOff, RefreshCw } from "lucide-react";

const TARGET_MUSCLES = [
    "Abdômen",
    "Adutores",
    "Antebraço",
    "Bíceps",
    "Cardio",
    "Dorsais",
    "Glúteos",
    "Isquiotibiais",
    "Lombar",
    "Ombros",
    "Panturrilhas",
    "Peitoral",
    "Quadríceps",
    "Trapézio",
    "Tríceps",
    "Geral"
].sort();

export default function AdminExercisesPage() {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [muscleFilter, setMuscleFilter] = useState("all");
    const itemsPerPage = 10;

    // Fetch exercises with pagination and filtering
    const { data, isLoading } = useQuery({
        queryKey: ["admin-exercises", page, searchTerm, muscleFilter],
        queryFn: async () => {
            let query = supabase
                .from("exercises")
                .select("*", { count: "exact" });

            if (searchTerm) {
                query = query.ilike("name", `%${searchTerm}%`);
            }

            if (muscleFilter !== "all") {
                query = query.eq("target_muscle", muscleFilter);
            }

            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            const { data, error, count } = await query
                .range(from, to)
                .order("name", { ascending: true });

            if (error) throw error;
            return { data, count };
        },
        placeholderData: (previousData) => previousData,
    });

    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const getYouTubeId = (url: string) => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url?.match(regex);
        return match ? match[1] : null;
    };

    const saveMutation = useMutation({
        mutationFn: async (exercise: any) => {
            if (exercise.id) {
                const { error } = await supabase
                    .from("exercises")
                    .update(exercise)
                    .eq("id", exercise.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("exercises")
                    .insert([exercise]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
            toast({
                title: editingExercise?.id ? "Exercício atualizado" : "Exercício criado",
                description: "As alterações foram salvas com sucesso.",
            });
            setIsDialogOpen(false);
            setEditingExercise(null);
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const syncMutation = useMutation({
        mutationFn: async () => {
            // Fetch from biblioteca_exercicios
            const { data: bibData, error: bibError } = await supabase
                .from("biblioteca_exercicios")
                .select("*");

            if (bibError) throw bibError;
            if (!bibData || bibData.length === 0) throw new Error("Nenhum exercício encontrado na biblioteca.");

            // Prepare for sync: clear and insert
            // Warning: this removes any manual changes! But library is the source of truth.
            const { error: deleteError } = await supabase
                .from("exercises")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");

            if (deleteError) throw deleteError;

            const exercisesToSync = bibData.map(ex => ({
                name: ex.nome,
                target_muscle: ex.target_muscle || 'Geral',
                equipment: ex.equipment || 'Geral',
                difficulty: 'beginner',
                video_url: ex.video_url,
                is_active: true
            }));

            // We'll do it in batches
            const batchSize = 50;
            for (let i = 0; i < exercisesToSync.length; i += batchSize) {
                const batch = exercisesToSync.slice(i, i + batchSize);
                const { error } = await supabase.from("exercises").insert(batch);
                if (error) throw error;
            }

            return bibData.length;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
            queryClient.invalidateQueries({ queryKey: ["exercises-muscles"] });
            toast({
                title: "Sincronização concluída",
                description: `${count} exercícios foram sincronizados da biblioteca.`,
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro na sincronização",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
            const { error } = await supabase
                .from("exercises")
                .update({ is_active })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
            toast({
                title: "Status atualizado",
                description: "O status do exercício foi alterado.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao atualizar status",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const handleOpenCreate = () => {
        setEditingExercise({
            name: "",
            target_muscle: "",
            equipment: "",
            difficulty: "beginner",
            video_url: "",
            is_active: true
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (exercise: any) => {
        setEditingExercise({ ...exercise });
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!editingExercise.name || !editingExercise.target_muscle) {
            toast({
                title: "Campos obrigatórios",
                description: "Por favor, preencha o nome e o músculo alvo.",
                variant: "destructive",
            });
            return;
        }
        saveMutation.mutate(editingExercise);
    };

    // Fetch unique target muscles for filter
    const { data: muscles } = useQuery({
        queryKey: ["exercises-muscles"],
        queryFn: async () => {
            const { data } = await supabase
                .from("exercises")
                .select("target_muscle");

            // Extract unique muscles from DB
            const dbMuscles = Array.from(new Set(data?.map(item => item.target_muscle))).filter(Boolean);

            // Merge with predefined list and sort
            const combinedMuscles = Array.from(new Set([...TARGET_MUSCLES, ...dbMuscles as string[]])).sort();
            return combinedMuscles;
        }
    });

    const totalPages = data?.count ? Math.ceil(data.count / itemsPerPage) : 1;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Biblioteca de Exercícios</h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie os {data?.count || 0} exercícios cadastrados no sistema.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                        onClick={() => syncMutation.mutate()}
                        disabled={syncMutation.isPending}
                    >
                        {syncMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Sincronizar da Biblioteca
                    </Button>
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleOpenCreate}
                    >
                        <Dumbbell className="mr-2 h-4 w-4" />
                        Novo Exercício
                    </Button>
                </div>
            </div>

            <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <CardTitle className="text-white text-lg">Exercícios</CardTitle>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar exercício..."
                                    className="pl-8 bg-black/20 border-white/10 text-white w-[250px]"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(1); // Reset to first page on search
                                    }}
                                />
                            </div>
                            <Select
                                value={muscleFilter}
                                onValueChange={(val) => {
                                    setMuscleFilter(val);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-[180px] bg-black/20 border-white/10 text-white">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4" />
                                        <SelectValue placeholder="Músculo Alvo" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Músculos</SelectItem>
                                    {muscles?.map((muscle) => (
                                        <SelectItem key={muscle} value={muscle}>
                                            {muscle}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5 hover:bg-white/5">
                                    <TableHead className="text-gray-400">Nome</TableHead>
                                    <TableHead className="text-gray-400">Músculo Alvo</TableHead>
                                    <TableHead className="text-gray-400">Equipamento</TableHead>
                                    <TableHead className="text-gray-400">Dificuldade</TableHead>
                                    <TableHead className="text-gray-400">Status</TableHead>
                                    <TableHead className="text-right text-gray-400">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Carregando exercícios...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : data?.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Nenhum exercício encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.data?.map((exercise) => (
                                        <TableRow key={exercise.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                            <TableCell className="font-medium text-white">
                                                <div className="flex items-center gap-3">
                                                    {exercise.muscle_image_url ? (
                                                        <img
                                                            src={exercise.muscle_image_url}
                                                            alt={exercise.name}
                                                            className="w-10 h-10 rounded-md object-cover bg-white/10"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=Ex';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                                                            IMG
                                                        </div>
                                                    )}
                                                    <span>{exercise.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-300">
                                                <Badge variant="outline" className="border-white/10 bg-blue-500/10 text-blue-400 capitalize hover:bg-blue-500/20">
                                                    {exercise.target_muscle || "-"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-300 capitalize">{exercise.equipment || "-"}</TableCell>
                                            <TableCell>
                                                {exercise.difficulty && (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border
                                                        ${exercise.difficulty === 'beginner'
                                                            ? 'border-green-500/20 bg-green-500/10 text-green-400'
                                                            : exercise.difficulty === 'intermediate'
                                                                ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                                                                : 'border-red-500/20 bg-red-500/10 text-red-400'
                                                        }`}>
                                                        {exercise.difficulty === 'beginner' ? 'Iniciante' :
                                                            exercise.difficulty === 'intermediate' ? 'Intermediário' :
                                                                'Avançado'}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={`border-none ${exercise.is_active
                                                        ? 'bg-green-500/10 text-green-400'
                                                        : 'bg-red-500/10 text-red-400'}`}
                                                >
                                                    {exercise.is_active ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {exercise.video_url && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-white/10 text-zinc-400 hover:text-white"
                                                            asChild
                                                        >
                                                            <a href={exercise.video_url} target="_blank" rel="noopener noreferrer">
                                                                <Youtube className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="hover:bg-white/10 hover:text-white"
                                                        onClick={() => handleOpenEdit(exercise)}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`hover:bg-white/10 ${exercise.is_active ? 'text-zinc-400 hover:text-red-400' : 'text-zinc-400 hover:text-green-400'}`}
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

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-50"
                            >
                                Anterior
                            </Button>
                            <div className="text-xs text-muted-foreground">
                                Página {page} de {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-50"
                            >
                                Próxima
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingExercise?.id ? 'Editar Exercício' : 'Novo Exercício'}</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Preencha os dados do exercício abaixo.
                        </DialogDescription>
                    </DialogHeader>

                    {editingExercise && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome do Exercício</Label>
                                <Input
                                    id="name"
                                    value={editingExercise.name}
                                    onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                                    className="bg-black/20 border-white/10 text-white"
                                    placeholder="Ex: Supino Reto"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Músculo Alvo</Label>
                                    <Select
                                        value={editingExercise.target_muscle}
                                        onValueChange={(val) => setEditingExercise({ ...editingExercise, target_muscle: val })}
                                    >
                                        <SelectTrigger className="bg-black/20 border-white/10 text-white capitalize">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {muscles?.map((muscle) => (
                                                <SelectItem key={muscle} value={muscle} className="capitalize">
                                                    {muscle}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="equipment">Equipamento</Label>
                                    <Input
                                        id="equipment"
                                        value={editingExercise.equipment || ""}
                                        onChange={(e) => setEditingExercise({ ...editingExercise, equipment: e.target.value })}
                                        className="bg-black/20 border-white/10 text-white"
                                        placeholder="Ex: Barra"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Dificuldade</Label>
                                    <Select
                                        value={editingExercise.difficulty}
                                        onValueChange={(val) => setEditingExercise({ ...editingExercise, difficulty: val })}
                                    >
                                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="beginner">Iniciante</SelectItem>
                                            <SelectItem value="intermediate">Intermediário</SelectItem>
                                            <SelectItem value="advanced">Avançado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <Switch
                                        id="is_active"
                                        checked={editingExercise.is_active}
                                        onCheckedChange={(checked) => setEditingExercise({ ...editingExercise, is_active: checked })}
                                    />
                                    <Label htmlFor="is_active" className="cursor-pointer">Ativo</Label>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="video_url">Link do Vídeo (YouTube)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="video_url"
                                        value={editingExercise.video_url || ""}
                                        onChange={(e) => setEditingExercise({ ...editingExercise, video_url: e.target.value })}
                                        className="bg-black/20 border-white/10 text-white flex-1"
                                        placeholder="https://www.youtube.com/watch?v=..."
                                    />
                                </div>
                                {editingExercise.video_url && getYouTubeId(editingExercise.video_url) && (
                                    <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-white/10">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${getYouTubeId(editingExercise.video_url)}`}
                                            className="w-full h-full"
                                            allowFullScreen
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="border-white/10 bg-transparent text-white hover:bg-white/5"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
