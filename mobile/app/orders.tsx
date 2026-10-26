import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";
import { ORDER_STATUS_LABELS, formatINR, type OrderStatus } from "@caketown/shared";
import { Row, Screen } from "@/components/Screen";
import { Button, Empty, Press, Skeleton, T, Tag } from "@/components/ui";
import { formatSlot } from "@/lib/delivery";
import { useOrders } from "@/lib/queries";
import { radius, useTheme } from "@/lib/theme";

const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default function Orders() {
  const router = useRouter();
  const { c } = useTheme();
  const q = useOrders();
  if (q.isPending) return <Screen header={false}><Skeleton height={80} /><Skeleton height={80} /></Screen>;
  if (!q.data?.length) return <Empty art={["Chocolate Truffle Cake", "cakes"]} title="No orders yet" body="When you order, you can follow it here from the oven to your door." action={<Button title="Browse the menu" onPress={() => router.navigate("/(tabs)/shop")} />} />;
  return (
    <Screen header={false} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      {q.data.map((o) => (
        <Press key={o.id} onPress={() => router.push({ pathname: "/order/[id]", params: { id: o.id } })} accessibilityRole="button" scaleTo={0.98} style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 16, gap: 8 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Tag label={ORDER_STATUS_LABELS[o.status as OrderStatus]} tone={o.status === "delivered" ? "fresh" : o.status === "cancelled" ? "neutral" : "accent"} />
            <T weight="bold">{formatINR(o.total)}</T>
          </Row>
          <Row>
            <View style={{ flex: 1 }}>
              <T weight="semi" numberOfLines={1}>
                {o.items[0]?.name}
                {o.items.length > 1 ? ` and ${o.items.length - 1} more` : ""}
              </T>
              <T size="xs" tone="muted">
                {o.orderNumber} · for {fmt.format(new Date(`${o.deliveryDate}T12:00:00+05:30`))}, {formatSlot(o.deliverySlot)}
              </T>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </Row>
        </Press>
      ))}
    </Screen>
  );
}
