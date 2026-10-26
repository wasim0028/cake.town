import { useLocalSearchParams, useRouter } from "expo-router";
import { CakeSlice, Check, ChefHat, PartyPopper, Truck } from "lucide-react-native";
import { useEffect } from "react";
import { Alert, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";
import { CUSTOMER_CANCELLABLE, formatINR, ORDER_STATUS_LABELS, type Cart, type Order, type OrderStatus } from "@caketown/shared";
import { Row, Screen } from "@/components/Screen";
import { Button, Card, Empty, H, Skeleton, T } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatSlot } from "@/lib/delivery";
import { haptic } from "@/lib/haptics";
import { useOrder } from "@/lib/queries";
import { cartLineKey, toast, useCart } from "@/lib/stores";
import { radius, useTheme } from "@/lib/theme";

const STAGES: { status: OrderStatus; label: string; Icon: typeof Check }[] = [
  { status: "placed", label: "Order placed", Icon: Check },
  { status: "baking", label: "Baking", Icon: ChefHat },
  { status: "out_for_delivery", label: "Out for delivery", Icon: Truck },
  { status: "delivered", label: "Delivered", Icon: CakeSlice },
];
const timeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

/** The current step's dot pulses gently. */
function Pulse({ children, active }: { children: React.ReactNode; active: boolean }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = active ? withRepeat(withSequence(withTiming(1.15, { duration: 700 }), withTiming(1, { duration: 700 })), -1) : 1;
  }, [active, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function OrderScreen() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const qc = useQueryClient();
  const query = useOrder(id);

  const order = query.data;
  const idx = order ? STAGES.findIndex((s) => s.status === order.status) : -1;

  if (query.isPending) return <Screen header={false}><Skeleton height={40} width="60%" /><Skeleton height={220} /></Screen>;
  if (!order) return <Empty title="We couldn't find that order" body="It may belong to a different account." />;

  const cancelled = order.status === "cancelled";
  const reached = new Map(order.statusHistory.map((h) => [h.status, h.at]));

  const cancel = () =>
    Alert.alert("Cancel this order?", order.paymentStatus === "paid" ? "The full amount is refunded to your payment method." : "You won't be charged.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: async () => {
          try {
            const r = await api.post<{ order: Order }>(`/orders/${id}/cancel`);
            qc.setQueryData(["order", id], r.order);
            qc.invalidateQueries({ queryKey: ["orders"] });
            haptic.success();
            toast("Order cancelled", { tone: "success" });
          } catch (e) {
            toast(e instanceof ApiError ? e.message : "Couldn't cancel", { tone: "error" });
          }
        },
      },
    ]);

  const reorder = async () => {
    try {
      const r = await api.post<{ cart: Cart; skipped: string[] }>(`/orders/${id}/reorder`);
      useCart.getState().replace(
        r.cart.items
          .filter((l) => l.available)
          .map((l) => ({
            key: cartLineKey({ variantId: l.variant.id, eggless: l.eggless, message: l.message, flavour: l.flavour, custom: l.custom }),
            productId: l.product.id,
            variantId: l.variant.id,
            slug: l.product.slug,
            name: l.product.name,
            category: l.product.category,
            variantLabel: l.variant.label,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            eggless: l.eggless,
            ...(l.flavour ? { flavour: l.flavour } : {}),
            ...(l.message ? { message: l.message } : {}),
            ...(l.custom ? { custom: l.custom } : {}),
          })),
      );
      haptic.add();
      if (r.skipped.length) toast("Some items couldn't be added", { body: r.skipped.join(", ") });
      router.navigate("/(tabs)/cart");
    } catch {
      toast("Couldn't reorder right now", { tone: "error" });
    }
  };

  return (
    <Screen header={false} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      {placed && !cancelled ? (
        <Animated.View entering={FadeInDown.springify()}>
          <Row style={{ backgroundColor: c.freshBg, padding: 14, borderRadius: radius.lg }}>
            <PartyPopper size={22} color={c.fresh} />
            <View style={{ flex: 1 }}>
              <T weight="bold" tone="fresh">
                {order.status === "pending_payment" ? "Your order is saved" : "Thank you! Your order is confirmed."}
              </T>
              <T size="sm" tone="fresh">
                We&apos;ll notify you at every step.
              </T>
            </View>
          </Row>
        </Animated.View>
      ) : null}

      <View style={{ gap: 4 }}>
        <T size="sm" tone="muted">
          Order {order.orderNumber}
        </T>
        <H size="xxl">{cancelled ? "Cancelled" : ORDER_STATUS_LABELS[order.status as OrderStatus]}</H>
        {!cancelled && (
          <T tone="muted">
            Arriving {dayFmt.format(new Date(`${order.deliveryDate}T12:00:00+05:30`))}, {formatSlot(order.deliverySlot)}
          </T>
        )}
      </View>

      {!cancelled && (
        <View accessibilityLabel="Order progress">
          {STAGES.map((s, i) => {
            const state = order.status === "pending_payment" ? "todo" : i < idx ? "done" : i === idx ? "current" : "todo";
            const at = reached.get(s.status);
            const lastStep = i === STAGES.length - 1;
            return (
              <Animated.View key={s.status} entering={FadeInDown.delay(i * 90).springify().damping(18)} style={{ flexDirection: "row", gap: 14 }}>
                <View style={{ alignItems: "center" }}>
                  <Pulse active={state === "current"}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: state === "done" ? c.accent : state === "current" ? c.text : c.surface, borderWidth: 2, borderColor: state === "todo" ? c.lineStrong : state === "done" ? c.accent : c.text }}>
                      <s.Icon size={18} color={state === "todo" ? c.muted : state === "done" ? "#1F1611" : c.bg} />
                    </View>
                  </Pulse>
                  {!lastStep && <View style={{ width: 4, height: 26, borderRadius: 2, marginVertical: 4, backgroundColor: state === "done" ? c.accent : c.line }} />}
                </View>
                <View style={{ paddingTop: 8 }}>
                  <T weight={state === "todo" ? "regular" : "semi"} tone={state === "todo" ? "muted" : "default"}>
                    {s.label}
                  </T>
                  {at ? <T size="xs" tone="muted">{timeFmt.format(new Date(at))}</T> : null}
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}

      <Card>
        <H size="lg">Items</H>
        {order.items.map((it, i) => (
          <Row key={i} style={{ alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <T weight="semi">
                {it.quantity} × {it.name}
              </T>
              <T size="xs" tone="muted">
                {[it.variantLabel, it.flavour, it.eggless && "eggless", it.customSummary, it.message && `“${it.message}”`].filter(Boolean).join(" · ")}
              </T>
            </View>
            <T>{formatINR(it.lineTotal)}</T>
          </Row>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, gap: 4 }}>
          {order.discount > 0 && (
            <Row style={{ justifyContent: "space-between" }}>
              <T tone="muted">Discount</T>
              <T tone="fresh">−{formatINR(order.discount)}</T>
            </Row>
          )}
          <Row style={{ justifyContent: "space-between" }}>
            <T tone="muted">Delivery</T>
            <T>{order.deliveryFee ? formatINR(order.deliveryFee) : "Free"}</T>
          </Row>
          <Row style={{ justifyContent: "space-between" }}>
            <T weight="bold" size="lg">Total</T>
            <T weight="bold" size="lg">{formatINR(order.total)}</T>
          </Row>
          <T size="sm" tone="muted">
            {order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"} · {{ pending: "not paid yet", paid: "paid", failed: "payment failed", refunded: "refunded" }[order.paymentStatus]}
          </T>
        </View>
      </Card>

      <Card>
        <H size="lg">Delivering to</H>
        <T>
          {order.address.fullName}, {order.address.phone}
        </T>
        <T tone="muted">{[order.address.line1, order.address.line2, order.address.landmark, `${order.address.city} ${order.address.pincode}`].filter(Boolean).join(", ")}</T>
      </Card>

      {CUSTOMER_CANCELLABLE.includes(order.status as OrderStatus) && <Button title="Cancel order" variant="secondary" onPress={cancel} />}
      {(order.status === "delivered" || cancelled) && <Button title="Order again" onPress={reorder} />}
    </Screen>
  );
}
