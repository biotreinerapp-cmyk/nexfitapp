
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, FileText, Eye, Upload, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type PagamentoRow = {
    id: string;
    user_id: string;
    store_id: string | null;
    provider: "pix";
    desired_plan: "FREE" | "ADVANCE" | "ELITE";
    status: "pending" | "approved" | "rejected";
    requested_at: string;
    processed_at: string | null;
    processed_by: string | null;
    receipt_path: string;
    reviewed_receipt_path: string | null;
    rejection_reason: string | null;
};

type PaymentRowUi = PagamentoRow & {
    user_name: string;
    user_email: string;
};

export const AdminFinancialPage = () => {
    const { toast } = useToast();
    const { user: sessionUser } = useAuth(); // renamed to avoid conflict
    const queryClient = useQueryClient();
    const [paymentStatus, setPaymentStatus] = useState<"all" | "approved" | "pending" | "rejected">("all");
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Dialog states
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean; paymentId: string | null }>({
        open: false,
        paymentId: null,
    });
    const [rejectReason, setRejectReason] = useState("");
    const [rejectFile, setRejectFile] = useState<File | null>(null);

    const { data: payments = [], isLoading, error } = useQuery<PaymentRowUi[]>({
        queryKey: ["admin-payments", paymentStatus],
        queryFn: async () => {
            let q = supabase
                .from("pagamentos")
                .select(
                    "id,user_id,store_id,provider,desired_plan,status,requested_at,processed_at,processed_by,receipt_path,reviewed_receipt_path,rejection_reason",
                )
                .order("requested_at", { ascending: false });

            if (paymentStatus !== "all") {
                q = q.eq("status", paymentStatus);
            }

            const { data, error } = await q;
            if (error) throw error;
            const rows = (data ?? []) as unknown as PagamentoRow[];

            // Fetch profiles to map names
            const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
            const profilesById = new Map<string, { name: string; email: string }>();

            if (userIds.length) {
                const { data: profilesData, error: profilesErr } = await supabase
                    .from("profiles")
                    .select("id, display_name, nome, email")
                    .in("id", userIds);

                if (profilesErr) throw profilesErr;

                for (const p of (profilesData ?? []) as any[]) {
                    const name = (p.display_name ?? p.nome ?? (p.email ? String(p.email).split("@")[0] : "(sem nome)")) as string;
                    const email = (p.email ?? "(sem e-mail)") as string;
                    profilesById.set(p.id as string, { name, email });
                }
            }

            return rows.map((r) => {
                const profile = profilesById.get(r.user_id);
                return {
                    ...r,
                    user_name: profile?.name ?? "(usuário)",
                    user_email: profile?.email ?? "(sem e-mail)",
                };
            });
        },
    });

    const uploadReviewedReceipt = async (payment: PaymentRowUi, file: File) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const reviewedPath = `admin-reviewed/${payment.user_id}/${payment.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
            .from("payment_receipts")
            .upload(reviewedPath, file, { upsert: true, contentType: file.type || undefined });
        if (uploadError) throw uploadError;
        return reviewedPath;
    };

    const handleOpenReceipt = async (receiptPath: string) => {
        try {
            const { data, error } = await supabase.storage.from("payment_receipts").createSignedUrl(receiptPath, 60 * 10);
            if (error) throw error;
            if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
        } catch (e: any) {
            toast({ title: "Erro ao abrir", description: e.message, variant: "destructive" });
        }
    };

    const handleApprove = async (payment: PaymentRowUi) => {
        if (!sessionUser) return;
        try {
            setProcessingId(payment.id);
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            // Update Profile
            const { error: profileErr } = await supabase
                .from("profiles")
                .update({ subscription_plan: payment.desired_plan, plan_expires_at: expiresAt })
                .eq("id", payment.user_id);
            if (profileErr) throw profileErr;

            // Update Payment
            const { error: payErr } = await supabase
                .from("pagamentos")
                .update({
                    status: "approved",
                    processed_at: new Date().toISOString(),
                    processed_by: sessionUser.id,
                    rejection_reason: null,
                })
                .eq("id", payment.id);
            if (payErr) throw payErr;

            toast({ title: "Aprovado", description: "Plano atualizado com sucesso." });
            queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!sessionUser || !rejectDialog.paymentId) return;
        try {
            setProcessingId(rejectDialog.paymentId);
            const payment = payments.find(p => p.id === rejectDialog.paymentId);

            let reviewedPath = null;
            if (payment && rejectFile) {
                reviewedPath = await uploadReviewedReceipt(payment, rejectFile);
            }

            const { error } = await supabase
                .from("pagamentos")
                .update({
                    status: "rejected",
                    rejection_reason: rejectReason,
                    processed_at: new Date().toISOString(),
                    processed_by: sessionUser.id,
                    reviewed_receipt_path: reviewedPath
                })
                .eq("id", rejectDialog.paymentId);

            if (error) throw error;

            toast({ title: "Rejeitado", description: "Pagamento rejeitado." });
            setRejectDialog({ open: false, paymentId: null });
            setRejectReason("");
            setRejectFile(null);
            queryClient.invalidateQueries({ queryKey: ["admin-payments"] });

        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gestão Financeira</h1>
                    <p className="text-sm text-muted-foreground">
                        Aprovação de pagamentos e histórico.
                    </p>
                </div>
            </div>

            <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium text-white">Transações</CardTitle>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
                                <SelectTrigger className="w-[140px] bg-black/20 border-white/10 h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="pending">Pendentes</SelectItem>
                                    <SelectItem value="approved">Aprovados</SelectItem>
                                    <SelectItem value="rejected">Rejeitados</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-white/5 bg-black/20 text-sm">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5 hover:bg-white/5">
                                    <TableHead className="text-muted-foreground">Usuário</TableHead>
                                    <TableHead className="text-muted-foreground">Plano</TableHead>
                                    <TableHead className="text-muted-foreground">Comprovante</TableHead>
                                    <TableHead className="text-muted-foreground">Data</TableHead>
                                    <TableHead className="text-muted-foreground">Status</TableHead>
                                    <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">Carregando...</TableCell></TableRow>
                                ) : payments.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhum pagamento encontrado.</TableCell></TableRow>
                                ) : (
                                    // Pagination Logic
                                    payments
                                        .slice((page - 1) * itemsPerPage, page * itemsPerPage)
                                        .map((row) => (
                                            <TableRow key={row.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-white">{row.user_name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{row.user_email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-white/10 bg-white/5 text-xs">{row.desired_plan}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                        onClick={() => handleOpenReceipt(row.receipt_path)}
                                                    >
                                                        <Eye className="mr-1 h-3 w-3" /> Ver
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(row.requested_at).toLocaleDateString("pt-BR")}
                                                </TableCell>
                                                <TableCell>
                                                    {row.status === "approved" && <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Aprovado</Badge>}
                                                    {row.status === "rejected" && <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">Rejeitado</Badge>}
                                                    {row.status === "pending" && <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 animate-pulse">Pendente</Badge>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {row.status === "pending" && (
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleApprove(row)}
                                                                disabled={processingId === row.id}
                                                                className="h-7 bg-green-500 hover:bg-green-600 text-white border-0"
                                                            >
                                                                {processingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => setRejectDialog({ open: true, paymentId: row.id })}
                                                                disabled={processingId === row.id}
                                                                className="h-7 bg-red-500/10 text-red-400 hover:bg-red-500/20 border-0"
                                                            >
                                                                <XCircle className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {row.status === "rejected" && row.rejection_reason && (
                                                        <span className="text-[10px] text-red-400 max-w-[100px] truncate block" title={row.rejection_reason}>
                                                            {row.rejection_reason}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {payments.length > itemsPerPage && (
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
                                Página {page} de {Math.ceil(payments.length / itemsPerPage)}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(Math.ceil(payments.length / itemsPerPage), p + 1))}
                                disabled={page === Math.ceil(payments.length / itemsPerPage)}
                                className="border-white/10 bg-white/5 hover:bg-white/10"
                            >
                                Próxima
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, paymentId: null })}>
                <DialogContent className="bg-[#1a1a1a] border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rejeitar Pagamento</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Explique o motivo da rejeição para o usuário.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Motivo</Label>
                            <Textarea
                                id="reason"
                                placeholder="Ex: Comprovante ilegível..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="bg-black/20 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Anexar Correção (Opcional)</Label>
                            <Input
                                type="file"
                                className="bg-black/20 border-white/10 text-xs"
                                onChange={(e) => setRejectFile(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRejectDialog({ open: false, paymentId: null })} className="hover:bg-white/10">Cancelar</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || !!processingId}>
                            {processingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Rejeição"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminFinancialPage;
