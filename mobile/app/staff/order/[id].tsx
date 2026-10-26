import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { MapPin, Phone } from "lucide-react-native";
import { useState } from "react";
import { Linking, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { formatINR, ORDER_STATUS_LABELS, ORDER_TRANSITIONS, type OrderStatus } from "@caketown/shared";
import { Row, Screen } from "@/components/Screen";
import { deliveryDay, StatusPill, timeLabel, type StaffOrder } from "@/components/staff";
import { Button, Card, Empty, Field, H, Skeleton, T } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { confirm } from "@/lib/confirm";
import { formatSlot } from "@/lib/delivery";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/stores";
import { radius, useTheme } from "@/lib/theme";

const NEXT: Partial<Record<OrderStatus, string>> = {
  baking: "Start baking",
  out_for_delivery: "Send out for delivery",
  delivered: "Mark as delivered",
};

export default function StaffOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["staff", "order", id], queryFn: () => api.get<{ order: StaffOrder }>(`/admin/orders/${id}`).then((r) => r.order) });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const o = q.data;
  if (q.isPending) return <Screen header={false}><Skeleton height={40} width="60%" /><Skeleton height={200} /></Screen>;
  if (!o) return <Empty title="Order not found" body="It may have been removed." />;

  const allowed = ORDER_TRANSITIONS[o.status as OrderStatus];
  const next = allowed.filter((s) => s !== "cancelled" && s !== "placed");
  const canCancel = allowed.includes("cancelled");

  const move = async (status: OrderStatus) => {
    if (status === "cancelled") {
      const ok = await confirm(`Cancel ${o.orderNumber}?`, o.paymentStatus === "paid" ? "Stock goes back and the online payment is refunded in full." : "Stock goes back on the shelf.", "Cancel order", true);
      if (!ok) return;
    }
    setBusy(status);
    try {
      const r = await api.patch<{ order: StaffOrder }>(`/admin/orders/${id}/status`, { status, ...(note.trim() ? { note: note.trim() } : {}) });
      qc.setQueryData(["staff", "order", id], { ...o, ...r.order, user: o.user });
      qc.invalidateQueries({ queryKey: ["staff", "orders"] });
      qc.invalidateQueries({ queryKey: ["staff", "stats"] });
      qc.invalidateQueries({ queryKey: ["staff", "kitchen"] });
      setNote("");
      haptic.success();
      toast(ORDER_STATUS_LABELS[status], { tone: "success", body: "The customer has been told." });
    } catch (e) {
      haptic.warn();
      toast(e instanceof ApiError ? e.message : "Couldn't update the order", { tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const mapsQuery = encodeURIComponent([o.address.line1, o.address.line2, o.address.city, o.address.pincode].filter(Boolean).join(", "));

  return (
    <Screen header={false} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <H size="xl">{o.orderNumber}</H>
          <T size="sm" tone="muted">Placed {timeLabel.format(new Date(o.createdAt))}</T>
        </View>
        <StatusPill status={o.status} />
      </Row>

      <Card style={{ backgroundColor: c.inverseBg, borderColor: c.inverseBg }}>
        <T size="sm" weight="semi" style={{ color: c.accent }}>Deliver</T>
        <H size="lg" tone="inverse">
          {deliveryDay(o.deliveryDate)}, {formatSlot(o.deliverySlot)}
        </H>
        {o.paymentMethod === "cod" && o.paymentStatus !== "paid" && (
          <T weight="bold" style={{ color: c.accent }}>Collect {formatINR(o.total)} in cash</T>
        )}
      </Card>

      {(next.length > 0 || canCancel) && (
        <Animated.View entering={FadeIn} style={{ gap: 12 }}>
          <Field label="Note for the customer" optional value={note} onChangeText={setNote} maxLength={200} placeholder="e.g. Rider is 10 minutes away" />
          {next.map((s) => (
            <Button key={s} title={NEXT[s] ?? ORDER_STATUS_LABELS[s]} size="lg" variant={s === next[0] ? "primary" : "secondary"} loading={busy === s} onPress={() => void move(s)} />
          ))}
          {canCancel && <Button title="Cancel order" variant="ghost" loading={busy === "cancelled"} onPress={() => void move("cancelled")} />}
        </Animated.View>
      )}

      <Card>
        <T weight="bold">Items</T>
        {o.items.map((it, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(i * 40)} style={{ flexDirection: "row", gap: 12 }}>
            <T weight="bold" size="lg" style={{ width: 34 }}>{it.quantity}×</T>
            <View style={{ flex: 1, gap: 2 }}>
              <T weight="semi">{it.name}</T>
              <T size="sm" tone="muted">{[it.variantLabel, it.flavour, it.eggless && "Eggless"].filter(Boolean).join(" · ")}</T>
              {it.customSummary ? <T size="sm">{it.customSummary}</T> : null}
              {it.message ? (
                <View style={{ backgroundColor: c.plate, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start", marginTop: 2 }}>
                  <T size="sm" weight="semi">“{it.message}”</T>
                </View>
              ) : null}
            </View>
            <T size="sm">{formatINR(it.lineTotal)}</T>
          </Animated.View>
        ))}
        <View style={{ height: 1, backgroundColor: c.line }} />
        <Row style={{ justifyContent: "space-between" }}>
          <T tone="muted">Total{o.discount > 0 ? ` (−${formatINR(o.discount)} coupon)` : ""}</T>
          <T weight="bold">{formatINR(o.total)}</T>
        </Row>
        <T size="sm" tone="muted">
          {o.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"} · {o.paymentStatus}
        </T>
        {o.notes ? (
          <View style={{ backgroundColor: c.plate, borderRadius: radius.sm, padding: 10 }}>
            <T size="sm"><T size="sm" weight="bold">Customer note: </T>{o.notes}</T>
          </View>
        ) : null}
      </Card>

      <Card>
        <T weight="bold">{o.address.fullName}</T>
        <T size="sm">
          {[o.address.line1, o.address.line2, o.address.landmark].filter(Boolean).join(", ")}
          {"\n"}
          {o.address.city} {o.address.pincode}
        </T>
        <Row>
          <Button title="Call" size="sm" variant="secondary" icon={<Phone size={16} color={c.text} />} onPress={() => void Linking.openURL(`tel:+91${o.address.phone}`)} style={{ flex: 1 }} />
          <Button title="Map" size="sm" variant="secondary" icon={<MapPin size={16} color={c.text} />} onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`)} style={{ flex: 1 }} />
        </Row>
      </Card>

      <Card>
        <T weight="bold">History</T>
        {o.statusHistory.map((h, i) => (
          <Row key={i} style={{ alignItems: "flex-start" }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent, marginTop: 6 }} />
            <View style={{ flex: 1 }}>
              <T weight="semi">{ORDER_STATUS_LABELS[h.status]} <T size="xs" tone="muted">· {timeLabel.format(new Date(h.at))}</T></T>
              {h.note ? <T size="sm" tone="muted">{h.note}</T> : null}
            </View>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
