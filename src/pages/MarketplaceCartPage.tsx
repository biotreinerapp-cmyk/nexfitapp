import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useToast } from "@/hooks/use-toast";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, Ticket, ShieldCheck, Truck, MapPin, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { buildPixPayload } from "@/lib/pix";
import * as QRCodeLib from "qrcode";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_name: string;
  product_image: string | null;
}

interface Coupon {
  id: string;
  discount_percent: number;
  free_shipping: boolean;
}

interface PixConfig {
  pix_key: string;
  receiver_name: string;
  city: string;
}

export default function MarketplaceCartPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { user } = useAuth();
  const { plan } = useUserPlan();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [orderId, setOrderId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [storeCity, setStoreCity] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showCoupons, setShowCoupons] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delivery
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Checkout / PIX
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "checkout">("cart");
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null);

  const hasCouponAccess = plan === "ADVANCE" || plan === "ELITE";

  useEffect(() => {
    document.title = "Carrinho - Nexfit Marketplace";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user || !storeId) return;

      // Get store info
      const { data: storeData } = await supabase
        .from("marketplace_stores")
        .select("nome, city")
        .eq("id", storeId)
        .maybeSingle();
      if (storeData) {
        setStoreName(storeData.nome);
        setStoreCity((storeData as any).city ?? null);
      }

      // Get cart order
      const { data: order } = await (supabase as any)
        .from("marketplace_orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("store_id", storeId)
        .eq("status", "cart")
        .maybeSingle();

      if (!order) {
        setLoading(false);
        return;
      }

      setOrderId(order.id);

      // Get cart items (product info denormalized in order_items)
      const { data: cartItems } = await (supabase as any)
        .from("marketplace_order_items")
        .select("id, product_id, quantity, unit_price, subtotal, product_name, product_image")
        .eq("order_id", order.id);

      if (cartItems && cartItems.length > 0) {
        setItems(cartItems as CartItem[]);
      }

      // Load available coupons
      if (hasCouponAccess) {
        const { data: couponData } = await (supabase as any)
          .from("marketplace_coupons")
          .select("id, discount_percent, free_shipping")
          .eq("user_id", user.id)
          .is("used_at", null)
          .gte("expires_at", new Date().toISOString())
          .limit(10);

        if (couponData) setCoupons(couponData);
      }

      // Load store pix config
      const { data: pixData } = await (supabase as any)
        .from("pix_configs")
        .select("pix_key, receiver_name, bank_name")
        .or(`store_id.eq.${storeId},marketplace_store_id.eq.${storeId}`)
        .maybeSingle();

      if (pixData?.pix_key) {
        setPixConfig({
          pix_key: pixData.pix_key,
          receiver_name: pixData.receiver_name || storeName,
          city: (storeData as any)?.city || "BRASIL",
        });
      }

      setLoading(false);
    };
    void load();
  }, [user, storeId, hasCouponAccess]);

  const updateQuantity = async (item: CartItem, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return removeItem(item);

    await (supabase as any)
      .from("marketplace_order_items")
      .update({ quantity: newQty, subtotal: newQty * item.unit_price })
      .eq("id", item.id);

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, quantity: newQty, subtotal: newQty * item.unit_price } : i
      )
    );
  };

  const removeItem = async (item: CartItem) => {
    await (supabase as any).from("marketplace_order_items").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountAmount = selectedCoupon ? subtotal * (selectedCoupon.discount_percent / 100) : 0;
  const isSameCity = storeCity && deliveryCity.trim().toLowerCase() === storeCity.toLowerCase();
  const freeShipping = selectedCoupon?.free_shipping && isSameCity;
  const shippingCost = freeShipping ? 0 : 0; // Shipping "a combinar" when not free
  const total = subtotal - discountAmount + shippingCost;

  const handleProceedToCheckout = () => {
    if (!deliveryAddress.trim()) {
      toast({ title: "Informe o endereço de entrega", variant: "destructive" });
      return;
    }
    if (!deliveryCity.trim()) {
      toast({ title: "Informe a cidade", variant: "destructive" });
      return;
    }

    // Generate PIX payload
    if (pixConfig?.pix_key && total > 0) {
      const payload = buildPixPayload({
        pixKey: pixConfig.pix_key,
        receiverName: pixConfig.receiver_name,
        amount: total,
        description: `Pedido ${storeName}`,
        city: pixConfig.city,
      });
      setPixPayload(payload);
      QRCodeLib.toDataURL(payload, { width: 256 }).then(setPixQrDataUrl).catch(() => {});
    }

    setCheckoutStep("checkout");
  };

  const handleCopyPix = async () => {
    if (!pixPayload) return;
    await navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Código Pix copiado!" });
  };

  const handleConfirmOrder = async () => {
    if (!orderId || !user || !storeId) return;
    setSubmitting(true);

    try {
      await (supabase as any)
        .from("marketplace_orders")
        .update({
          subtotal,
          discount_amount: discountAmount,
          shipping_cost: shippingCost,
          total,
          status: "pending",
          coupon_id: selectedCoupon?.id ?? null,
          delivery_address: deliveryAddress.trim(),
          delivery_city: deliveryCity.trim(),
          pix_payload: pixPayload,
        })
        .eq("id", orderId);

      // Mark coupon as used
      if (selectedCoupon) {
        await (supabase as any)
          .from("marketplace_coupons")
          .update({ used_at: new Date().toISOString(), order_id: orderId })
          .eq("id", selectedCoupon.id);
      }

      toast({ title: "Pedido enviado!", description: "Aguarde a confirmação da loja." });
      navigate(`/marketplace/loja/${storeId}`);
    } catch {
      toast({ title: "Erro ao finalizar pedido", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando carrinho...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-8 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <BackIconButton to={checkoutStep === "checkout" ? undefined : `/marketplace/loja/${storeId}`} onClick={checkoutStep === "checkout" ? () => setCheckoutStep("cart") : undefined} />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {checkoutStep === "checkout" ? "Checkout" : "Carrinho"}
          </p>
          <h1 className="text-xl font-semibold text-foreground">{storeName}</h1>
        </div>
      </header>

      {items.length === 0 ? (
        <Card className="border-border/50 bg-card/30">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Seu carrinho está vazio.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(`/marketplace/loja/${storeId}`)}>
              Voltar à loja
            </Button>
          </CardContent>
        </Card>
      ) : checkoutStep === "cart" ? (
        <CartView
          items={items}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          hasCouponAccess={hasCouponAccess}
          coupons={coupons}
          selectedCoupon={selectedCoupon}
          setSelectedCoupon={setSelectedCoupon}
          showCoupons={showCoupons}
          setShowCoupons={setShowCoupons}
          subtotal={subtotal}
          discountAmount={discountAmount}
          freeShipping={!!freeShipping}
          total={total}
          deliveryCity={deliveryCity}
          setDeliveryCity={setDeliveryCity}
          deliveryAddress={deliveryAddress}
          setDeliveryAddress={setDeliveryAddress}
          storeCity={storeCity}
          onProceed={handleProceedToCheckout}
          toast={toast}
        />
      ) : (
        <CheckoutView
          items={items}
          subtotal={subtotal}
          discountAmount={discountAmount}
          selectedCoupon={selectedCoupon}
          freeShipping={!!freeShipping}
          total={total}
          deliveryAddress={deliveryAddress}
          deliveryCity={deliveryCity}
          pixPayload={pixPayload}
          pixQrDataUrl={pixQrDataUrl}
          copied={copied}
          onCopyPix={handleCopyPix}
          onConfirm={handleConfirmOrder}
          submitting={submitting}
          pixConfig={pixConfig}
        />
      )}
    </div>
  );
}

/* ============ Cart View ============ */
function CartView({
  items, updateQuantity, removeItem,
  hasCouponAccess, coupons, selectedCoupon, setSelectedCoupon, showCoupons, setShowCoupons,
  subtotal, discountAmount, freeShipping, total,
  deliveryCity, setDeliveryCity, deliveryAddress, setDeliveryAddress,
  storeCity, onProceed, toast,
}: any) {
  return (
    <div className="space-y-4">
      {/* Items */}
      <div className="space-y-2">
        {items.map((item: CartItem) => (
          <Card key={item.id} className="border-border/50 bg-card/30">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">Img</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.product_name}</p>
                <p className="text-xs text-primary font-semibold">R$ {item.unit_price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item, -1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border/50 text-muted-foreground hover:text-foreground">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-foreground">{item.quantity}</span>
                <button onClick={() => updateQuantity(item, 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border/50 text-muted-foreground hover:text-foreground">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => removeItem(item)} className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delivery */}
      <Card className="border-border/50 bg-card/30">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Endereço de entrega
          </div>
          <div className="space-y-2">
            <Input placeholder="Endereço completo" value={deliveryAddress} onChange={(e: any) => setDeliveryAddress(e.target.value)} />
            <Input placeholder="Cidade" value={deliveryCity} onChange={(e: any) => setDeliveryCity(e.target.value)} />
          </div>
          {storeCity && deliveryCity.trim() && (
            <p className={`text-xs ${deliveryCity.trim().toLowerCase() === storeCity.toLowerCase() ? "text-primary" : "text-muted-foreground"}`}>
              {deliveryCity.trim().toLowerCase() === storeCity.toLowerCase()
                ? "✓ Mesma cidade da loja — frete grátis disponível com cupom Elite"
                : `Loja em ${storeCity} — frete a combinar`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Coupon Section */}
      <Card className="border-border/50 bg-card/30">
        <CardContent className="py-4">
          <button
            type="button"
            onClick={() => {
              if (!hasCouponAccess) {
                toast({ title: "Cupons indisponíveis", description: "Upgrade para Advance ou Elite.", variant: "destructive" });
                return;
              }
              setShowCoupons(!showCoupons);
            }}
            className="flex w-full items-center gap-2 text-sm"
          >
            <Ticket className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">
              {selectedCoupon ? `Cupom ${selectedCoupon.discount_percent}% aplicado` : "Usar cupom de desconto"}
            </span>
            {!hasCouponAccess && <Badge variant="secondary" className="ml-auto text-[10px]">Premium</Badge>}
          </button>

          {showCoupons && hasCouponAccess && (
            <div className="mt-3 space-y-2">
              {coupons.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum cupom disponível.</p>
              ) : (
                coupons.map((c: Coupon) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedCoupon(selectedCoupon?.id === c.id ? null : c); setShowCoupons(false); }}
                    className={`flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
                      selectedCoupon?.id === c.id ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{c.discount_percent}% OFF</span>
                    {c.free_shipping && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Truck className="h-3 w-3" /> Frete grátis
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-border/50 bg-card/30">
        <CardContent className="space-y-2 py-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {selectedCoupon && (
            <div className="flex justify-between text-primary">
              <span>Desconto ({selectedCoupon.discount_percent}%)</span>
              <span>- R$ {discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Frete</span>
            <span>{freeShipping ? "Grátis" : "A combinar"}</span>
          </div>
          <div className="flex justify-between border-t border-border/50 pt-2 text-base font-bold text-foreground">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={onProceed} disabled={items.length === 0}>
        Ir para pagamento • R$ {total.toFixed(2)}
      </Button>
    </div>
  );
}

/* ============ Checkout View ============ */
function CheckoutView({
  items, subtotal, discountAmount, selectedCoupon, freeShipping, total,
  deliveryAddress, deliveryCity,
  pixPayload, pixQrDataUrl, copied, onCopyPix, onConfirm, submitting, pixConfig,
}: any) {
  return (
    <div className="space-y-4">
      {/* Order summary */}
      <Card className="border-border/50 bg-card/30">
        <CardContent className="space-y-2 py-4 text-sm">
          <p className="font-semibold text-foreground mb-2">Resumo do pedido</p>
          {items.map((item: CartItem) => (
            <div key={item.id} className="flex justify-between text-muted-foreground">
              <span>{item.quantity}x {item.product_name}</span>
              <span>R$ {item.subtotal.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-border/50 pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {selectedCoupon && (
              <div className="flex justify-between text-primary">
                <span>Desconto ({selectedCoupon.discount_percent}%)</span>
                <span>- R$ {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Frete</span><span>{freeShipping ? "Grátis" : "A combinar"}</span>
            </div>
            <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border/50">
              <span>Total</span><span>R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery */}
      <Card className="border-border/50 bg-card/30">
        <CardContent className="py-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
            <MapPin className="h-4 w-4 text-primary" /> Entrega
          </div>
          <p className="text-muted-foreground">{deliveryAddress}</p>
          <p className="text-muted-foreground">{deliveryCity}</p>
        </CardContent>
      </Card>

      {/* PIX Payment */}
      {pixConfig && pixPayload ? (
        <Card className="border-primary/30 bg-card/30">
          <CardContent className="py-5 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
              <QrCode className="h-5 w-5 text-primary" /> Pague via Pix
            </div>
            {pixQrDataUrl && (
              <img src={pixQrDataUrl} alt="QR Code Pix" className="mx-auto h-48 w-48 rounded-lg" />
            )}
            <p className="text-xs text-muted-foreground">Escaneie o QR Code ou copie o código abaixo</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={onCopyPix}>
              {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar código Pix"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 bg-card/30">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              O pagamento será combinado diretamente com a loja.
            </p>
          </CardContent>
        </Card>
      )}

      <Button className="w-full" size="lg" onClick={onConfirm} disabled={submitting}>
        {submitting ? "Finalizando..." : "Confirmar Pedido"}
      </Button>
    </div>
  );
}
