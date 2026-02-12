import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface HighlightOffer {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  price_cents: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  badge_label: string | null;
}

export function HighlightOffersAdminPanel() {
  const { toast } = useToast();
  const [offers, setOffers] = useState<HighlightOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HighlightOffer | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration_days: 7,
    price_cents: 0,
    features: "",
    badge_label: "",
    is_active: true,
    sort_order: 0,
  });

  const loadOffers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("highlight_offers")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar ofertas", description: error.message, variant: "destructive" });
    } else {
      setOffers((data as unknown as HighlightOffer[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { void loadOffers(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ title: "", description: "", duration_days: 7, price_cents: 0, features: "", badge_label: "", is_active: true, sort_order: 0 });
  };

  const openEdit = (o: HighlightOffer) => {
    setEditing(o);
    setForm({
      title: o.title,
      description: o.description ?? "",
      duration_days: o.duration_days,
      price_cents: o.price_cents,
      features: o.features.join("\n"),
      badge_label: o.badge_label ?? "",
      is_active: o.is_active,
      sort_order: o.sort_order,
    });
  };

  const handleSave = async () => {
    const featuresArr = form.features.split("\n").map(f => f.trim()).filter(Boolean);
    const payload = {
      title: form.title,
      description: form.description || null,
      duration_days: form.duration_days,
      price_cents: form.price_cents,
      features: featuresArr,
      badge_label: form.badge_label || null,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };

    if (editing) {
      const { error } = await supabase.from("highlight_offers").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Oferta atualizada!" });
    } else {
      const { error } = await supabase.from("highlight_offers").insert(payload);
      if (error) { toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Oferta criada!" });
    }

    resetForm();
    void loadOffers();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("highlight_offers").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Oferta excluída" });
    void loadOffers();
  };

  const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-4">
      {/* Form */}
      <Card className="border border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {editing ? "Editar oferta" : "Nova oferta de destaque"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Pacote Semanal" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Selo / Badge</Label>
              <Input value={form.badge_label} onChange={e => setForm(p => ({ ...p, badge_label: e.target.value }))} placeholder="Ex: Mais Popular" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Breve descrição do pacote" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Duração (dias)</Label>
              <Input type="number" value={form.duration_days} onChange={e => setForm(p => ({ ...p, duration_days: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preço (centavos)</Label>
              <Input type="number" value={form.price_cents} onChange={e => setForm(p => ({ ...p, price_cents: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ordem</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Benefícios (um por linha)</Label>
            <Textarea value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))} rows={3} placeholder={"Banner no dashboard\nPrioridade no marketplace\nRelatório de impressões"} />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
            <Label className="text-xs">Ativa</Label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!form.title.trim()}>
              {editing ? "Salvar alterações" : <><Plus className="mr-1 h-4 w-4" /> Criar oferta</>}
            </Button>
            {editing && <Button size="sm" variant="ghost" onClick={resetForm}>Cancelar</Button>}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando ofertas…</p>
      ) : offers.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma oferta cadastrada. Crie a primeira acima.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {offers.map(o => (
            <Card key={o.id} className="border border-border/40 bg-card/60">
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{o.title}</p>
                    {o.badge_label && <span className="mt-0.5 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">{o.badge_label}</span>}
                  </div>
                  <p className="whitespace-nowrap text-sm font-bold text-primary">{formatPrice(o.price_cents)}</p>
                </div>
                {o.description && <p className="text-xs text-muted-foreground">{o.description}</p>}
                <p className="text-[10px] text-muted-foreground">{o.duration_days} dias · {o.is_active ? "Ativa" : "Inativa"}</p>
                {o.features.length > 0 && (
                  <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                    {o.features.map((f, i) => <li key={i}>• {f}</li>)}
                  </ul>
                )}
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(o)}>
                    <Pencil className="mr-1 h-3 w-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleDelete(o.id)}>
                    <Trash2 className="mr-1 h-3 w-3" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
