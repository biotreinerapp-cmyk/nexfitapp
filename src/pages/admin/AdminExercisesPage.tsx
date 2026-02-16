
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

    // Fetch unique target muscles for filter
    const { data: muscles } = useQuery({
        queryKey: ["exercises-muscles"],
        queryFn: async () => {
            const { data } = await supabase
                .from("exercises")
                .select("target_muscle")
                .not("target_muscle", "is", null);

            // Extract unique muscles
            const uniqueMuscles = Array.from(new Set(data?.map(item => item.target_muscle))).sort();
            return uniqueMuscles;
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
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
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
                                        <SelectItem key={muscle} value={muscle || "unknown"}>
                                            {muscle ? muscle.charAt(0).toUpperCase() + muscle.slice(1) : "Outros"}
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
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="hover:bg-white/10 hover:text-white">
                                                    Editar
                                                </Button>
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
        </div>
    );
}
