
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Search, Filter, Loader2, UserX, CheckCircle, Shield, MoreHorizontal, Pencil, Ban, Undo2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type AdminUser = {
    id: string;
    display_name: string | null;
    email: string | null;
    phone: string | null;
    subscription_plan: string | null;
    created_at: string;
    ativo: boolean;
};

export const AdminUsersPage = () => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [planFilter, setPlanFilter] = useState<string>("all");
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // Edit State
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editPlan, setEditPlan] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Ban State
    const [banningUser, setBanningUser] = useState<AdminUser | null>(null);
    const [isBanOpen, setIsBanOpen] = useState(false);
    const [banReason, setBanReason] = useState("Violação dos termos de uso");
    const [isBanning, setIsBanning] = useState(false);

    const { data: users = [], isLoading, error, refetch } = useQuery({
        queryKey: ["admin-users"],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("admin_list_users");
            if (error) throw error;
            return (data as any[])?.map((u) => ({
                ...u,
                ativo: u.ativo ?? true,
            })) as AdminUser[];
        },
    });

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            (user.display_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
        const matchesPlan =
            planFilter === "all" || user.subscription_plan === planFilter;
        return matchesSearch && matchesPlan;
    });

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    // --- Actions ---

    // 1. Edit User
    const openEditModal = (user: AdminUser) => {
        setEditingUser(user);
        setEditName(user.display_name || "");
        setEditPlan(user.subscription_plan || "FREE");
        setIsEditOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    display_name: editName,
                    subscription_plan: editPlan as any
                })
                .eq("id", editingUser.id);

            if (error) throw error;

            toast({ title: "Sucesso", description: "Dados do usuário atualizados." });
            setIsEditOpen(false);
            refetch();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // 2. Ban / Unban User
    const openBanModal = (user: AdminUser) => {
        setBanningUser(user);
        setIsBanOpen(true);
    };

    const handleToggleBan = async () => {
        if (!banningUser) return;
        setIsBanning(true);
        const willBan = banningUser.ativo; // If currently active, we are banning (setting to false)

        try {
            // 1. Update Profile Active Status
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ ativo: !willBan })
                .eq("id", banningUser.id);

            if (profileError) throw profileError;

            // 2. Manage Blacklist
            if (willBan) {
                // Add to blacklist if banning
                if (banningUser.email) {
                    const { error: blError } = await supabase
                        .from("blacklist_emails")
                        .upsert({ 
                            email: banningUser.email, 
                            reason: banReason,
                            banned_by: (await supabase.auth.getUser()).data.user?.id 
                        }, { onConflict: "email" });
                    
                     if (blError) console.error("Blacklist Error:", blError); // Log but don't fail visible flow if table missing
                }
            } else {
                // Remove from blacklist if unbanning
                if (banningUser.email) {
                   await supabase.from("blacklist_emails").delete().eq("email", banningUser.email);
                }
            }

            toast({ 
                title: willBan ? "Usuário Banido" : "Acesso Restaurado", 
                description: willBan 
                    ? `O usuário ${banningUser.display_name} foi bloqueado e adicionado à lista negra.`
                    : `O acesso do usuário ${banningUser.display_name} foi restaurado.`
            });

            setIsBanOpen(false);
            refetch();

        } catch (error: any) {
             toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setIsBanning(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gestão de Usuários</h1>
                    <p className="text-sm text-muted-foreground">
                        {users.length} usuários cadastrados no total.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10" onClick={() => refetch()}>
                        <Loader2 className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <CardTitle className="text-base font-medium text-white">Todos os Usuários</CardTitle>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome ou email..."
                                    className="w-full bg-black/20 pl-9 md:w-[250px] border-white/10 focus:border-green-500/50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={planFilter} onValueChange={setPlanFilter}>
                                <SelectTrigger className="w-[180px] bg-black/20 border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-3.5 w-3.5" />
                                        <SelectValue placeholder="Filtrar por plano" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Planos</SelectItem>
                                    <SelectItem value="FREE">Free</SelectItem>
                                    <SelectItem value="ADVANCE">Advance</SelectItem>
                                    <SelectItem value="ELITE">Elite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-white/5 bg-black/20">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5 hover:bg-white/5">
                                    <TableHead className="text-muted-foreground">Usuário</TableHead>
                                    <TableHead className="text-muted-foreground">Plano</TableHead>
                                    <TableHead className="text-muted-foreground">Status</TableHead>
                                    <TableHead className="text-muted-foreground">Data Cadastro</TableHead>
                                    <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Carregando usuários...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Nenhum usuário encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedUsers.map((user) => (
                                        <TableRow key={user.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white">
                                                        {user.display_name || "Sem Nome"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={`
                            border-0 px-2 py-0.5 text-xs font-semibold
                            ${user.subscription_plan === "ELITE"
                                                            ? "bg-purple-500/10 text-purple-400"
                                                            : user.subscription_plan === "ADVANCE"
                                                                ? "bg-blue-500/10 text-blue-400"
                                                                : "bg-white/10 text-muted-foreground"
                                                        }
                          `}
                                                >
                                                    {user.subscription_plan || "FREE"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {user.ativo ? (
                                                        <span className="flex items-center text-xs text-green-400">
                                                            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center text-xs text-red-400">
                                                            <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(user.created_at).toLocaleDateString("pt-BR")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10 text-white">
                                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                        <DropdownMenuItem 
                                                          className="focus:bg-white/10 cursor-pointer"
                                                          onClick={() => openEditModal(user)}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" /> Editar Perfil
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        <DropdownMenuItem
                                                            className={`focus:bg-white/10 cursor-pointer ${user.ativo ? "text-red-400 focus:text-red-400" : "text-green-400 focus:text-green-400"}`}
                                                            onClick={() => openBanModal(user)}
                                                        >
                                                            {user.ativo ? (
                                                              <>
                                                                <Ban className="mr-2 h-4 w-4" /> Banir Usuário
                                                              </>
                                                            ) : (
                                                              <>
                                                                <Undo2 className="mr-2 h-4 w-4" /> Restaurar Acesso
                                                              </>
                                                            )}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="border-white/10 bg-white/5 hover:bg-white/10"
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
                                className="border-white/10 bg-white/5 hover:bg-white/10"
                            >
                                Próxima
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* EDIT USER DIALOG */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-black/90 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Atualize as informações do perfil e plano do usuário.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right text-zinc-300">
                                Nome
                            </Label>
                            <Input
                                id="name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="col-span-3 bg-white/5 border-white/10 text-white"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="plan" className="text-right text-zinc-300">
                                Plano
                            </Label>
                             <Select value={editPlan} onValueChange={setEditPlan}>
                                <SelectTrigger className="col-span-3 bg-white/5 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FREE">Free</SelectItem>
                                    <SelectItem value="ADVANCE">Advance</SelectItem>
                                    <SelectItem value="ELITE">Elite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-white hover:bg-white/10">Cancelar</Button>
                        <Button onClick={handleSaveUser} disabled={isSaving} className="bg-primary text-black hover:bg-green-500">
                             {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* BAN USER CONFIRMATION DIALOG */}
            <Dialog open={isBanOpen} onOpenChange={setIsBanOpen}>
                <DialogContent className="bg-black/90 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className={banningUser?.ativo ? "text-red-500" : "text-green-500"}>
                             {banningUser?.ativo ? "Banir Usuário" : "Restaurar Acesso"}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                             {banningUser?.ativo 
                                ? `Tem certeza que deseja bloquear ${banningUser?.display_name}? O email será adicionado à lista negra.` 
                                : `Deseja remover o bloqueio de ${banningUser?.display_name}?`}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {banningUser?.ativo && (
                        <div className="py-2 space-y-2">
                             <Label className="text-zinc-300">Motivo do Bloqueio</Label>
                             <Input 
                                value={banReason} 
                                onChange={(e) => setBanReason(e.target.value)} 
                                className="bg-white/5 border-white/10 text-white"
                             />
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsBanOpen(false)} className="text-white hover:bg-white/10">Cancelar</Button>
                        <Button 
                            onClick={handleToggleBan} 
                            disabled={isBanning} 
                            variant={banningUser?.ativo ? "destructive" : "default"}
                            className={!banningUser?.ativo ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                             {isBanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                             {banningUser?.ativo ? "Confirmar Banimento" : "Restaurar Acesso"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminUsersPage;
