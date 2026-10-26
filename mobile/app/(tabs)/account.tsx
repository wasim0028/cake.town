import { useRouter } from "expo-router";
import { CalendarHeart, ChefHat, ChevronRight, Heart, LogOut, MapPin, Package, Settings } from "lucide-react-native";
import { View } from "react-native";
import { ORDER_STATUS_LABELS, formatINR, type OrderStatus } from "@caketown/shared";
import { Row, Screen } from "@/components/Screen";
import { Count, useStaffCounts } from "@/components/staff";
import { Button, Card, H, Plate, Press, T } from "@/components/ui";
import { signOut } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { useOrders } from "@/lib/queries";
import { toast, useAuth } from "@/lib/stores";
import { radius, useTheme } from "@/lib/theme";

function Item({ icon, label, onPress, detail }: { icon: React.ReactNode; label: string; onPress: () => void; detail?: string }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line }}>
      {icon}
      <T weight="semi" style={{ flex: 1 }}>{label}</T>
      {detail ? <T size="sm" tone="muted">{detail}</T> : null}
      <ChevronRight size={18} color={c.muted} />
    </Press>
  );
}

export default function AccountTab() {
  const router = useRouter();
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const orders = useOrders(Boolean(user));
  const staff = useStaffCounts();

  if (!user) {
    return (
      <Screen tabs>
        <H size="xxl">Your account</H>
        <View style={{ alignItems: "center", gap: 14, paddingVertical: 24 }}>
          <Plate name="Red Velvet Cupcakes" category="cupcakes" size={150} />
          <H size="lg" style={{ textAlign: "center" }}>Sign in to order and track</H>
          <T tone="muted" style={{ textAlign: "center", maxWidth: 300 }}>Save addresses, see every order live and keep your favourites in one place.</T>
        </View>
        <Button title="Sign in" size="lg" onPress={() => router.push("/login")} />
        <Button title="Create an account" variant="secondary" size="lg" onPress={() => router.push("/signup")} />
        <Item icon={<Settings size={20} color={c.text} />} label="Settings" onPress={() => router.push("/settings")} />
      </Screen>
    );
  }

  const active = orders.data?.find((o) => !["delivered", "cancelled"].includes(o.status));

  return (
    <Screen tabs refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()}>
      <Row style={{ gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
          <H size="xl" style={{ color: "#1F1611" }}>{user.name.charAt(0)}</H>
        </View>
        <View style={{ flex: 1 }}>
          <H size="xl">{user.name}</H>
          <T size="sm" tone="muted">{user.email}</T>
        </View>
      </Row>

      {user.role === "admin" && (
        <Press onPress={() => router.push("/staff")} accessibilityRole="button" accessibilityLabel="Open the staff section" scaleTo={0.98}>
          <Card style={{ backgroundColor: c.accent, borderColor: c.accent, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <ChefHat size={26} color="#1F1611" />
            <View style={{ flex: 1 }}>
              <H size="lg" style={{ color: "#1F1611" }}>Staff</H>
              <T size="sm" style={{ color: "#1F1611" }}>
                {staff.newOrders ? `${staff.newOrders} new order${staff.newOrders === 1 ? "" : "s"} to start` : "Orders, kitchen list and stock"}
              </T>
            </View>
            <Count n={staff.newOrders} />
            <ChevronRight size={20} color="#1F1611" />
          </Card>
        </Press>
      )}

      {active && (
        <Press onPress={() => router.push({ pathname: "/order/[id]", params: { id: active.id } })} accessibilityRole="button" scaleTo={0.98}>
          <Card style={{ backgroundColor: c.inverseBg, borderColor: c.inverseBg }}>
            <T size="sm" weight="semi" style={{ color: c.accent }}>Current order</T>
            <H size="lg" tone="inverse">{ORDER_STATUS_LABELS[active.status as OrderStatus]}</H>
            <T size="sm" style={{ color: c.inverseMuted }}>
              {active.orderNumber} · {formatINR(active.total)} · tap to track
            </T>
          </Card>
        </Press>
      )}

      <View style={{ gap: 10 }}>
        <Item icon={<Package size={20} color={c.text} />} label="Orders" detail={orders.data ? String(orders.data.length) : undefined} onPress={() => router.push("/orders")} />
        <Item icon={<Heart size={20} color={c.text} />} label="Favourites" onPress={() => router.push("/wishlist")} />
        <Item icon={<MapPin size={20} color={c.text} />} label="Addresses" onPress={() => router.push("/addresses")} />
        <Item icon={<CalendarHeart size={20} color={c.text} />} label="Class bookings" onPress={() => router.push("/bookings")} />
        <Item icon={<Settings size={20} color={c.text} />} label="Settings" onPress={() => router.push("/settings")} />
      </View>

      <Button
        title="Sign out"
        variant="ghost"
        icon={<LogOut size={18} color={c.text} />}
        onPress={async () => {
          await signOut();
          haptic.tap();
          toast("Signed out");
        }}
      />
    </Screen>
  );
}
