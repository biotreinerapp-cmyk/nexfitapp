import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProfessionalFloatingNavIsland } from "@/components/navigation/ProfessionalFloatingNavIsland";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import {
    Save,
    Plus,
    Trash2,
    Video,
    Loader2,
    Settings,
    Layers,
    ChevronRight,
    PlayCircle,
    Layout,
    FileText,
    ImagePlus,
    X,
    DollarSign
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ProfessionalConsultoriaEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState("geral");

    // Content State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState({
        title: "",
        description: "",
        price: "0",
        type: "consultoria",
        thumbnail_url: "",
        is_published: false
    });
    const [proId, setProId] = useState<string | null>(null);

    // Modules & Lessons State
    const [modules, setModules] = useState<any[]>([]);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;
            try {
                // Get Professional ID
                const { data: pro } = await supabase
                    .from("professionals")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();

                if (pro) {
                    setProId(pro.id);

                    if (id) {
                        // Load Content
                        const { data: content, error: contentError } = await supabase
                            .from("educational_contents")
                            .select("*")
                            .eq("id", id)
                            .single();

                        if (contentError) throw contentError;

                        setForm({
                            title: content.title,
                            description: content.description || "",
                            price: content.price.toString(),
                            type: content.type,
                            thumbnail_url: content.thumbnail_url || "",
                            is_published: content.is_published
                        });

                        // Load Modules & Lessons
                        await loadModules(id);
                    }
                }
            } catch (error) {
                console.error("Error loading editor data:", error);
                toast({ title: "Erro ao carregar dados", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [id, user]);

    const loadModules = async (contentId: string) => {
        const { data: mods, error } = await supabase
            .from("educational_modules")
            .select(`
                *,
                lessons:educational_lessons(*)
            `)
            .eq("content_id", contentId)
            .order("order_index", { ascending: true });

        if (error) throw error;

        // Sort lessons within modules
        const sortedMods = (mods || []).map(m => ({
            ...m,
            lessons: (m.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index)
        }));

        setModules(sortedMods);
        if (sortedMods.length > 0 && !selectedModuleId) {
            setSelectedModuleId(sortedMods[0].id);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith("image/")) {
            toast({ title: "Formato inválido", description: "Selecione uma imagem (JPG, PNG...)", variant: "destructive" });
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({ title: "Arquivo muito grande", description: "O limite é de 2MB por imagem.", variant: "destructive" });
            return;
        }

        setUploading(true);
        try {
            const ext = file.name.split(".").pop();
            const path = `consultancy-thumbs/${user.id}/${crypto.randomUUID()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("professional-images")
                .upload(path, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("professional-images")
                .getPublicUrl(path);

            setForm(prev => ({ ...prev, thumbnail_url: publicUrl }));
            toast({ title: "Thumbnail carregada!" });
        } catch (error: any) {
            console.error("Upload error:", error);
            toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleSaveGeneral = async () => {
        if (!proId) return;
        setSaving(true);
        try {
            const payload = {
                title: form.title,
                description: form.description,
                price: parseFloat(form.price),
                type: form.type,
                thumbnail_url: form.thumbnail_url,
                is_published: form.is_published,
                professional_id: proId
            };

            if (id) {
                const { error } = await supabase
                    .from("educational_contents")
                    .update(payload)
                    .eq("id", id);
                if (error) throw error;
                toast({ title: "Geral atualizado com sucesso!" });
            } else {
                const { data, error } = await supabase
                    .from("educational_contents")
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                toast({ title: "Conteúdo criado!", description: "Agora você pode adicionar módulos e aulas." });
                navigate(`/professional/consultoria/gerenciar/${data.id}`, { replace: true });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao salvar", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleAddModule = async () => {
        if (!id) return;
        const mTitle = prompt("Título do novo módulo:");
        if (!mTitle) return;

        try {
            const { error } = await supabase
                .from("educational_modules")
                .insert({
                    content_id: id,
                    title: mTitle,
                    order_index: modules.length
                });
            if (error) throw error;
            await loadModules(id);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao criar módulo", variant: "destructive" });
        }
    };

    const handleAddLesson = async (moduleId: string) => {
        const lTitle = prompt("Título da aula:");
        if (!lTitle) return;

        const currentMod = modules.find(m => m.id === moduleId);
        const nextOrder = currentMod?.lessons?.length || 0;

        try {
            const { error } = await supabase
                .from("educational_lessons")
                .insert({
                    module_id: moduleId,
                    title: lTitle,
                    order_index: nextOrder
                });
            if (error) throw error;
            await loadModules(id!);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao criar aula", variant: "destructive" });
        }
    };

    const handleUpdateLesson = async (lessonId: string, updates: any) => {
        try {
            const { error } = await supabase
                .from("educational_lessons")
                .update(updates)
                .eq("id", lessonId);
            if (error) throw error;
            await loadModules(id!);
            toast({ title: "Aula atualizada" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao atualizar aula", variant: "destructive" });
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm("Tem certeza que deseja excluir este módulo e todas as suas aulas?")) return;
        try {
            const { error } = await supabase
                .from("educational_modules")
                .delete()
                .eq("id", moduleId);
            if (error) throw error;
            await loadModules(id!);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao excluir módulo", variant: "destructive" });
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!confirm("Excluir aula?")) return;
        try {
            const { error } = await supabase
                .from("educational_lessons")
                .delete()
                .eq("id", lessonId);
            if (error) throw error;
            await loadModules(id!);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao excluir aula", variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black pb-28 safe-bottom-floating-nav">
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackIconButton to="/professional/consultoria" />
                        <h1 className="text-xl font-black uppercase tracking-tight text-white italic">
                            {id ? "Editar Consultoria" : "Nova Consultoria"}
                        </h1>
                    </div>
                    {id && (
                        <Button
                            onClick={handleSaveGeneral}
                            disabled={saving}
                            className="bg-primary text-black font-black uppercase tracking-tight rounded-2xl h-10 px-6 gap-2"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Salvar
                        </Button>
                    )}
                </div>
            </div>

            <section className="px-4 py-6 max-w-4xl mx-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl w-full grid grid-cols-2 h-14">
                        <TabsTrigger
                            value="geral"
                            className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-tighter transition-all"
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            Geral
                        </TabsTrigger>
                        <TabsTrigger
                            value="conteudo"
                            disabled={!id}
                            className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase tracking-tighter transition-all"
                        >
                            <Layers className="h-4 w-4 mr-2" />
                            Conteúdo
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="geral" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="bg-white/[0.03] border-white/5 rounded-[32px] overflow-hidden">
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-4">
                                        <Label className="text-zinc-500 text-[10px] uppercase font-black tracking-widest pl-1">Thumbnail (Imagem)</Label>

                                        <div className="flex gap-4 items-start">
                                            {/* Preview */}
                                            <div className="relative w-40 aspect-video rounded-3xl bg-zinc-900 border border-white/5 overflow-hidden flex-shrink-0">
                                                {form.thumbnail_url ? (
                                                    <>
                                                        <img src={form.thumbnail_url} alt="Preview" className="h-full w-full object-cover" />
                                                        <button
                                                            onClick={() => setForm(prev => ({ ...prev, thumbnail_url: "" }))}
                                                            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-500 flex items-center justify-center text-white"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center">
                                                        <ImagePlus className="h-10 w-10 text-zinc-800" />
                                                    </div>
                                                )}
                                                {uploading && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Control */}
                                            <div className="flex-1 space-y-3">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileChange}
                                                    accept="image/*"
                                                    className="hidden"
                                                />
                                                <Button
                                                    variant="outline"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploading}
                                                    className="w-full h-12 rounded-2xl border-white/5 bg-white/5 text-zinc-300 font-bold hover:bg-white/10"
                                                >
                                                    {form.thumbnail_url ? "Alterar Imagem" : "Carregar Imagem"}
                                                </Button>
                                                <p className="text-[10px] text-zinc-600 font-medium">Recomendado: 1280x720px. Máx: 2MB.</p>

                                                <div className="relative">
                                                    <Input
                                                        placeholder="Ou cole uma URL externa..."
                                                        value={form.thumbnail_url}
                                                        onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                                                        className="h-12 bg-white/5 border-white/5 text-white rounded-2xl px-5 text-xs font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Título do Conteúdo</Label>
                                        <Input
                                            placeholder="Ex: Mentoria Elite 2024"
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            className="h-14 bg-black/40 border-white/10 text-white rounded-2xl focus:border-primary/50 text-lg font-black uppercase"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Tipo</Label>
                                            <select
                                                value={form.type}
                                                onChange={(e: any) => setForm(prev => ({ ...prev, type: e.target.value }))}
                                                className="h-12 bg-black/40 border-white/10 text-white rounded-2xl px-4 focus:ring-1 focus:ring-primary outline-none appearance-none font-bold"
                                            >
                                                <option value="consultoria">Consultoria</option>
                                                <option value="mentoria">Mentoria</option>
                                                <option value="curso">Curso</option>
                                            </select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Preço (R$)</Label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                                <Input
                                                    type="number"
                                                    value={form.price}
                                                    onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                                                    className="h-12 pl-12 bg-black/40 border-white/10 text-white rounded-2xl focus:border-primary/50 font-black"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Descrição</Label>
                                        <Textarea
                                            placeholder="O que os alunos vão aprender?"
                                            value={form.description}
                                            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                            className="min-h-[120px] bg-black/40 border-white/10 text-white rounded-2xl focus:border-primary/50 resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <div>
                                            <p className="text-sm font-bold text-white">Publicar no e-Education</p>
                                            <p className="text-[10px] text-zinc-500 font-medium">Fica visível para outros profissionais comprarem.</p>
                                        </div>
                                        <button
                                            onClick={() => setForm(prev => ({ ...prev, is_published: !prev.is_published }))}
                                            className={cn(
                                                "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                                                form.is_published ? "bg-primary" : "bg-white/10"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-4 w-4 rounded-full bg-white transition-all shadow-sm",
                                                form.is_published ? "translate-x-6" : "translate-x-0"
                                            )} />
                                        </button>
                                    </div>
                                </div>

                                {!id && (
                                    <Button
                                        onClick={handleSaveGeneral}
                                        disabled={saving}
                                        className="w-full bg-primary text-black font-black uppercase tracking-tight rounded-2xl h-14 text-lg"
                                    >
                                        {saving ? <Loader2 className="h-6 w-6 animate-spin text-center" /> : "Criar e Continuar"}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="conteudo" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Estrutura de Aulas</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddModule}
                                className="bg-white/5 border-white/10 text-white rounded-xl gap-2 font-bold px-4"
                            >
                                <Plus className="h-4 w-4" />
                                Módulo
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {modules.map((mod) => (
                                <Card key={mod.id} className="bg-white/[0.03] border-white/5 rounded-[28px] overflow-hidden group">
                                    <CardContent className="p-0">
                                        <div className="p-4 flex items-center justify-between bg-white/[0.02] border-b border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500">
                                                    {mod.order_index + 1}
                                                </div>
                                                <h3 className="font-black text-white uppercase text-sm tracking-tight">{mod.title}</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleAddLesson(mod.id)}
                                                    className="h-8 w-8 p-0 text-primary hover:bg-primary/10 rounded-lg"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteModule(mod.id)}
                                                    className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="p-4 space-y-3">
                                            {mod.lessons?.length === 0 ? (
                                                <p className="text-[10px] text-zinc-600 font-medium text-center py-4 italic">Nenhuma aula neste módulo.</p>
                                            ) : (
                                                mod.lessons.map((lesson: any) => (
                                                    <div key={lesson.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-all space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <PlayCircle className="h-4 w-4 text-primary" />
                                                                <Input
                                                                    value={lesson.title}
                                                                    onChange={(e) => handleUpdateLesson(lesson.id, { title: e.target.value })}
                                                                    className="h-8 bg-transparent border-none text-sm font-bold text-white focus-visible:ring-0 p-0"
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteLesson(lesson.id)}
                                                                className="h-8 w-8 p-0 text-zinc-600 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <div className="grid gap-3">
                                                            <div className="relative">
                                                                <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                                                                <Input
                                                                    placeholder="Link do YouTube"
                                                                    value={lesson.video_url || ""}
                                                                    onBlur={(e) => handleUpdateLesson(lesson.id, { video_url: e.target.value })}
                                                                    className="pl-9 h-9 bg-black/60 border-white/5 text-[10px] font-medium text-zinc-400 rounded-xl"
                                                                />
                                                            </div>
                                                            <Textarea
                                                                placeholder="Conteúdo escrito / Notas da aula"
                                                                value={lesson.content || ""}
                                                                onBlur={(e) => handleUpdateLesson(lesson.id, { content: e.target.value })}
                                                                className="min-h-[60px] bg-black/60 border-white/5 text-[10px] font-medium text-zinc-400 rounded-xl resize-none"
                                                            />
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </section>

            <ProfessionalFloatingNavIsland />
        </main>
    );
}
