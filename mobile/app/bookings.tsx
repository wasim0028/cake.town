import { useRouter } from "expo-router";
import { Alert, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { formatINR, type Booking } from "@caketown/shared";
import { Row, Screen } from "@/components/Screen";
import { Button, Card, Empty, Skeleton, T, Tag } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useBookings } from "@/lib/queries";
import { toast } from "@/lib/stores";

const fmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default function Bookings() {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useBookings();
  const cancel = (b: Booking) =>
    Alert.alert(`Cancel ${b.class.title}?`, b.paymentStatus === "paid" ? "Your payment will be refunded." : undefined, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel booking",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/bookings/${b.id}/cancel`);
            qc.invalidateQueries({ queryKey: ["bookings"] });
            toast("Booking cancelled", { tone: "success" });
          } catch (e) {
            toast(e instanceof ApiError ? e.message : "Couldn't cancel", { tone: "error" });
          }
        },
      },
    ]);

  if (q.isPending) return <Screen header={false}><Skeleton height={100} /></Screen>;
  if (!q.data?.length) return <Empty art={["Butter Croissant", "pastries"]} title="No classes booked" body="Small weekend classes in our kitchen." action={<Button title="See classes" onPress={() => router.navigate("/(tabs)/classes")} />} />;
  return (
    <Screen header={false} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      {q.data.map((b) => {
        const upcoming = new Date(b.session.startsAt).getTime() > Date.now();
        return (
          <Card key={b.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <Tag label={{ confirmed: "Booked", cancelled: "Cancelled", pending_payment: "Awaiting payment", attended: "Attended" }[b.status]} tone={b.status === "confirmed" ? "fresh" : b.status === "cancelled" ? "neutral" : "accent"} />
              <T weight="bold">{formatINR(b.amount)}</T>
            </Row>
            <T weight="semi">{b.class.title}</T>
            <T size="sm" tone="muted">
              {fmt.format(new Date(b.session.startsAt))} · {b.seats} seat{b.seats > 1 ? "s" : ""}
              {b.paymentMethod === "pay_at_venue" ? " · pay at the studio" : ""}
            </T>
            {b.status !== "cancelled" && upcoming && (
              <View style={{ alignItems: "flex-start" }}>
                <Button size="sm" variant="ghost" title="Cancel booking" onPress={() => cancel(b)} />
              </View>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
