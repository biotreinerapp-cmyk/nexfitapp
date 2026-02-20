import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import {
    LogOut, Store, Pencil, CreditCard, Crown, Mail,
    MapPin, Truck, Smartphone, FileText, Landmark, Key, Save,
    X, Check
} from "lucide-react";
import { StoreImageEditor } from "@/components/marketplace/StoreImageEditor";

const storeSchema = z.object({
    nome: z.string().trim().min(2, "Nome da loja é obrigatório"),
    descricao: z.string().trim().optional(),
    city: z.string().trim().optional(),
    shipping_cost: z.coerce.number().min(0, "Custo deve ser positivo"),
    cnpj: z.string().trim().optional(),
    whatsapp: z.string().trim().optional(),
});

const pixSchema = z.object({
    pix_key: z.string().trim().min(1, "Chave Pix é obrigatória"),
    receiver_name: z.string().trim().min(1, "Nome do recebedor é obrigatório"),
    bank_name: z.string().trim().min(1, "Nome do banco é obrigatório"),
});

type StoreValues = z.infer<typeof storeSchema>;
type PixValues = z.infer<typeof pixSchema>;

const LojaPerfilPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [store, setStore] = useState<any | null>(null);
    const [editing, setEditing] = useState(false);
    const [editingPix, setEditingPix] = useState(false);

    const storeForm = useForm<StoreValues>({
        resolver: zodResolver(storeSchema),
        defaultValues: {
            nome: "",
            descricao: "",
            city: "",
            shipping_cost: 0,
            cnpj: "",
            whatsapp: "",
        },
    });

    const pixForm = useForm<PixValues>({
        resolver: zodResolver(pixSchema),
        defaultValues: {
            pix_key: "",
            receiver_name: "",
            bank_name: "",
        },
    });

    useEffect(() => {
        document.title = "Perfil - Nexfit Lojista";
        const load = async () => {
            if (!user) return;
            const { data } = await (supabase as any)
                .from("marketplace_stores")
                .select("*")
                .eq("owner_user_id", user.id)
                .maybeSingle();

            if (data) {
                setStore(data);
                storeForm.reset({
                    nome: data.nome,
                    descricao: data.descricao || "",
                    city: data.city || "",
                    shipping_cost: data.shipping_cost || 0,
                    cnpj: data.cnpj || "",
                    whatsapp: data.whatsapp || "",
                });

                const { data: pix } = await supabase
                    .from("pix_configs")
                    .select("*")
                    .eq("marketplace_store_id", data.id)
                    .maybeSingle();

                if (pix) {
                    pixForm.reset({
                        pix_key: pix.pix_key || "",
                        receiver_name: pix.receiver_name || "",
                        bank_name: pix.bank_name || "",
                    });
                }
            }
        };
        void load();
    }, [user, storeForm, pixForm]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth", { replace: true });
    };

    const onSaveStore = async (values: StoreValues) => {
        if (!store) return;

        try {
            const { error } = await (supabase as any)
                .from("marketplace_stores")
                .update({
                    nome: values.nome,
                    descricao: values.descricao || null,
                    city: values.city || null,
                    shipping_cost: values.shipping_cost,
                    cnpj: values.cnpj || null,
                    whatsapp: values.whatsapp || null,
                })
                .eq("id", store.id);

            if (error) throw error;

            // Sync Auth metadata
            await supabase.auth.updateUser({
                data: {
                    full_name: values.nome,
                }
            });

            setStore((prev: any) => ({ ...prev, ...values }));
            setEditing(false);
            toast({ title: "Perfil atualizado" });
        } catch (err: any) {
            toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
        }
    };

    const onSavePix = async (values: PixValues) => {
        if (!store) return;

        try {
            const { data: existing } = await supabase
                .from("pix_configs")
                .select("id")
                .eq("marketplace_store_id", store.id)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from("pix_configs")
                    .update(values)
                    .eq("id", existing.id);
            } else {
                await supabase
                    .from("pix_configs")
                    .insert({ marketplace_store_id: store.id, ...values });
            }

            setEditingPix(false);
            toast({ title: "Pix configurado" });
        } catch (err: any) {
            toast({ title: "Erro ao salvar Pix", description: err.message, variant: "destructive" });
        }
    };

    return (
        <main className="flex min-h-screen flex-col bg-black px-4 pb-32 pt-8 relative overflow-hidden safe-bottom-floating-nav">

            <header className="mb-6 relative z-10">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">Configurações</p>
                <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white leading-none">Minha Loja</h1>
            </header>

            <section className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Basic Info Card */}
                <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                            {store?.profile_image_url ? (
                                <img src={store.profile_image_url} alt="Logo" className="h-full w-full object-cover" />
                            ) : (
                                <Store className="h-8 w-8 text-zinc-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-black text-white truncate uppercase tracking-tight">
                                {store?.nome || "Carregando..."}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <Mail className="h-3 w-3 text-zinc-500" />
                                <p className="text-[10px] font-medium text-zinc-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                        {!editing && (
                            <button
                                onClick={() => setEditing(true)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400 hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                                <Pencil className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Plan Status */}
                <div className="relative overflow-hidden rounded-[24px] border border-primary/20 bg-primary/5 p-5 backdrop-blur-md">
                    <div className="absolute top-0 right-0 p-4 opacity-50">
                        <div className="h-20 w-20 rounded-full bg-primary/20 blur-xl" />
                    </div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                                <Crown className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">Plano Atual</p>
                                <p className="text-sm font-black text-white uppercase tracking-tight">
                                    Lojista {store?.subscription_plan === "PRO" ? "PRO" : "FREE"}
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="h-9 rounded-lg bg-primary text-[10px] font-bold uppercase tracking-widest text-black hover:bg-primary/90 shadow-md"
                            onClick={() => navigate("/loja/plano")}
                        >
                            Upgrade
                        </Button>
                    </div>
                </div>

                {editing && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="rounded-[32px] border border-white/5 bg-white/[0.04] p-6 backdrop-blur-xl">
                            <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-primary">Identidade Visual</h3>
                            <StoreImageEditor
                                storeId={store.id}
                                currentProfileUrl={store.profile_image_url}
                                currentBannerUrl={store.banner_image_url}
                                onImagesUpdated={(p: string | null, b: string | null) => setStore((prev: any) => ({ ...prev, profile_image_url: p, banner_image_url: b }))}
                            />
                        </div>

                        <Form {...storeForm}>
                            <form onSubmit={storeForm.handleSubmit(onSaveStore)} className="space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1 mb-2">
                                        <div className="h-1 w-4 rounded-full bg-primary" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Dados Gerais</h2>
                                    </div>

                                    <FormField
                                        control={storeForm.control}
                                        name="nome"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome da Loja</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary transition-colors group-focus-within:text-white" />
                                                        <Input className="h-14 pl-12 rounded-2xl border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary/50" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={storeForm.control}
                                        name="descricao"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Descrição</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <FileText className="absolute left-4 top-5 h-4 w-4 text-primary transition-colors group-focus-within:text-white" />
                                                        <Textarea className="min-h-[100px] pl-12 rounded-2xl border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary/50" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={storeForm.control}
                                            name="city"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1.5">
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Cidade</FormLabel>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary transition-colors group-focus-within:text-white" />
                                                            <Input className="h-14 pl-12 rounded-2xl border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary/50" {...field} />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={storeForm.control}
                                            name="shipping_cost"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1.5">
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Frete Padrão</FormLabel>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary transition-colors group-focus-within:text-white" />
                                                            <MaskedInput mask="currency" className="h-14 pl-12 rounded-2xl border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary/50" {...field} />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={storeForm.control}
                                            name="cnpj"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1.5">
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">CNPJ</FormLabel>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary transition-colors group-focus-within:text-white" />
                                                            <MaskedInput mask="cnpj" className="h-14 pl-12 rounded-2xl border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary/50" {...field} />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={storeForm.control}
                                            name="whatsapp"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1.5">
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">WhatsApp</FormLabel>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary transition-colors group-focus-within:text-white" />
                                                            <MaskedInput mask="phone" className="h-14 pl-12 rounded-2xl border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-primary/50" {...field} />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="button" variant="ghost" className="flex-1 h-14 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5" onClick={() => setEditing(false)}>
                                        Descartar
                                    </Button>
                                    <Button type="submit" className="flex-1 h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-[10px] hover:bg-primary/90">
                                        <Save className="mr-2 h-4 w-4" /> Salvar Loja
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                )}

                {/* Pix Configuration */}
                <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                                <CreditCard className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Configuração</h3>
                                <p className="text-sm font-black text-white uppercase tracking-tight">Recebimento Pix</p>
                            </div>
                        </div>
                        {!editingPix && (
                            <button
                                onClick={() => setEditingPix(true)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {!editingPix ? (
                        <div className="grid gap-3">
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Chave</span>
                                <span className="text-xs font-bold text-white max-w-[150px] truncate">{pixForm.getValues("pix_key") || "Não configurada"}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Recebedor</span>
                                <span className="text-xs font-bold text-white max-w-[150px] truncate">{pixForm.getValues("receiver_name") || "—"}</span>
                            </div>
                        </div>
                    ) : (
                        <Form {...pixForm}>
                            <form onSubmit={pixForm.handleSubmit(onSavePix)} className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                <FormField
                                    control={pixForm.control}
                                    name="pix_key"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Chave Pix</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary transition-colors group-focus-within:text-white" />
                                                    <Input className="h-12 pl-12 rounded-xl border-white/10 bg-white/5 text-white focus:border-primary/50" placeholder="CPF, E-mail, Celular ou Chave Aleatória" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[9px]" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={pixForm.control}
                                    name="receiver_name"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome do Recebedor</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary transition-colors group-focus-within:text-white" />
                                                    <Input className="h-12 pl-12 rounded-xl border-white/10 bg-white/5 text-white focus:border-primary/50" placeholder="Nome completo como no banco" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[9px]" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={pixForm.control}
                                    name="bank_name"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Banco</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary transition-colors group-focus-within:text-white" />
                                                    <Input className="h-12 pl-12 rounded-xl border-white/10 bg-white/5 text-white focus:border-primary/50" placeholder="Ex: Nubank, Itaú" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[9px]" />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex gap-2 pt-2">
                                    <Button type="button" size="sm" variant="ghost" className="flex-1 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5" onClick={() => setEditingPix(false)}>
                                        <X className="mr-2 h-3 w-3" /> Cancelar
                                    </Button>
                                    <Button type="submit" size="sm" className="flex-1 h-10 rounded-xl bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-primary/90">
                                        <Check className="mr-2 h-3 w-3" /> Salvar Pix
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </div>

                <button
                    className="mt-4 flex w-full h-14 items-center justify-center rounded-[28px] border border-white/5 bg-white/[0.03] text-zinc-500 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all font-bold uppercase tracking-widest text-[10px]"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair da Conta Lojista
                </button>
            </section>

            <LojaFloatingNavIsland />
        </main>
    );
};

export default LojaPerfilPage;
