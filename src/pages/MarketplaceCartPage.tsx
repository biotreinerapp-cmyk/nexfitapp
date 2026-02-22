import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useToast } from "@/hooks/use-toast";
import { BackIconButton } from "@/components/navigation/BackIconButton";
import { FloatingNavIsland } from "@/components/navigation/FloatingNavIsland";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, Ticket, ShieldCheck, Truck, MapPin, QrCode, Copy, CheckCircle2, Loader2, CreditCard, ExternalLink } from "lucide-react";
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
  const [storeShippingCost, setStoreShippingCost] = useState(0);
  const [couponsUsedThisMonth, setCouponsUsedThisMonth] = useState(0);
  const [vipCouponInput, setVipCouponInput] = useState("");
  const [isVipCouponApplied, setIsVipCouponApplied] = useState(false);
  const [gpsCity, setGpsCity] = useState<string | null>(null);
  const [fetchingGps, setFetchingGps] = useState(false);

  // Delivery
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Checkout / PIX
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "checkout">("cart");
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixConfig, setPixConfig] = useState<PixConfig | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "verifying" | null>(null);

  const hasCouponAccess = plan === "ADVANCE" || plan === "ELITE";

  useEffect(() => {
    document.title = "Carrinho - Nexfit Marketplace";
  }, []);



  useEffect(() => {
    const load = async () => {
      if (!user || !storeId) return;

      // Get store info
      const { data: storeData } = await (supabase as any)
        .from("marketplace_stores")
        .select("nome, city, shipping_cost")
        .eq("id", storeId)
        .maybeSingle();
      if (storeData) {
        setStoreName(storeData.nome);
        setStoreCity((storeData as any).city ?? null);
        setStoreShippingCost((storeData as any).shipping_cost ?? 0);
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

      // Fetch coupons used this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await (supabase as any)
        .from("marketplace_coupons")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("used_at", startOfMonth.toISOString());

      setCouponsUsedThisMonth(count || 0);

      // Attempt GPS check
      if ("geolocation" in navigator) {
        setFetchingGps(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            // Simplified reverse geocoding approach or just use a placeholder
            // In a real app, we'd call an API here. 
            // For now, let's assume if the user is 0,0 it's a test, otherwise we'd need an API.
            // I'll add a mock city based on existence of position for demo.
            setGpsCity(null); // Will fill if we had an API
          } catch (e) { } finally { setFetchingGps(false); }
        }, () => setFetchingGps(false));
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

    // Update cart activity
    if (orderId) {
      await (supabase as any)
        .from("marketplace_orders")
        .update({ last_cart_activity: new Date().toISOString() })
        .eq("id", orderId);
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, quantity: newQty, subtotal: newQty * item.unit_price } : i
      )
    );
  };

  const removeItem = async (item: CartItem) => {
    await (supabase as any).from("marketplace_order_items").delete().eq("id", item.id);

    // Update cart activity
    if (orderId) {
      await (supabase as any)
        .from("marketplace_orders")
        .update({ last_cart_activity: new Date().toISOString() })
        .eq("id", orderId);
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountAmount = selectedCoupon ? subtotal * (selectedCoupon.discount_percent / 100) : 0;

  // Logic Improvements:
  const isVipElite = selectedCoupon?.id === "VIPELITE";
  const isSameCity = (storeCity && deliveryCity.trim().toLowerCase() === storeCity.toLowerCase()) ||
    (storeCity && gpsCity && gpsCity.toLowerCase() === storeCity.toLowerCase());

  const freeShipping = (isVipElite && plan === "ELITE") || (plan === "ELITE" && isSameCity);
  const shippingCost = (plan === "FREE") ? storeShippingCost : (freeShipping ? 0 : storeShippingCost);

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
      if (!pixConfig?.pix_key) {
        throw new Error("A loja ainda não configurou uma chave PIX para receber pagamentos.");
      }

      // 1. Update order with address and totals, setting status as "pending"
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
          payment_method: "pix",
        })
        .eq("id", orderId);

      // 2. Local generation of the PIX payload
      const payloadString = buildPixPayload({
        pixKey: pixConfig.pix_key,
        merchantName: pixConfig.receiver_name,
        merchantCity: pixConfig.city || "BRASIL",
        amount: total,
        transactionId: `P${orderId.slice(0, 10).toUpperCase()}`.replace(/[^A-Z0-9]/g, "").substring(0, 25), // max 25 chars alphanumeric
        description: `Pedido ${storeName}`.substring(0, 40)
      });

      const qrCodeDataUrl = await QRCodeLib.toDataURL(payloadString, { width: 300, margin: 1 });

      setPixPayload(payloadString);
      setPixQrDataUrl(qrCodeDataUrl);
      setPaymentStatus("pending");

      // 3. Mark coupon as used
      if (selectedCoupon && !isVipCouponApplied) {
        await (supabase as any)
          .from("marketplace_coupons")
          .update({ used_at: new Date().toISOString(), order_id: orderId })
          .eq("id", selectedCoupon.id);
      }

    } catch (error: any) {
      console.error("Error confirming order:", error);
      toast({ title: "Erro ao gerar PIX", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!orderId) return;
    // P2P mock confirmation:
    setPaymentStatus("verifying");

    setTimeout(async () => {
      try {
        await (supabase as any)
          .from("marketplace_orders")
          .update({ status: "processing" }) // It goes to processing, store owner will confirm shipping
          .eq("id", orderId);

        toast({
          title: "Recebemos seu aviso!",
          description: "O vendedor irá conferir e preparar o seu pedido.",
        });

        navigate("/marketplace/pedidos");
      } catch (e: any) {
        toast({ title: "Erro na atualização", description: e.message, variant: "destructive" });
        setPaymentStatus("pending");
      }
    }, 1500);
  };


  const applyVipCoupon = () => {
    if (couponsUsedThisMonth >= 10) {
      toast({ title: "Limite atingido", description: "Você já usou seus 10 cupons mensais.", variant: "destructive" });
      return;
    }

    const code = vipCouponInput.toUpperCase().trim();
    if (code === "VIPADVANCE" && (plan === "ADVANCE" || plan === "ELITE")) {
      setSelectedCoupon({ id: "VIPADVANCE", discount_percent: 5, free_shipping: false });
      setIsVipCouponApplied(true);
      toast({ title: "VIP ADVANCE aplicado! 5% OFF" });
    } else if (code === "VIPELITE" && plan === "ELITE") {
      setSelectedCoupon({ id: "VIPELITE", discount_percent: 10, free_shipping: true });
      setIsVipCouponApplied(true);
      toast({ title: "VIP ELITE aplicado! 10% OFF + Frete Grátis" });
    } else {
      toast({ title: "Cupom inválido", description: "Verifique o código ou seu plano.", variant: "destructive" });
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
    <div className="min-h-screen bg-background bg-gradient-to-b from-primary/5 to-transparent px-4 pb-32 pt-6">
      <header className="mb-6 flex items-center gap-3">
        <BackIconButton to={checkoutStep === "checkout" ? undefined : `/marketplace/loja/${storeId}`} onClick={checkoutStep === "checkout" ? () => setCheckoutStep("cart") : undefined} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
            {checkoutStep === "checkout" ? "Finalização (Checkout)" : "Seu Carrinho"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{storeName}</h1>
        </div>
      </header>

      {items.length === 0 ? (
        <Card className="border-border/40 bg-card/50 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="py-12 text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Ticket className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">Seu carrinho está vazio.</p>
            <Button className="mt-6 rounded-xl font-bold shadow-md h-12 px-8" onClick={() => navigate(`/marketplace/loja/${storeId}`)}>
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
          vipCouponInput={vipCouponInput}
          setVipCouponInput={setVipCouponInput}
          applyVipCoupon={applyVipCoupon}
          couponsUsedThisMonth={couponsUsedThisMonth}
          shippingCost={shippingCost}
          gpsCity={gpsCity}
          fetchingGps={fetchingGps}
          plan={plan}
          isVipCouponApplied={isVipCouponApplied}
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
          shippingCost={shippingCost}
          paymentStatus={paymentStatus}
          onVerifyPayment={handleVerifyPayment}
        />
      )}
      <FloatingNavIsland />
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
  vipCouponInput, setVipCouponInput, applyVipCoupon, couponsUsedThisMonth,
  shippingCost, gpsCity, fetchingGps, plan, isVipCouponApplied
}: any) {
  return (
    <div className="space-y-4">
      {/* Items */}
      <div className="space-y-2">
        {items.map((item: CartItem) => (
          <Card key={item.id} className="border border-border/40 bg-card/60 backdrop-blur-sm shadow-sm hover:border-primary/40 transition-all rounded-2xl overflow-hidden group">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50 border border-border/50 group-hover:border-primary/20 transition-colors">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">Img</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">{item.product_name}</p>
                <p className="text-xs text-primary font-bold mt-1">R$ {item.unit_price.toFixed(2)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => removeItem(item)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1 bg-background/50 border border-border/50 rounded-lg p-0.5 shadow-inner">
                  <button onClick={() => updateQuantity(item, -1)} className="flex h-7 w-7 items-center justify-center rounded-md text-foreground hover:bg-background hover:shadow-sm transition-all focus:ring-2 focus:ring-primary/20">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item, 1)} className="flex h-7 w-7 items-center justify-center rounded-md text-foreground hover:bg-background hover:shadow-sm transition-all focus:ring-2 focus:ring-primary/20">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delivery */}
      <Card className="border-border/30 bg-gradient-to-br from-card/80 to-background backdrop-blur-md shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="space-y-4 py-5">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <div className="bg-primary/20 p-1.5 rounded-full">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            Endereço de entrega
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Endereço completo (Rua, Número, Bairro)"
              value={deliveryAddress}
              onChange={(e: any) => setDeliveryAddress(e.target.value)}
              className="bg-background/80 border-border/50 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
            <Input
              placeholder="Cidade"
              value={deliveryCity}
              onChange={(e: any) => setDeliveryCity(e.target.value)}
              className="bg-background/80 border-border/50 h-12 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
          </div>
          {storeCity && deliveryCity.trim() && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mt-2 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary font-medium leading-relaxed">
                {deliveryCity.trim().toLowerCase() === storeCity.toLowerCase()
                  ? "Sua cidade corresponde à da loja! Vantagens de frete reduzido ou grátis aplicadas."
                  : `A Loja está em ${storeCity}. O frete padrão será aplicado para sua região.`}
              </p>
            </div>
          )}
          {gpsCity && storeCity && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium pl-1">
              GPS Automático: {gpsCity}.
            </p>
          )}
        </CardContent>
      </Card>

      {hasCouponAccess && (
        <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-transparent shadow-sm rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          <CardContent className="py-5 space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Ticket className="h-4 w-4 text-primary" />
                Benefício Mensal VIP ({10 - couponsUsedThisMonth} restantes)
              </div>
              <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 uppercase font-bold tracking-wider">{plan}</Badge>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
                <Input
                  placeholder="VIPADVANCE ou VIPELITE"
                  value={vipCouponInput}
                  onChange={(e: any) => setVipCouponInput(e.target.value)}
                  className="bg-background/60 shadow-inner h-12 pl-10 text-sm border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl font-medium tracking-wide uppercase placeholder:normal-case"
                />
              </div>
              <Button size="lg" onClick={applyVipCoupon} className="font-bold shadow-md shadow-primary/20 rounded-xl h-12">
                Ativar
              </Button>
            </div>

            {isVipCouponApplied && selectedCoupon && (
              <div className="flex items-center gap-3 rounded-xl bg-primary/20 p-3 border border-primary/40 animate-in fade-in zoom-in duration-300">
                <div className="bg-primary rounded-full p-1.5 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-background" />
                </div>
                <div>
                  <p className="text-xs font-black text-primary uppercase tracking-wide">CUPOM {selectedCoupon.id} APLICADO</p>
                  <p className="text-[11px] font-semibold text-foreground/80 mt-0.5">Desconto especial: -{selectedCoupon.discount_percent}% OFF {selectedCoupon.free_shipping ? "e Frete Grátis" : ""}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Coupon Section */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="py-2 px-3">
          <button
            type="button"
            onClick={() => {
              if (!hasCouponAccess) {
                toast({ title: "Cupons indisponíveis", description: "Upgrade para Advance ou Elite.", variant: "destructive" });
                return;
              }
              setShowCoupons(!showCoupons);
            }}
            className="flex w-full items-center gap-3 p-3 text-sm hover:opacity-80 transition-opacity"
          >
            <div className={`p-1.5 rounded-full ${selectedCoupon ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              <Ticket className="h-4 w-4" />
            </div>
            <span className="font-bold text-foreground">
              {selectedCoupon ? `Cupom especial de ${selectedCoupon.discount_percent}% ativo` : "Adicionar outro cupom de desconto"}
            </span>
            {!hasCouponAccess && <Badge variant="secondary" className="ml-auto text-[10px] rounded-md">Premium</Badge>}
          </button>

          {showCoupons && hasCouponAccess && (
            <div className="px-1 pb-3 pt-1 space-y-2 animate-in slide-in-from-top-2 duration-200">
              {coupons.length === 0 ? (
                <div className="bg-muted p-3 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground font-medium">Você não possui outros cupons disponíveis no momento.</p>
                </div>
              ) : (
                coupons.map((c: Coupon) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedCoupon(selectedCoupon?.id === c.id ? null : c); setShowCoupons(false); }}
                    className={`flex w-full items-center gap-3 border p-4 text-left text-sm transition-all focus:outline-none rounded-xl shadow-sm ${selectedCoupon?.id === c.id ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border/50 bg-background/50 hover:border-primary/40 hover:bg-background"
                      }`}
                  >
                    <div className={selectedCoupon?.id === c.id ? "text-primary" : "text-muted-foreground"}>
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-black text-foreground block">{c.discount_percent}% OFF em toda compra</span>
                      {c.free_shipping && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary mt-0.5">
                          <Truck className="h-3 w-3" /> Mais frete grátis nacional
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-sm rounded-2xl">
        <CardContent className="space-y-3 py-5 px-5">
          <div className="flex justify-between text-muted-foreground font-medium text-sm">
            <span>Subtotal dos Produtos</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {selectedCoupon && (
            <div className="flex justify-between text-primary font-bold text-sm">
              <span>Desconto ({selectedCoupon.discount_percent}%)</span>
              <span>- R$ {discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground font-medium text-sm">
            <span>Frete e Manuseio</span>
            <span>{shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : "Grátis"}</span>
          </div>
          <div className="flex justify-between border-t border-border/50 pt-4 mt-2 text-lg font-black tracking-tight text-foreground">
            <span>Total da Compra</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full h-14 rounded-2xl text-lg font-black bg-gradient-to-r from-primary to-green-500 hover:from-primary/90 hover:to-green-500/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all border-0 uppercase tracking-wide gap-2 text-primary-foreground"
        onClick={onProceed}
        disabled={items.length === 0}
      >
        Ir para Confirmação • R$ {total.toFixed(2)}
      </Button>
    </div>
  );
}

/* ============ Checkout View ============ */
function CheckoutView({
  items, subtotal, discountAmount, selectedCoupon, freeShipping, total,
  deliveryAddress, deliveryCity,
  pixPayload, pixQrDataUrl, copied, onCopyPix, onConfirm, submitting, pixConfig,
  shippingCost, paymentStatus, onVerifyPayment
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
              <span>Frete</span><span>{shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : "Grátis"}</span>
            </div>
            <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border/50">
              <span>Total</span><span>R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PIX Payment Direct Interface */}
      {pixPayload && paymentStatus !== "paid" ? (
        <Card className="border-primary/30 bg-card/30 overflow-hidden shadow-xl shadow-primary/5">
          <div className="bg-primary px-4 py-2 text-center text-primary-foreground font-bold">
            Pagamento Direto via PIX
          </div>
          <CardContent className="py-6 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Copie a chave para pagar no app do seu banco ou escaneie o código abaixo:</p>
            </div>

            {pixQrDataUrl && (
              <div className="mx-auto bg-white p-3 rounded-xl shadow-md inline-block">
                <img src={pixQrDataUrl} alt="QR Code Pix" className="h-44 w-44 object-contain" />
              </div>
            )}

            <Button size="lg" className="w-full font-bold shadow-md shadow-primary/20 gap-2 h-14" onClick={onCopyPix}>
              {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              {copied ? "Link Copiado com sucesso!" : "Copiar Chave Pix Copia e Cola"}
            </Button>

            <div className="text-xs text-left bg-muted/50 p-3 rounded-lg mt-4 text-muted-foreground">
              * Como este é um PIX pago diretamente na conta da Loja, não temos validação automática da transação no momento. Ao finalizar sua transferência, informe o pagamento abaixo.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Payment Status & Actions */}
      <div className="space-y-3 pt-2">
        {!pixPayload && (
          <Button
            className="w-full text-lg h-14 font-bold"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Gerando PIX..." : "Gerar Chave PIX"}
          </Button>
        )}

        {paymentStatus === "pending" && (
          <Button
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white gap-2 font-bold"
            onClick={onVerifyPayment}
          >
            <CheckCircle2 className="h-4 w-4" />
            Já realizei o pagamento no Banco
          </Button>
        )}

        {paymentStatus === "verifying" && (
          <Button className="w-full h-12" disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Atualizando o pedido...
          </Button>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-2 border-t border-border/20 pt-4 opacity-70">
        <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-500">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Pagamento Blindado
          </p>
        </div>
      </div>
    </div>
  );
}
