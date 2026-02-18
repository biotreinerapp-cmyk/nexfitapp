import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Trash2,
  Plus,
  ImageIcon,
  ExternalLink,
  DollarSign,
  Eye,
  EyeOff,
  Calendar,
  Building2,
  Pencil,
  BarChart3,
  CheckCircle2,
  Clock,
  Gift,
  Handshake,
} from "lucide-react";

type BannerRow = {
  id: string;
  image_url: string;
  image_path: string;
  link_url: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  title: string | null;
  advertiser_name: string | null;
  advertiser_contact: string | null;
  price_paid: number | null;
  payment_status: string | null;
  notes: string | null;
  display_order: number;
};

type BannerDraft = {
  file: File | null;
  previewUrl: string | null;
  title: string;
  linkUrl: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  advertiserName: string;
  advertiserContact: string;
  pricePaid: string;
  paymentStatus: string;
  notes: string;
  displayOrder: string;
};

const MASTER_EMAIL = "biotreinerapp@gmail.com";

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocal = (value: string) => new Date(value).toISOString();

const newDraft = (): BannerDraft => ({
  file: null,
  previewUrl: null,
  title: "",
  linkUrl: "",
  startsAt: toDatetimeLocal(new Date().toISOString()),
  endsAt: "",
  isActive: true,
  advertiserName: "",
  advertiserContact: "",
  pricePaid: "",
  paymentStatus: "free",
  notes: "",
  displayOrder: "0",
});

const ensureAdminMasterRole = async () => {
  await supabase.functions.invoke("ensure-admin-master");
};

const paymentStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  paid: { label: "Pago", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  pending: { label: "Pendente", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: <Clock className="h-3 w-3" /> },
  free: { label: "Gratuito", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Gift className="h-3 w-3" /> },
  barter: { label: "Permuta", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: <Handshake className="h-3 w-3" /> },
};

export const DashboardOutdoorAdminPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();

  const isAdminMaster = (user?.email ?? "").toLowerCase() === MASTER_EMAIL;
  const canRender = !roleLoading && (isAdmin || isAdminMaster);

  const [rows, setRows] = useState<BannerRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<BannerRow | null>(null);
  const [editingBanner, setEditingBanner] = useState<BannerRow | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<BannerDraft>(newDraft());
  const [editDraft, setEditDraft] = useState<Partial<BannerDraft>>({});

  const load = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("dashboard_outdoors")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100);

    setLoadingList(false);
    if (error) {
      toast({ title: "Erro ao carregar banners", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data ?? []) as BannerRow[]);
  };

  useEffect(() => {
    if (!canRender) return;
    if (isAdminMaster && !isAdmin) {
      void ensureAdminMasterRole().then(() => void load());
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRender, isAdminMaster, isAdmin]);

  const uploadImage = async (imageFile: File) => {
    const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `outdoors/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("dashboard_outdoors")
      .upload(filePath, imageFile, { upsert: true, contentType: imageFile.type || "image/png" });
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage.from("dashboard_outdoors").getPublicUrl(filePath);
    return { filePath, publicUrl: publicData.publicUrl };
  };

  const updateDraft = (patch: Partial<BannerDraft>) => setDraft(prev => ({ ...prev, ...patch }));

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, setter: (p: Partial<BannerDraft>) => void) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setter({ file, previewUrl });
    }
  };

  const handlePublish = async () => {
    if (!draft.file) {
      toast({ title: "Imagem obrigatória", description: "Selecione uma imagem para o banner.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (isAdminMaster && !isAdmin) await ensureAdminMasterRole();
      const { filePath, publicUrl } = await uploadImage(draft.file);
      const payload = {
        image_path: filePath,
        image_url: publicUrl,
        title: draft.title.trim() || null,
        link_url: draft.linkUrl.trim() || null,
        starts_at: fromDatetimeLocal(draft.startsAt),
        ends_at: draft.endsAt.trim() ? fromDatetimeLocal(draft.endsAt) : null,
        is_active: draft.isActive,
        advertiser_name: draft.advertiserName.trim() || null,
        advertiser_contact: draft.advertiserContact.trim() || null,
        price_paid: draft.pricePaid ? parseFloat(draft.pricePaid) : null,
        payment_status: draft.paymentStatus || "free",
        notes: draft.notes.trim() || null,
        display_order: parseInt(draft.displayOrder) || 0,
      };
      const { error } = await supabase.from("dashboard_outdoors").insert(payload as any);
      if (error) throw error;
      setDraft(newDraft());
      setShowAddForm(false);
      toast({ title: "Banner publicado!", description: "O banner já está disponível no dashboard." });
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao publicar", description: e?.message ?? "Falha inesperada", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBanner) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (editDraft.title !== undefined) payload.title = editDraft.title?.trim() || null;
      if (editDraft.linkUrl !== undefined) payload.link_url = editDraft.linkUrl?.trim() || null;
      if (editDraft.startsAt) payload.starts_at = fromDatetimeLocal(editDraft.startsAt);
      if (editDraft.endsAt !== undefined) payload.ends_at = editDraft.endsAt?.trim() ? fromDatetimeLocal(editDraft.endsAt) : null;
      if (editDraft.advertiserName !== undefined) payload.advertiser_name = editDraft.advertiserName?.trim() || null;
      if (editDraft.advertiserContact !== undefined) payload.advertiser_contact = editDraft.advertiserContact?.trim() || null;
      if (editDraft.pricePaid !== undefined) payload.price_paid = editDraft.pricePaid ? parseFloat(editDraft.pricePaid) : null;
      if (editDraft.paymentStatus !== undefined) payload.payment_status = editDraft.paymentStatus;
      if (editDraft.notes !== undefined) payload.notes = editDraft.notes?.trim() || null;
      if (editDraft.displayOrder !== undefined) payload.display_order = parseInt(editDraft.displayOrder ?? "0") || 0;
      if (editDraft.isActive !== undefined) payload.is_active = editDraft.isActive;

      // Handle new image if uploaded
      if (editDraft.file) {
        const { filePath, publicUrl } = await uploadImage(editDraft.file);
        payload.image_path = filePath;
        payload.image_url = publicUrl;
        // Remove old image
        if (editingBanner.image_path) {
          await supabase.storage.from("dashboard_outdoors").remove([editingBanner.image_path]);
        }
      }

      const { error } = await supabase.from("dashboard_outdoors").update(payload).eq("id", editingBanner.id);
      if (error) throw error;
      setEditingBanner(null);
      setEditDraft({});
      toast({ title: "Banner atualizado!" });
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, next: boolean) => {
    const { error } = await supabase.from("dashboard_outdoors").update({ is_active: next }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setRows(prev => prev.map(r => (r.id === id ? { ...r, is_active: next } : r)));
  };

  const remove = async (row: BannerRow) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("dashboard_outdoors").delete().eq("id", row.id);
      if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
      if (row.image_path) await supabase.storage.from("dashboard_outdoors").remove([row.image_path]);
      setRows(prev => prev.filter(r => r.id !== row.id));
      toast({ title: "Banner removido." });
    } finally {
      setIsDeleting(false);
      setBannerToDelete(null);
    }
  };

  const openEdit = (row: BannerRow) => {
    setEditingBanner(row);
    setEditDraft({
      title: row.title ?? "",
      linkUrl: row.link_url ?? "",
      startsAt: toDatetimeLocal(row.starts_at),
      endsAt: row.ends_at ? toDatetimeLocal(row.ends_at) : "",
      isActive: row.is_active,
      advertiserName: row.advertiser_name ?? "",
      advertiserContact: row.advertiser_contact ?? "",
      pricePaid: row.price_paid?.toString() ?? "",
      paymentStatus: row.payment_status ?? "free",
      notes: row.notes ?? "",
      displayOrder: row.display_order?.toString() ?? "0",
      file: null,
      previewUrl: null,
    });
  };

  // Stats
  const totalRevenue = rows.filter(r => r.payment_status === "paid").reduce((s, r) => s + (r.price_paid ?? 0), 0);
  const activeBanners = rows.filter(r => r.is_active).length;
  const paidBanners = rows.filter(r => r.payment_status === "paid").length;

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!canRender) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-zinc-500">
        Apenas administradores podem gerenciar banners.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Gestão de Banners
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Banners do dashboard do aluno · 360×120px recomendado</p>
        </div>
        <Button
          onClick={() => setShowAddForm(v => !v)}
          size="sm"
          className="bg-primary text-black font-bold hover:bg-primary/90 rounded-xl gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Banner
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Ativos</span>
          </div>
          <p className="text-2xl font-black text-white">{activeBanners}</p>
          <p className="text-[10px] text-zinc-600">de {rows.length} total</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Receita</span>
          </div>
          <p className="text-2xl font-black text-white">
            {totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[10px] text-zinc-600">{paidBanners} anúncio(s) pago(s)</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-blue-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Anunciantes</span>
          </div>
          <p className="text-2xl font-black text-white">
            {new Set(rows.filter(r => r.advertiser_name).map(r => r.advertiser_name)).size}
          </p>
          <p className="text-[10px] text-zinc-600">únicos</p>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Novo Banner</h3>

          {/* Image Upload with Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Imagem do Banner *</Label>
            {draft.previewUrl ? (
              <div className="relative group w-full max-w-sm">
                <img src={draft.previewUrl} alt="Preview" className="w-full h-24 object-cover rounded-xl border border-white/10" />
                <button
                  onClick={() => updateDraft({ file: null, previewUrl: null })}
                  className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full max-w-sm h-24 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
                <ImageIcon className="h-6 w-6 text-zinc-600 mb-1" />
                <span className="text-xs text-zinc-500">Clique para selecionar (JPG, PNG)</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, updateDraft)} />
              </label>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Título</Label>
              <Input value={draft.title} onChange={e => updateDraft({ title: e.target.value })} placeholder="Ex: Suplementos Alpha" className="bg-white/5 border-white/10 text-white rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Link de destino</Label>
              <Input value={draft.linkUrl} onChange={e => updateDraft({ linkUrl: e.target.value })} placeholder="https://..." className="bg-white/5 border-white/10 text-white rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Início</Label>
              <Input type="datetime-local" value={draft.startsAt} onChange={e => updateDraft({ startsAt: e.target.value })} className="bg-white/5 border-white/10 text-white rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Fim (opcional)</Label>
              <Input type="datetime-local" value={draft.endsAt} onChange={e => updateDraft({ endsAt: e.target.value })} className="bg-white/5 border-white/10 text-white rounded-xl" />
            </div>
          </div>

          {/* Monetization Section */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              Dados de Monetização
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Anunciante</Label>
                <Input value={draft.advertiserName} onChange={e => updateDraft({ advertiserName: e.target.value })} placeholder="Nome da empresa" className="bg-white/5 border-white/10 text-white rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Contato</Label>
                <Input value={draft.advertiserContact} onChange={e => updateDraft({ advertiserContact: e.target.value })} placeholder="WhatsApp / Email" className="bg-white/5 border-white/10 text-white rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Valor (R$)</Label>
                <Input type="number" step="0.01" value={draft.pricePaid} onChange={e => updateDraft({ pricePaid: e.target.value })} placeholder="0,00" className="bg-white/5 border-white/10 text-white rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Status do Pagamento</Label>
                <Select value={draft.paymentStatus} onValueChange={v => updateDraft({ paymentStatus: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="free">Gratuito</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="barter">Permuta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ordem de exibição</Label>
                <Input type="number" value={draft.displayOrder} onChange={e => updateDraft({ displayOrder: e.target.value })} placeholder="0" className="bg-white/5 border-white/10 text-white rounded-xl" />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <Switch checked={draft.isActive} onCheckedChange={v => updateDraft({ isActive: v })} />
                <span className="text-sm text-zinc-400">Ativo imediatamente</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Observações internas</Label>
              <Textarea value={draft.notes} onChange={e => updateDraft({ notes: e.target.value })} placeholder="Notas sobre o contrato, negociação, etc." className="bg-white/5 border-white/10 text-white rounded-xl resize-none" rows={2} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handlePublish} disabled={saving} className="bg-primary text-black font-bold rounded-xl gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Publicar Banner
            </Button>
            <Button variant="ghost" onClick={() => { setShowAddForm(false); setDraft(newDraft()); }} className="text-zinc-400 rounded-xl">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Banner List */}
      <div className="space-y-3">
        {loadingList && rows.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <ImageIcon className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-zinc-500">Nenhum banner cadastrado</p>
            <p className="text-xs text-zinc-600 mt-1">Clique em "Novo Banner" para começar</p>
          </div>
        ) : (
          rows.map(row => {
            const statusCfg = paymentStatusConfig[row.payment_status ?? "free"] ?? paymentStatusConfig.free;
            const isExpired = row.ends_at && new Date(row.ends_at) < new Date();
            return (
              <div
                key={row.id}
                className={`rounded-2xl border bg-white/[0.02] overflow-hidden transition-all ${row.is_active && !isExpired ? "border-white/10" : "border-white/5 opacity-60"}`}
              >
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="shrink-0 w-32 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-white/5">
                    <img src={row.image_url} alt={row.title ?? "Banner"} className="w-full h-full object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white truncate">
                          {row.title || <span className="text-zinc-500 italic">Sem título</span>}
                        </p>
                        {row.advertiser_name && (
                          <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" />
                            {row.advertiser_name}
                            {row.advertiser_contact && <span className="text-zinc-600">· {row.advertiser_contact}</span>}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                          {row.price_paid ? ` · R$ ${row.price_paid.toFixed(2)}` : ""}
                        </span>
                        {isExpired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/20 text-red-400 border-red-500/30">
                            Expirado
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(row.starts_at).toLocaleDateString("pt-BR")}
                        {row.ends_at && ` → ${new Date(row.ends_at).toLocaleDateString("pt-BR")}`}
                      </span>
                      {row.link_url && (
                        <a href={row.link_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary flex items-center gap-1 hover:underline">
                          <ExternalLink className="h-3 w-3" />
                          {row.link_url.length > 30 ? row.link_url.slice(0, 30) + "…" : row.link_url}
                        </a>
                      )}
                      <span className="text-[10px] text-zinc-600">Ordem: {row.display_order}</span>
                    </div>

                    {row.notes && (
                      <p className="text-[10px] text-zinc-600 mt-1 italic truncate">📝 {row.notes}</p>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={row.is_active}
                      onCheckedChange={v => void toggleActive(row.id, v)}
                    />
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      {row.is_active ? <Eye className="h-3 w-3 text-primary" /> : <EyeOff className="h-3 w-3" />}
                      {row.is_active ? "Visível" : "Oculto"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(row)} className="h-8 px-3 text-zinc-400 hover:text-white rounded-xl gap-1.5 text-xs">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setBannerToDelete(row)} className="h-8 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl gap-1.5 text-xs">
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBanner} onOpenChange={open => { if (!open) { setEditingBanner(null); setEditDraft({}); } }}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Editar Banner</DialogTitle>
          </DialogHeader>
          {editingBanner && (
            <div className="space-y-4">
              {/* Current image + option to replace */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Imagem atual</Label>
                <div className="relative group w-full">
                  <img
                    src={editDraft.previewUrl ?? editingBanner.image_url}
                    alt="Banner"
                    className="w-full h-24 object-cover rounded-xl border border-white/10"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer">
                    <span className="text-xs text-white font-bold flex items-center gap-1"><ImageIcon className="h-4 w-4" /> Trocar imagem</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, p => setEditDraft(prev => ({ ...prev, ...p })))} />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Título</Label>
                  <Input value={editDraft.title ?? ""} onChange={e => setEditDraft(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10 text-white rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Link</Label>
                  <Input value={editDraft.linkUrl ?? ""} onChange={e => setEditDraft(p => ({ ...p, linkUrl: e.target.value }))} placeholder="https://..." className="bg-white/5 border-white/10 text-white rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Início</Label>
                  <Input type="datetime-local" value={editDraft.startsAt ?? ""} onChange={e => setEditDraft(p => ({ ...p, startsAt: e.target.value }))} className="bg-white/5 border-white/10 text-white rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Fim</Label>
                  <Input type="datetime-local" value={editDraft.endsAt ?? ""} onChange={e => setEditDraft(p => ({ ...p, endsAt: e.target.value }))} className="bg-white/5 border-white/10 text-white rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Anunciante</Label>
                  <Input value={editDraft.advertiserName ?? ""} onChange={e => setEditDraft(p => ({ ...p, advertiserName: e.target.value }))} className="bg-white/5 border-white/10 text-white rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Contato</Label>
                  <Input value={editDraft.advertiserContact ?? ""} onChange={e => setEditDraft(p => ({ ...p, advertiserContact: e.target.value }))} className="bg-white/5 border-white/10 text-white rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Valor (R$)</Label>
                  <Input type="number" step="0.01" value={editDraft.pricePaid ?? ""} onChange={e => setEditDraft(p => ({ ...p, pricePaid: e.target.value }))} className="bg-white/5 border-white/10 text-white rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Status Pagamento</Label>
                  <Select value={editDraft.paymentStatus ?? "free"} onValueChange={v => setEditDraft(p => ({ ...p, paymentStatus: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="free">Gratuito</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="barter">Permuta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ordem</Label>
                  <Input type="number" value={editDraft.displayOrder ?? "0"} onChange={e => setEditDraft(p => ({ ...p, displayOrder: e.target.value }))} className="bg-white/5 border-white/10 text-white rounded-xl" />
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <Switch checked={editDraft.isActive ?? true} onCheckedChange={v => setEditDraft(p => ({ ...p, isActive: v }))} />
                  <span className="text-sm text-zinc-400">Ativo</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Observações</Label>
                <Textarea value={editDraft.notes ?? ""} onChange={e => setEditDraft(p => ({ ...p, notes: e.target.value }))} className="bg-white/5 border-white/10 text-white rounded-xl resize-none" rows={2} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveEdit} disabled={saving} className="bg-primary text-black font-bold rounded-xl gap-2 flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar alterações
                </Button>
                <Button variant="ghost" onClick={() => { setEditingBanner(null); setEditDraft({}); }} className="text-zinc-400 rounded-xl">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!bannerToDelete} onOpenChange={open => !open && setBannerToDelete(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Banner</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Tem certeza? O banner e a imagem serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl border-white/10 text-white hover:bg-white/5">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bannerToDelete && void remove(bannerToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
