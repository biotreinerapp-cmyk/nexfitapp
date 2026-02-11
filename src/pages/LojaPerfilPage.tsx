import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Store, Pencil, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StoreImageEditor } from "@/components/marketplace/StoreImageEditor";

interface MarketplaceStore {
  id: string;
  nome: string;
  store_type: string;
  descricao: string | null;
  city: string | null;
  profile_image_url: string | null;
  banner_image_url: string | null;
}

interface PixConfigState {
  pix_key: string;
  receiver_name: string;
  bank_name: string;
}

const LojaPerfilPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [store, setStore] = useState<MarketplaceStore | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nome: "", store_type: "", descricao: "", city: "" });
  const [saving, setSaving] = useState(false);
  const [pixForm, setPixForm] = useState<PixConfigState>({ pix_key: "", receiver_name: "", bank_name: "" });
  const [savingPix, setSavingPix] = useState(false);
  const [editingPix, setEditingPix] = useState(false);

  useEffect(() => {
    document.title = "Perfil - Nexfit Lojista";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await (supabase as any)
        .from("marketplace_stores")
        .select("id, nome, store_type, descricao, city, profile_image_url, banner_image_url")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (data) {
        setStore(data as MarketplaceStore);
        setForm({ nome: data.nome, store_type: data.store_type, descricao: data.descricao || "", city: data.city || "" });

        // Load pix config
        const { data: pix } = await (supabase as any)
          .from("pix_configs")
          .select("pix_key, receiver_name, bank_name")
          .eq("marketplace_store_id", data.id)
          .maybeSingle();
        if (pix) {
          setPixForm({ pix_key: pix.pix_key || "", receiver_name: pix.receiver_name || "", bank_name: pix.bank_name || "" });
        }
      }
    };
    void load();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const handleSave = async () => {
    if (!store || !form.nome.trim()) return;
    setSaving(true);

    const { error } = await (supabase as any)
      .from("marketplace_stores")
      .update({
        nome: form.nome.trim(),
        store_type: form.store_type,
        descricao: form.descricao.trim() || null,
        city: form.city.trim() || null,
      })
      .eq("id", store.id);

    // Also update internal stores table
    await supabase
      .from("stores")
      .update({
        name: form.nome.trim(),
        store_type: form.store_type,
        description: form.descricao.trim() || null,
      })
      .eq("name", store.nome);

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    setStore((prev) => prev ? { ...prev, nome: form.nome.trim(), store_type: form.store_type, descricao: form.descricao.trim() || null, city: form.city.trim() || null } : prev);
    setEditing(false);
    toast({ title: "Perfil da loja atualizado" });
  };

  const handleSavePix = async () => {
    if (!store) return;
    setSavingPix(true);

    // Upsert pix config
    const { data: existing } = await (supabase as any)
      .from("pix_configs")
      .select("id")
      .eq("marketplace_store_id", store.id)
      .maybeSingle();

    if (existing) {
      await (supabase as any)
        .from("pix_configs")
        .update({
          pix_key: pixForm.pix_key.trim() || null,
          receiver_name: pixForm.receiver_name.trim() || null,
          bank_name: pixForm.bank_name.trim() || null,
        })
        .eq("id", existing.id);
    } else {
      await (supabase as any)
        .from("pix_configs")
        .insert({
          marketplace_store_id: store.id,
          pix_key: pixForm.pix_key.trim() || null,
          receiver_name: pixForm.receiver_name.trim() || null,
          bank_name: pixForm.bank_name.trim() || null,
        });
    }

    setSavingPix(false);
    setEditingPix(false);
    toast({ title: "Configuração Pix salva" });
  };

  return (
    <main className="min-h-screen bg-background px-4 pb-8 pt-6 safe-bottom-floating-nav">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Perfil</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Minha loja</h1>
      </header>

      <Card className="border border-border/20 bg-card/80">
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10">
            {store?.profile_image_url ? (
              <img src={store.profile_image_url} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{store?.nome || "Loja"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          {!editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {editing && store && (
        <Card className="mt-4 border border-border/20 bg-card/80">
          <CardContent className="space-y-4 py-5">
            {/* Image editor */}
            <StoreImageEditor
              storeId={store.id}
              currentProfileUrl={store.profile_image_url}
              currentBannerUrl={store.banner_image_url}
              onImagesUpdated={(p, b) => {
                setStore((prev) => prev ? { ...prev, profile_image_url: p, banner_image_url: b } : prev);
              }}
            />

            <div className="space-y-2">
              <Label>Nome da Loja</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.store_type} onValueChange={(v) => setForm((f) => ({ ...f, store_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="suplementos">Suplementos</SelectItem>
                  <SelectItem value="artigos_esportivos">Artigos Esportivos</SelectItem>
                  <SelectItem value="roupas_fitness">Roupas Fitness</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição da loja (opcional)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Cidade da loja (para cálculo de frete)"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.nome.trim()}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pix Config */}
      <Card className="mt-4 border border-border/20 bg-card/80">
        <CardContent className="py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <p className="font-semibold text-foreground">Configuração Pix</p>
            </div>
            {!editingPix && (
              <Button size="sm" variant="ghost" onClick={() => setEditingPix(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          {!editingPix ? (
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Chave: {pixForm.pix_key || "Não configurada"}</p>
              <p className="text-muted-foreground">Nome: {pixForm.receiver_name || "—"}</p>
              <p className="text-muted-foreground">Banco: {pixForm.bank_name || "—"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Chave Pix</Label>
                <Input value={pixForm.pix_key} onChange={(e) => setPixForm((f) => ({ ...f, pix_key: e.target.value }))} placeholder="CPF, e-mail, telefone ou chave aleatória" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nome do recebedor</Label>
                <Input value={pixForm.receiver_name} onChange={(e) => setPixForm((f) => ({ ...f, receiver_name: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Banco</Label>
                <Input value={pixForm.bank_name} onChange={(e) => setPixForm((f) => ({ ...f, bank_name: e.target.value }))} placeholder="Ex: Nubank, Inter" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingPix(false)} disabled={savingPix}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSavePix} disabled={savingPix || !pixForm.pix_key.trim()}>
                  {savingPix ? "Salvando…" : "Salvar Pix"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="mt-6 w-full border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" /> Sair da conta
      </Button>

      <LojaFloatingNavIsland />
    </main>
  );
};

export default LojaPerfilPage;
