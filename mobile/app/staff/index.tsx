import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChefHat, ChevronRight, Mail, Package, ShoppingBag } from "lucide-react-native";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatINR, type Paginated } from "@caketown/shared";
import { Row, Screen } from "@/components/Screen";
import { Count, OrderCard, SectionTitle, Stat, useStaffCounts, type StaffOrder } from "@/components/staff";
import { Card, H, Press, Skeleton, T } from "@/components/ui";
import { api } from "@/lib/api";
import { radius, useTheme } from "@/lib/theme";

interface Stats {
  sales: { today: { revenue: number; orders: number }; last7Days: { revenue: number; orders: number } };
  ordersByStatus: Record<string, number>;
  lowStock: { productId: string; name: string; variant: string; stock: number }[];
  deliveriesToday: number;
}

const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

function Link({ icon, label, count, onPress }: { icon: React.ReactNode; label: string; count?: number; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line }}>
      {icon}
      <T weight="semi" style={{ flex: 1 }}>{label}</T>
      <Count n={count ?? 0} />
      <ChevronRight size={18} color={c.muted} />
    </Press>
  );
}

export default function StaffHome() {
  const router = useRouter();
  const { c } = useTheme();
  const { newOrders, openMessages } = useStaffCounts();
  const stats = useQuery({ queryKey: ["staff", "stats"], queryFn: () => api.get<Stats>("/admin/stats"), refetchInterval: 60_000 });
  const waiting = useQuery({
    queryKey: ["staff", "orders", "placed"],
    queryFn: () => api.get<Paginated<StaffOrder>>("/admin/orders?status=placed&limit=10").then((r) => r.items),
    refetchInterval: 30_000,
  });
  const s = stats.data;
  const refresh = () => void Promise.all([stats.refetch(), waiting.refetch()]);

  return (
    <Screen header={false} refreshing={stats.isRefetching} onRefresh={refresh}>
      <View>
        <T tone="muted">{today.format(new Date())}</T>
        <H size="xxl">Today at caketown</H>
      </View>

      {s ? (
        <Animated.View entering={FadeInDown.duration(300)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Stat label="New orders to start" value={String(newOrders)} detail="Tap to open" highlight={newOrders > 0} onPress={() => router.push({ pathname: "/staff/orders", params: { status: "placed" } })} />
          <Stat label="Delivering today" value={String(s.deliveriesToday)} detail="Kitchen list" onPress={() => router.push("/staff/kitchen")} />
          <Stat label="Sales today" value={formatINR(s.sales.today.revenue)} detail={`${s.sales.today.orders} order${s.sales.today.orders === 1 ? "" : "s"}`} />
          <Stat label="Last 7 days" value={formatINR(s.sales.last7Days.revenue)} detail={`${s.sales.last7Days.orders} orders`} />
        </Animated.View>
      ) : (
        <View style={{ gap: 12 }}>
          <Skeleton height={96} />
          <Skeleton height={96} />
        </View>
      )}

      <View style={{ gap: 10 }}>
        <Link icon={<ShoppingBag size={20} color={c.text} />} label="Orders" count={newOrders} onPress={() => router.push("/staff/orders")} />
        <Link icon={<ChefHat size={20} color={c.text} />} label="Kitchen list" onPress={() => router.push("/staff/kitchen")} />
        <Link icon={<Package size={20} color={c.text} />} label="Stock" count={s?.lowStock.length} onPress={() => router.push("/staff/stock")} />
        <Link icon={<Mail size={20} color={c.text} />} label="Messages" count={openMessages} onPress={() => router.push("/staff/messages")} />
      </View>

      {Boolean(waiting.data?.length) && (
        <>
          <SectionTitle>Waiting to start</SectionTitle>
          {waiting.data!.map((o, i) => (
            <Animated.View key={o.id} entering={FadeInDown.delay(i * 50).duration(260)}>
              <OrderCard o={o} onPress={() => router.push({ pathname: "/staff/order/[id]", params: { id: o.id } })} />
            </Animated.View>
          ))}
        </>
      )}

      {Boolean(s?.lowStock.length) && (
        <>
          <SectionTitle>Running low</SectionTitle>
          <Card>
            {s!.lowStock.slice(0, 6).map((l) => (
              <Row key={`${l.productId}-${l.variant}`} style={{ justifyContent: "space-between" }}>
                <T style={{ flex: 1 }} numberOfLines={1}>{l.name} <T tone="muted">· {l.variant}</T></T>
                <T weight="bold" tone={l.stock === 0 ? "danger" : "default"}>{l.stock === 0 ? "Sold out" : `${l.stock} left`}</T>
              </Row>
            ))}
          </Card>
        </>
      )}

      <T size="xs" tone="muted" style={{ textAlign: "center" }}>
        Products, coupons, classes and customers are edited on the website at /admin.
      </T>
    </Screen>
  );
}
