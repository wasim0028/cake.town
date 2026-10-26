import { useRouter } from "expo-router";
import { CreditCard, HandCoins, MapPin, Plus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DELIVERY_SLOTS, describeCustomization, formatINR, TIMEZONE, type Cart, type CheckoutResponse, type Quote } from "@caketown/shared";
import { AddressForm } from "@/components/AddressForm";
import { RazorpaySheet, type PayResult } from "@/components/RazorpaySheet";
import { Row, Screen } from "@/components/Screen";
import { Button, Card, Empty, Field, FormError, H, OptionList, Press, Skeleton, T } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { syncCartToServer } from "@/lib/cart-sync";
import { formatSlot } from "@/lib/delivery";
import { haptic } from "@/lib/haptics";
import { useAddresses, useConfig } from "@/lib/queries";
import { toast, useAuth, useCart } from "@/lib/stores";
import { radius, useTheme } from "@/lib/theme";

function nextDays(n = 7) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE });
  const label = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", timeZone: TIMEZONE });
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() + i * 86400_000);
    return { date: fmt.format(d), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : label.format(d) };
  });
}
const slotOpen = (date: string, slot: string, prep: number) => new Date(`${date}T${slot.split("-")[0]}:00+05:30`).getTime() >= Date.now() + prep * 3600_000;

export default function Checkout() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const addresses = useAddresses(Boolean(user));
  const config = useConfig();

  const [cart, setCart] = useState<Cart | null>(null);
  const [syncError, setSyncError] = useState<string>();
  const [addressId, setAddressId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState<string>();
  const [slot, setSlot] = useState<string>();
  const [payment, setPayment] = useState<"razorpay" | "cod">("cod");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string>();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<CheckoutResponse | null>(null);
  const [paying, setPaying] = useState<CheckoutResponse | null>(null);

  useEffect(() => {
    if (!user) router.replace({ pathname: "/login", params: { next: "/checkout" } });
  }, [user, router]);

  useEffect(() => {
    if (!user || !items.length) return;
    syncCartToServer()
      .then((r) => {
        setCart(r.cart);
        if (r.rejected.length) toast("Some items were removed", { body: r.rejected.map((x) => `${x.item.name}: ${x.message}`).join("\n") });
      })
      .catch((e) => setSyncError(e instanceof ApiError ? e.message : "Couldn't load your cart."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, JSON.stringify(items.map((i) => [i.key, i.quantity]))]);

  useEffect(() => {
    if (config.data?.payments.razorpay) setPayment("razorpay");
  }, [config.data]);
  useEffect(() => {
    const list = addresses.data;
    if (list?.length && !addressId) setAddressId((list.find((a) => a.isDefault) ?? list[0])!.id);
    if (list && !list.length) setAdding(true);
  }, [addresses.data, addressId]);

  const quote = useQuery({
    queryKey: ["quote", applied, cart?.subtotal],
    queryFn: () => api.post<{ quote: Quote }>("/checkout/quote", applied ? { couponCode: applied } : {}).then((r) => r.quote),
    enabled: Boolean(cart?.items.length),
  });

  const prep = useMemo(() => Math.max(0, ...(cart?.items.map((i) => i.preparationHours) ?? [0])), [cart]);
  const days = useMemo(() => nextDays(), []);
  useEffect(() => {
    if (!cart || date) return;
    const first = days.find((d) => DELIVERY_SLOTS.some((s) => slotOpen(d.date, s, prep)));
    if (first) setDate(first.date);
  }, [cart, days, date, prep]);
  useEffect(() => {
    if (date && (!slot || !slotOpen(date, slot, prep))) setSlot(DELIVERY_SLOTS.find((s) => slotOpen(date, s, prep)));
  }, [date, prep, slot]);

  const finish = (orderId: string) => {
    haptic.success();
    clear();
    qc.invalidateQueries({ queryKey: ["orders"] });
    router.replace({ pathname: "/order/[id]", params: { id: orderId, placed: "1" } });
  };

  const onPaid = (r: PayResult) => {
    const res = paying!;
    setPaying(null);
    if (r.status === "paid" || r.status === "processing") return finish(res.order.id);
    setPending(res);
    setPlacing(false);
    haptic.warn();
    if (r.status === "failed") setError(r.message);
  };

  const place = async () => {
    setError(undefined);
    if (!addressId) return setError("Add a delivery address first.");
    if (!date || !slot) return setError("Choose a delivery day and time.");
    setPlacing(true);
    if (pending) return setPaying(pending);
    try {
      const res = await api.post<CheckoutResponse>("/orders", { addressId, deliveryDate: date, deliverySlot: slot, paymentMethod: payment, ...(applied ? { couponCode: applied } : {}) });
      if (res.razorpay) return setPaying(res);
      finish(res.order.id);
    } catch (e) {
      setPlacing(false);
      haptic.warn();
      if (e instanceof ApiError) {
        setError(e.message);
        if (e.code === "PAYMENTS_DISABLED") setPayment("cod");
        if (e.code === "COUPON_INVALID") setApplied(undefined);
      } else setError("Couldn't place the order. Try again.");
    }
  };

  if (!items.length && !pending) {
    return <Empty art={["Butter Croissant", "pastries"]} title="Your cart is empty" body="Add something from the menu first." action={<Button title="Browse the menu" onPress={() => router.navigate("/(tabs)/shop")} />} />;
  }

  const q = quote.data;
  const unavailable = cart?.items.filter((i) => !i.available) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen header={false} contentStyle={{ paddingBottom: 150 + insets.bottom }}>
        {syncError ? <FormError message={syncError} /> : null}

        {/* address */}
        <View style={{ gap: 12 }}>
          <H size="lg">1. Where should we deliver?</H>
          {addresses.isPending ? (
            <Skeleton height={64} />
          ) : adding ? (
            <Card>
              <AddressForm
                onSaved={(a) => {
                  qc.setQueryData(["addresses"], (old: typeof addresses.data) => [a, ...(old ?? [])]);
                  setAddressId(a.id);
                  setAdding(false);
                  toast("Address saved", { tone: "success" });
                }}
                onCancel={addresses.data?.length ? () => setAdding(false) : undefined}
              />
            </Card>
          ) : (
            <>
              <OptionList
                value={addressId}
                onChange={setAddressId}
                options={(addresses.data ?? []).map((a) => ({
                  value: a.id,
                  label: `${a.label} · ${a.fullName}`,
                  detail: [a.line1, a.line2, `${a.city} ${a.pincode}`].filter(Boolean).join(", "),
                  visual: <MapPin size={20} color={c.accentText} />,
                }))}
              />
              <Button title="Add a new address" variant="ghost" icon={<Plus size={18} color={c.text} />} onPress={() => setAdding(true)} />
            </>
          )}
        </View>

        {/* slot */}
        <View style={{ gap: 12 }}>
          <H size="lg">2. When should it arrive?</H>
          {prep >= 6 && (
            <T size="sm" tone="muted">
              Something in your cart needs about {prep} hours to make, so earlier slots are closed.
            </T>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {days.map((d) => {
              const open = DELIVERY_SLOTS.some((s) => slotOpen(d.date, s, prep));
              const on = date === d.date;
              return (
                <Press key={d.date} disabled={!open} onPress={() => (haptic.tap(), setDate(d.date))} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: !open }} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? c.text : c.lineStrong, backgroundColor: on ? c.text : c.surface, opacity: open ? 1 : 0.4, alignItems: "center", minWidth: 84 }}>
                  <T weight="semi" style={{ color: on ? c.bg : c.text }}>
                    {d.label}
                  </T>
                  {!open && <T size="xs" tone="muted">Full</T>}
                </Press>
              );
            })}
          </ScrollView>
          {date && (
            <OptionList
              columns={2}
              value={slot}
              onChange={setSlot}
              options={DELIVERY_SLOTS.map((s) => ({ value: s, label: formatSlot(s), detail: slotOpen(date, s, prep) ? "Available" : "Too soon to bake", disabled: !slotOpen(date, s, prep) }))}
            />
          )}
        </View>

        {/* payment */}
        <View style={{ gap: 12 }}>
          <H size="lg">3. How would you like to pay?</H>
          <OptionList
            value={payment}
            onChange={setPayment}
            options={[
              { value: "razorpay", label: "Pay online", detail: config.data?.payments.razorpay === false ? "Not available right now" : "UPI, cards, net banking", visual: <CreditCard size={22} color={c.text} />, disabled: config.data?.payments.razorpay === false || Boolean(pending) },
              { value: "cod", label: "Cash on delivery", detail: "Pay by cash or UPI at the door", visual: <HandCoins size={22} color={c.text} />, disabled: Boolean(pending) },
            ]}
          />
        </View>

        {/* summary */}
        <Card style={{ backgroundColor: c.plate, borderColor: c.plate }}>
          <H size="lg">Your order</H>
          {!cart ? (
            <Skeleton height={60} />
          ) : (
            cart.items.map((l) => (
              <Row key={l.id} style={{ alignItems: "flex-start", opacity: l.available ? 1 : 0.5 }}>
                <View style={{ flex: 1 }}>
                  <T weight="semi">
                    {l.quantity} × {l.custom ? "Your designed cake" : l.product.name}
                  </T>
                  <T size="xs" tone="muted">
                    {[l.variant.label, l.flavour, l.eggless && "eggless", l.custom && describeCustomization(l.custom)].filter(Boolean).join(" · ")}
                  </T>
                  {l.issue ? (
                    <T size="xs" tone="danger" weight="semi">
                      {l.issue}
                    </T>
                  ) : null}
                </View>
                <T weight="semi">{formatINR(l.lineTotal)}</T>
              </Row>
            ))
          )}
          <Row style={{ alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <Field label="Coupon" value={coupon} onChangeText={setCoupon} autoCapitalize="characters" placeholder="WELCOME10" editable={!pending} />
            </View>
            <Button title="Apply" variant="secondary" disabled={!coupon.trim() || Boolean(pending)} onPress={() => setApplied(coupon.trim().toUpperCase())} />
          </Row>
          {q?.couponError ? <T size="sm" tone="danger">{q.couponError}</T> : null}
          {q?.coupon ? <T size="sm" tone="fresh" weight="semi">{q.coupon.code} applied</T> : null}
          <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: c.lineStrong, paddingTop: 10 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <T tone="muted">Subtotal</T>
              <T>{q ? formatINR(q.subtotal) : "…"}</T>
            </Row>
            {q && q.discount > 0 ? (
              <Row style={{ justifyContent: "space-between" }}>
                <T tone="muted">Discount</T>
                <T tone="fresh" weight="semi">−{formatINR(q.discount)}</T>
              </Row>
            ) : null}
            <Row style={{ justifyContent: "space-between" }}>
              <T tone="muted">Delivery</T>
              <T>{q ? (q.deliveryFee ? formatINR(q.deliveryFee) : "Free") : "…"}</T>
            </Row>
          </View>
        </Card>
        {pending ? (
          <T size="sm" tone="muted">
            Order {pending.order.orderNumber} is saved and your items are held for 30 minutes. Finish paying to confirm it.
          </T>
        ) : null}
        <FormError message={error} />
      </Screen>

      <Row style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, gap: 16 }}>
        <View>
          <T size="xs" tone="muted">
            Total
          </T>
          <T size="xl" weight="bold">
            {q ? formatINR(q.total) : "…"}
          </T>
        </View>
        <Button
          title={pending ? "Try paying again" : payment === "cod" ? "Place order" : "Pay now"}
          size="lg"
          style={{ flex: 1 }}
          loading={placing}
          disabled={!cart || !cart.items.length || unavailable.length > 0 || !addressId || !slot}
          onPress={place}
        />
      </Row>

      <RazorpaySheet rp={paying?.razorpay ?? null} description={paying ? `Order ${paying.order.orderNumber}` : ""} onDone={onPaid} />
    </View>
  );
}
