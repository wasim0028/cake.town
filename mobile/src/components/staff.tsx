import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { View } from "react-native";
import { formatINR, ORDER_STATUS_LABELS, type Order, type OrderStatus, type Paginated } from "@caketown/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/stores";
import { radius, useTheme } from "@/lib/theme";
import { Press, T } from "./ui";

/** Building blocks for the Staff screens (admin accounts only). */

export type StaffOrder = Order & { user?: { name: string; email: string; phone?: string } };

export const todayIST = (offsetDays = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + offsetDays * 86400_000));
export const dayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
export const timeLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
export const deliveryDay = (d: string) => {
  if (d === todayIST()) return "Today";
  if (d === todayIST(1)) return "Tomorrow";
  return dayLabel.format(new Date(`${d}T12:00:00+05:30`));
};

/** New orders waiting to be started, and unhandled messages. Polled while the app is open. */
export function useStaffCounts() {
  const isAdmin = useAuth((s) => s.user?.role === "admin");
  const placed = useQuery({
    queryKey: ["staff", "orders", "placed-count"],
    queryFn: () => api.get<Paginated<Order>>("/admin/orders?status=placed&limit=1").then((r) => r.total),
    enabled: isAdmin,
    refetchInterval: 30_000,
  });
  const messages = useQuery({
    queryKey: ["staff", "messages", "count"],
    queryFn: () => api.get<{ open: number }>("/admin/messages?handled=false&limit=1").then((r) => r.open),
    enabled: isAdmin,
    refetchInterval: 60_000,
  });
  return { newOrders: placed.data ?? 0, openMessages: messages.data ?? 0 };
}

const TONE: Record<string, "warn" | "info" | "accent" | "good" | "muted"> = {
  pending_payment: "warn",
  placed: "info",
  baking: "accent",
  out_for_delivery: "accent",
  delivered: "good",
  cancelled: "muted",
};

export function StatusPill({ status, label }: { status?: string; label?: string }) {
  const { c } = useTheme();
  const tone = status ? (TONE[status] ?? "muted") : "muted";
  const [bg, fg] = {
    warn: [c.plate, c.link],
    info: [c.text, c.bg],
    accent: [c.accent, "#1F1611"],
    good: [c.freshBg, c.fresh],
    muted: [c.plate, c.muted],
  }[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <T size="xs" weight="semi" style={{ color: fg }}>
        {label ?? ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
      </T>
    </View>
  );
}

export function Stat({ label, value, detail, highlight, onPress }: { label: string; value: string; detail?: string; highlight?: boolean; onPress?: () => void }) {
  const { c } = useTheme();
  const body = (
    <View
      style={{
        flex: 1,
        minWidth: 150,
        padding: 16,
        gap: 2,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: highlight ? c.accent : c.line,
        backgroundColor: highlight ? c.inverseBg : c.surface,
      }}
    >
      <T size="sm" style={{ color: highlight ? c.inverseMuted : c.muted }}>{label}</T>
      <T size="xxl" weight="bold" style={{ color: highlight ? c.accent : c.text, fontVariant: ["tabular-nums"] }}>{value}</T>
      {detail ? <T size="xs" style={{ color: highlight ? c.inverseMuted : c.muted }}>{detail}</T> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} scaleTo={0.97} style={{ flex: 1, minWidth: 150 }}>
      {body}
    </Press>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: -8 }}>
      <T weight="bold" size="lg">{children}</T>
      {action}
    </View>
  );
}

/** Small numeric badge (new orders, unread messages). */
export function Count({ n }: { n: number }) {
  const { c } = useTheme();
  if (!n) return null;
  return (
    <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
      <T size="xs" weight="bold" style={{ color: "#1F1611" }}>{n}</T>
    </View>
  );
}

/** One order in a staff list: who, what, when, status. */
export function OrderCard({ o, onPress }: { o: StaffOrder; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`Order ${o.orderNumber}`} scaleTo={0.98} style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 16, gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <T weight="bold">{o.orderNumber}</T>
        <StatusPill status={o.status} />
      </View>
      <T size="sm" numberOfLines={2}>
        {o.items.map((i) => `${i.quantity}× ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""}`).join(", ")}
      </T>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <T size="xs" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
          {deliveryDay(o.deliveryDate)}, {o.deliverySlot.replace("-", "–")} · {o.address.fullName}
        </T>
        <T size="sm" weight="semi">{formatINR(o.total)}</T>
      </View>
    </Press>
  );
}
