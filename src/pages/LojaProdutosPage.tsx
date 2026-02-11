import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LojaFloatingNavIsland } from "@/components/navigation/LojaFloatingNavIsland";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, ImagePlus, X } from "lucide-react";

interface MarketplaceProduct {
  id: string;
  nome: string;
  descricao: string | null;
  image_url: string | null;
  preco_original: number;
  preco_desconto: number;
  ativo: boolean;
}

const LojaProdutosPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", preco: "", descricao: "" });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Produtos - Nexfit Lojista";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: store } = await supabase
        .from("marketplace_stores")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (!store) { setLoading(false); return; }
      setStoreId(store.id);

      const { data } = await supabase
        .from("marketplace_products")
        .select("id, nome, descricao, image_url, preco_original, preco_desconto, ativo")
        .eq("store_id", store.id)
        .order("nome");

      if (data) setProducts(data as MarketplaceProduct[]);
      setLoading(false);
    };
    void load();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Selecione um arquivo de imagem", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Imagem deve ter no máximo 5MB", variant: "destructive" });
        return;
      }
    }
    const remaining = 3 - imageFiles.length;
    const toAdd = files.slice(0, remaining);
    setImageFiles((prev) => [...prev, ...toAdd]);
    setImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!storeId) return;
    const nome = form.nome.trim();
    const preco = Number(form.preco.replace(",", "."));
    if (!nome || !preco || Number.isNaN(preco)) {
      toast({ title: "Preencha nome e preço válidos", variant: "destructive" });
      return;
    }
    setSaving(true);

    const uploadedUrls: string[] = [];

    // Upload images
    for (const file of imageFiles) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `products/${storeId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("marketplace_store_images")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast({ title: "Erro ao enviar imagem", description: uploadError.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("marketplace_store_images")
        .getPublicUrl(path);

      uploadedUrls.push(urlData.publicUrl);
    }

    const { data, error } = await (supabase as any)
      .from("marketplace_products")
      .insert({
        store_id: storeId,
        nome,
        descricao: form.descricao.trim() || null,
        image_url: uploadedUrls[0] ?? null,
        image_urls: uploadedUrls,
        preco_original: preco,
        preco_desconto: preco,
        ativo: true,
      })
      .select()
      .maybeSingle();

    if (error || !data) {
      toast({ title: "Erro ao cadastrar", description: error?.message, variant: "destructive" });
    } else {
      setProducts((p) => [...p, data as MarketplaceProduct]);
      setForm({ nome: "", preco: "", descricao: "" });
      clearImages();
      setShowForm(false);
      toast({ title: "Produto cadastrado!" });
    }
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-background px-4 pb-8 pt-6 safe-bottom-floating-nav">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Produtos</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Meus produtos</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Novo
        </Button>
      </header>

      {showForm && (
        <Card className="mb-4 border border-border/20 bg-card/80">
          <CardContent className="space-y-3 pt-5 text-sm">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Whey Protein 900g" className="bg-background/60" />
            </div>
            <div className="space-y-1.5">
              <Label>Preço (R$)</Label>
              <Input value={form.preco} onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))} placeholder="Ex: 199,90" className="bg-background/60" />
            </div>

            {/* Image upload - up to 3 */}
            <div className="space-y-1.5">
              <Label>Imagens do produto (até 3)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex gap-2 flex-wrap">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative inline-block">
                    <img
                      src={preview}
                      alt={`Preview ${i + 1}`}
                      className="h-24 w-24 rounded-lg border border-border/20 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {imageFiles.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/40 bg-background/60 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-[10px]">Adicionar</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do produto" className="min-h-[60px] bg-background/60" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); clearImages(); }}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : products.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <Card key={p.id} className="border border-border/20 bg-card/80">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.nome} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Sem img</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{p.nome}</p>
                  <p className="text-xs font-semibold text-primary">R$ {p.preco_desconto.toFixed(2)}</p>
                  <p className="text-[11px] text-muted-foreground">{p.ativo ? "Ativo" : "Inativo"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LojaFloatingNavIsland />
    </main>
  );
};

export default LojaProdutosPage;
