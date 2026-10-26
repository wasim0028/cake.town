import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { DELIVERY_SLOTS, type Paginated } from "@caketown/shared";
import { Row, Screen } from "@/components/Screen";
import { deliveryDay, StatusPill, todayIST, type StaffOrder } from "@/components/staff";
import { Card, Empty, H, IconButton, Press, Skeleton, T } from "@/components/ui";
import { api } from "@/lib/api";
import { formatSlot } from "@/lib/delivery";
import { radius, useTheme } from "@/lib/theme";

async function dayOrders(date: string) {
  const all: StaffOrder[] = [];
  for (let page = 1; page < 20; page++) {
    const r = await api.get<Paginated<StaffOrder>>(`/admin/orders?from=${date}&to=${date}&limit=60&page=${page}`);
    all.push(...r.items);
    if (page >= r.totalPages) break;
  }
  return all.filter((o) => o.status !== "cancelled" && o.status !== "pending_payment");
}

export default function Kitchen() {
  const router = useRouter();
  const { c } = useTheme();
  const [offset, setOffset] = useState(0);
  const date = todayIST(offset);
  const q = useQuery({ queryKey: ["staff", "kitchen", date], queryFn: () => dayOrders(date), refetchInterval: 60_000 });
  const orders = q.data ?? [];

  const tally = new Map<string, number>();
  for (const o of orders)
    for (const it of o.items) {
      const key = [it.name, it.variantLabel, it.flavour, it.eggless && "eggless"].filter(Boolean).join(" · ");
      tally.set(key, (tally.get(key) ?? 0) + it.quantity);
    }

  return (
    <Screen header={false} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <Row style={{ justifyContent: "space-between" }}>
        <IconButton label="Previous day" onPress={() => setOffset((n) => n - 1)}><ChevronLeft size={20} color={c.text} /></IconButton>
        <View style={{ alignItems: "center" }}>
          <H size="lg">{deliveryDay(date)}</H>
          <T size="xs" tone="muted">{orders.length} order{orders.length === 1 ? "" : "s"} to send out</T>
        </View>
        <IconButton label="Next day" onPress={() => setOffset((n) => n + 1)}><ChevronRight size={20} color={c.text} /></IconButton>
      </Row>

      {q.isPending ? (
        <Skeleton height={200} />
      ) : !orders.length ? (
        <Empty title="Nothing to bake" body="No confirmed orders for this day yet." />
      ) : (
        <>
          <Card style={{ backgroundColor: c.plate, borderColor: c.plate }}>
            <T weight="bold">To bake</T>
            {[...tally.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => (
              <Row key={k} style={{ alignItems: "flex-start" }}>
                <T weight="bold" style={{ width: 34 }}>{n}×</T>
                <T style={{ flex: 1 }}>{k}</T>
              </Row>
            ))}
          </Card>

          {DELIVERY_SLOTS.map((slot) => {
            const list = orders.filter((o) => o.deliverySlot === slot);
            if (!list.length) return null;
            return (
              <View key={slot} style={{ gap: 10 }}>
                <T weight="bold" size="lg">{formatSlot(slot)} <T tone="muted">· {list.length}</T></T>
                {list.map((o, i) => (
                  <Animated.View key={o.id} entering={FadeInDown.delay(i * 40)}>
                    <Press onPress={() => router.push({ pathname: "/staff/order/[id]", params: { id: o.id } })} accessibilityRole="button" accessibilityLabel={`Order ${o.orderNumber}`} scaleTo={0.98} style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14, gap: 6 }}>
                      <Row style={{ justifyContent: "space-between" }}>
                        <T weight="bold">{o.orderNumber}</T>
                        <StatusPill status={o.status} />
                      </Row>
                      {o.items.map((it, j) => (
                        <View key={j}>
                          <T weight="semi">{it.quantity}× {it.name} <T tone="muted">{[it.variantLabel, it.flavour].filter(Boolean).join(" · ")}</T>{it.eggless ? <T tone="fresh" weight="bold"> EGGLESS</T> : null}</T>
                          {it.customSummary ? <T size="sm">{it.customSummary}</T> : null}
                          {it.message ? <T size="sm" weight="semi">“{it.message}”</T> : null}
                        </View>
                      ))}
                      <T size="xs" tone="muted">{o.address.fullName} · {o.address.city} {o.address.pincode}</T>
                      {o.paymentMethod === "cod" && o.paymentStatus !== "paid" ? <T size="sm" weight="bold" tone="danger">Collect cash</T> : null}
                    </Press>
                  </Animated.View>
                ))}
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}
