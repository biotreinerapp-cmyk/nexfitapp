import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Sparkles, Star, Zap, QrCode, Copy, CheckCircle2, Upload } from "lucide-react";
import { buildPixPayload } from "@/lib/pix";
import * as QRCodeLib from "qrcode";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  price_cents: number;
  features: string[];
  badge_label: string | null;
  sort_order: number;
}

interface PixConfig {
  pix_key: string;
  receiver_name: string;
}

const ICONS = [Zap, Star, Sparkles];

const LojaDestaquePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Payment dialog
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Destaque sua Loja - Nexfit";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      // Load offers
      const { data } = await supabase
        .from("highlight_offers")
        .select("id, title, description, duration_days, price_cents, features, badge_label, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setOffers((data as unknown as Offer[]) ?? []);

      // Load store id
      const { data: storeData } = await (supabase as any)
        .from("marketplace_stores")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (storeData) setStoreId(storeData.id);

      // Load platform pix config (no marketplace_store_id)
      const { data: pixData } = await (supabase as any)
        .from("pix_configs")
        .select("pix_key, receiver_name")
        .is("marketplace_store_id", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pixData?.pix_key) {
        setPixConfig({ pix_key: pixData.pix_key, receiver_name: pixData.receiver_name || "NEXFIT" });
      }

      setLoading(false);
    };
    void load();
  }, [user]);

  const handleSelectOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setCopied(false);
    setReceiptFile(null);

    if (pixConfig?.pix_key && offer.price_cents > 0) {
      const amount = offer.price_cents / 100;
      const payload = buildPixPayload({
        pixKey: pixConfig.pix_key,
        receiverName: pixConfig.receiver_name,
        amount,
        description: `Destaque ${offer.title}`,
        city: "BRASIL",
      });
      setPixPayload(payload);
      QRCodeLib.toDataURL(payload, { width: 256 }).then(setPixQrDataUrl).catch(() => setPixQrDataUrl(null));
    } else {
      setPixPayload(null);
      setPixQrDataUrl(null);
    }
  };

  const handleCopyPix = async () => {
    if (!pixPayload) return;
    await navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Código Pix copiado!" });
  };

  const handleSubmit = async () => {
    if (!user || !selectedOffer || !storeId) return;
    if (!receiptFile) {
      toast({ title: "Envie o comprovante", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Upload receipt
      const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const receiptPath = `${user.id}/${Date.now()}-highlight-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("payment_receipts")
        .upload(receiptPath, receiptFile, { upsert: true, contentType: receiptFile.type || undefined });
      if (uploadError) throw uploadError;

      // Insert request
      const { error: insertError } = await (supabase as any)
        .from("highlight_purchase_requests")
        .insert({
          store_id: storeId,
          offer_id: selectedOffer.id,
          user_id: user.id,
          amount_cents: selectedOffer.price_cents,
          status: "pending",
          receipt_path: receiptPath,
          pix_payload: pixPayload,
        });

      if (insertError) {
        await supabase.storage.from("payment_receipts").remove([receiptPath]);
        throw insertError;
      }

      toast({ title: "Solicitação enviada!", description: "Seu pedido de destaque será analisado em breve." });
      setSelectedOffer(null);
    } catch (error: any) {
      console.error("[LojaDestaque] Erro ao enviar solicitação", error);
      toast({ title: "Erro ao enviar", description: error?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (cents: number) => {
    const val = (cents / 100).toFixed(2).replace(".", ",");
    return `R$ ${val}`;
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-28 pt-8 safe-bottom-floating-nav">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

      <div className="relative z-10">
        <header className="mb-6 flex items-center gap-3">
          <BackIconButton onClick={() => navigate("/loja/financeiro")} />
          <div className="flex-1 text-center pr-10">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Marketing</p>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Destaque sua Loja</h1>
          </div>
        </header>

        {/* Hero text */}
        <div className="mb-8 text-center relative">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
            Apareça no banner principal e alcance <span className="text-white font-bold">milhares de alunos ativos</span> todos os dias.
          </p>
        </div>

        {/* Offers */}
        <div className="space-y-4">
          {offers.length === 0 ? (
            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
              <p className="text-sm text-zinc-400">Nenhum pacote disponível no momento.</p>
              <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wide">Em breve teremos novidades!</p>
            </div>
          ) : (
            offers.map((offer, idx) => {
              const Icon = ICONS[idx % ICONS.length];
              const isPopular = offer.badge_label?.toLowerCase().includes("popular");
              return (
                <div
                  key={offer.id}
                  className={`relative overflow-hidden rounded-[24px] border border-white/5 p-6 transition-all ${isPopular
                      ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-[0_0_30px_rgba(0,0,0,0.5)] border-primary/20"
                      : "bg-white/[0.03]"
                    } backdrop-blur-xl`}
                >
                  {offer.badge_label && (
                    <div className="absolute right-0 top-0">
                      <div className={`px-3 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${isPopular ? "bg-primary text-black" : "bg-white/10 text-white"
                        }`}>
                        {offer.badge_label}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isPopular ? "bg-primary/20 text-primary" : "bg-white/5 text-zinc-400"}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">{offer.title}</h3>
                      {offer.description && <p className="mt-1 text-xs text-zinc-400">{offer.description}</p>}
                    </div>
                  </div>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white drop-shadow-md">{formatPrice(offer.price_cents)}</span>
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">/ {offer.duration_days} dias</span>
                  </div>

                  {offer.features.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {offer.features.map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                          <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Check className="h-2.5 w-2.5 text-primary" />
                          </div>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    className={`mt-6 w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all ${isPopular
                        ? "bg-primary text-black hover:bg-primary/90 shadow-primary/20 hover:shadow-primary/40"
                        : "bg-white/10 text-white hover:bg-white/20 hover:text-white"
                      }`}
                    onClick={() => handleSelectOffer(offer)}
                  >
                    Contratar destaque
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-zinc-600">
          Ativação imediata após comprovação
        </p>
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!selectedOffer} onOpenChange={(open) => { if (!open) setSelectedOffer(null); }}>
        <DialogContent className="border-white/10 bg-black/90 backdrop-blur-xl text-white sm:max-w-md rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">Contratar Destaque</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {selectedOffer?.title} — {selectedOffer ? formatPrice(selectedOffer.price_cents) : ""} / {selectedOffer?.duration_days} dias
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* QR Code */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                <Label className="uppercase tracking-widest text-[10px] text-zinc-500">Pague via Pix</Label>
              </div>

              {pixQrDataUrl ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center space-y-3">
                  <div className="mx-auto h-40 w-40 rounded-xl bg-white p-2">
                    <img src={pixQrDataUrl} alt="QR Code Pix" className="h-full w-full" />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full gap-2 rounded-xl h-10 border-white/10 bg-white/5 hover:bg-white/10 text-white" onClick={handleCopyPix}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copiado!" : "Copiar código Pix"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                  <p className="text-xs text-zinc-500">QR Code indisponível. Entre em contato com o suporte.</p>
                </div>
              )}
            </div>

            {/* Receipt */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <Label htmlFor="highlight-receipt" className="uppercase tracking-widest text-[10px] text-zinc-500">Comprovante</Label>
              </div>
              <div className="relative">
                <Input
                  id="highlight-receipt"
                  type="file"
                  accept="image/*,.pdf"
                  className="h-12 pl-4 rounded-xl border-white/10 bg-white/5 file:text-white text-zinc-300"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <p className="text-[10px] text-zinc-500">Envie print/foto do comprovante de pagamento.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" className="rounded-xl h-12 text-zinc-400 hover:text-white" onClick={() => setSelectedOffer(null)}>Cancelar</Button>
            <Button type="button" className="rounded-xl h-12 bg-primary text-black font-bold uppercase tracking-widest hover:bg-primary/90" onClick={handleSubmit} disabled={submitting || !receiptFile}>
              {submitting ? "Enviando..." : "Enviar comprovante"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default LojaDestaquePage;
