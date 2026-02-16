import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, MapPin, DollarSign, Sparkles } from "lucide-react";
import { SPECIALTY_CATEGORIES, getSpecialtyLabel } from "@/lib/professionalSpecialties";

interface Professional {
    id: string;
    name: string;
    specialty: string;
    base_price: number | null;
    profile_image_url: string | null;
    bio: string | null;
    lp_unlocked: boolean;
}

export default function ProfessionalsListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");

    useEffect(() => {
        loadProfessionals();
    }, []);

    useEffect(() => {
        filterProfessionals();
    }, [searchQuery, selectedSpecialty, professionals]);

    const loadProfessionals = async () => {
        try {
            const { data, error } = await supabase
                .from("professionals")
                .select("id, name, specialty, base_price, profile_image_url, bio, lp_unlocked")
                .eq("lp_unlocked", true) // Only show professionals with active LPs
                .order("created_at", { ascending: false });

            if (error) throw error;

            setProfessionals(data || []);
        } catch (error: any) {
            console.error("Load error:", error);
            toast({
                title: "Erro ao carregar profissionais",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const filterProfessionals = () => {
        let filtered = [...professionals];

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    getSpecialtyLabel(p.specialty).toLowerCase().includes(query) ||
                    p.bio?.toLowerCase().includes(query)
            );
        }

        // Filter by specialty
        if (selectedSpecialty !== "all") {
            filtered = filtered.filter((p) => p.specialty === selectedSpecialty);
        }

        setFilteredProfessionals(filtered);
    };

    const handleViewProfile = (professionalId: string) => {
        navigate(`/profissional/${professionalId}`);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <h1 className="text-xl font-black uppercase tracking-tight text-white">
                        Profissionais
                    </h1>
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        Voltar
                    </Button>
                </div>
            </div>

            <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
                {/* Search & Filters */}
                <Card className="border-white/10 bg-white/5">
                    <CardHeader>
                        <CardTitle className="text-white">Encontre seu Profissional</CardTitle>
                        <CardDescription>
                            Busque por nome, especialidade ou serviço
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar profissionais..."
                                className="bg-white/10 pl-10 text-white"
                            />
                        </div>

                        <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                            <SelectTrigger className="bg-white/10 text-white">
                                <SelectValue placeholder="Todas as especialidades" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as especialidades</SelectItem>
                                {Object.entries(SPECIALTY_CATEGORIES).map(([key, category]) => (
                                    <div key={key}>
                                        <div className="px-2 py-1.5 text-xs font-bold uppercase text-muted-foreground">
                                            {category.label}
                                        </div>
                                        {category.specialties.map((spec) => (
                                            <SelectItem key={spec.value} value={spec.value}>
                                                {spec.label}
                                            </SelectItem>
                                        ))}
                                    </div>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Results Count */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-white/60">
                        {filteredProfessionals.length} profissional(is) encontrado(s)
                    </p>
                </div>

                {/* Professionals Grid */}
                {filteredProfessionals.length === 0 ? (
                    <Card className="border-white/10 bg-white/5">
                        <CardContent className="py-12 text-center">
                            <p className="text-white/60">
                                Nenhum profissional encontrado com os filtros selecionados.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProfessionals.map((professional) => (
                            <Card
                                key={professional.id}
                                className="group cursor-pointer border-white/10 bg-white/5 transition-all hover:border-primary/50 hover:bg-white/10"
                                onClick={() => handleViewProfile(professional.id)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start gap-3">
                                        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/10 bg-white/5">
                                            {professional.profile_image_url ? (
                                                <img
                                                    src={professional.profile_image_url}
                                                    alt={professional.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <User className="h-8 w-8 text-white/40" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg text-white truncate">
                                                {professional.name}
                                            </CardTitle>
                                            <Badge variant="outline" className="mt-1 text-xs">
                                                {getSpecialtyLabel(professional.specialty)}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                    {professional.bio && (
                                        <p className="line-clamp-2 text-sm text-white/60">
                                            {professional.bio}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between">
                                        {professional.base_price && (
                                            <div className="flex items-center gap-1 text-sm text-primary">
                                                <DollarSign className="h-4 w-4" />
                                                <span className="font-bold">
                                                    R$ {professional.base_price.toFixed(2)}
                                                </span>
                                            </div>
                                        )}

                                        <Button
                                            size="sm"
                                            className="bg-primary text-black hover:bg-primary/90"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewProfile(professional.id);
                                            }}
                                        >
                                            <Sparkles className="mr-1 h-3 w-3" />
                                            Ver Perfil
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
