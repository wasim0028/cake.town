import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { formatINR, type Booking, type CheckoutResponse } from "@caketown/shared";
import { RazorpaySheet, type PayResult } from "@/components/RazorpaySheet";
import { Row, Screen } from "@/components/Screen";
import { Button, Card, Empty, FormError, H, OptionList, Skeleton, Stepper, T } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { useClass } from "@/lib/queries";
import { toast, useAuth } from "@/lib/stores";
import { useTheme } from "@/lib/theme";

const fmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default function ClassScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const q = useClass(slug);
  const [sessionId, setSessionId] = useState<string>();
  const [seats, setSeats] = useState(1);
  const [method, setMethod] = useState<"pay_at_venue" | "razorpay">("pay_at_venue");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [rp, setRp] = useState<CheckoutResponse["razorpay"] | null>(null);
  const [booked, setBooked] = useState(false);

  if (q.isPending) return <Screen header={false}><Skeleton height={200} /></Screen>;
  const k = q.data;
  if (!k) return <Empty title="Class not found" body="It may have been removed." />;

  const session = k.sessions.find((s) => s.id === sessionId) ?? k.sessions.find((s) => s.seatsLeft > 0);
  const max = Math.max(1, Math.min(6, session?.seatsLeft ?? 1));
  const n = Math.min(seats, max);

  const done = () => {
    haptic.success();
    setBooked(true);
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["class", slug] });
    toast("You're booked!", { tone: "success", body: session ? fmt.format(new Date(session.startsAt)) : undefined });
  };

  const book = async () => {
    if (!user) return router.push({ pathname: "/login", params: { next: `/class/${slug}` } });
    if (!session) return;
    setBusy(true);
    setError(undefined);
    try {
      const r = await api.post<{ booking: Booking; razorpay?: CheckoutResponse["razorpay"] }>("/bookings", { classId: k.id, sessionId: session.id, seats: n, paymentMethod: method });
      if (r.razorpay) return setRp(r.razorpay);
      done();
    } catch (e) {
      haptic.warn();
      setError(e instanceof ApiError ? e.message : "Couldn't book. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onPaid = (r: PayResult) => {
    setRp(null);
    if (r.status === "paid" || r.status === "processing") return done();
    setError(r.status === "failed" ? r.message : "Payment not finished. Your seat is held for 30 minutes.");
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen header={false} contentStyle={{ paddingBottom: 130 + insets.bottom }}>
        <View style={{ gap: 6 }}>
          <H size="xxl">{k.title}</H>
          <T tone="muted">
            {Math.round((k.durationMinutes / 60) * 10) / 10} hours · {k.level} · {k.location}
          </T>
        </View>
        <T>{k.description}</T>
        {k.whatYouWillLearn.length > 0 && (
          <Card>
            <H size="lg">What you&apos;ll learn</H>
            {k.whatYouWillLearn.map((w) => (
              <Row key={w} style={{ alignItems: "flex-start" }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, marginTop: 9 }} />
                <T style={{ flex: 1 }}>{w}</T>
              </Row>
            ))}
          </Card>
        )}
        <Card>
          <T weight="semi">With {k.instructor.name}</T>
          {k.instructor.bio ? <T tone="muted">{k.instructor.bio}</T> : null}
        </Card>

        {booked ? (
          <Card style={{ backgroundColor: c.freshBg, borderColor: c.freshBg }}>
            <H size="lg" tone="fresh">You&apos;re booked</H>
            <T tone="fresh">We&apos;ve emailed the details. See you in the kitchen!</T>
            <Button title="See your bookings" variant="secondary" onPress={() => router.push("/bookings")} />
          </Card>
        ) : k.sessions.length ? (
          <>
            <H size="lg">Choose a date</H>
            <OptionList value={session?.id} onChange={setSessionId} options={k.sessions.map((s) => ({ value: s.id, label: fmt.format(new Date(s.startsAt)), aside: s.seatsLeft ? `${s.seatsLeft} left` : "Full", disabled: !s.seatsLeft }))} />
            <Row style={{ justifyContent: "space-between" }}>
              <T weight="semi">Seats</T>
              <Stepper value={n} onChange={setSeats} max={max} />
            </Row>
            <OptionList columns={2} value={method} onChange={setMethod} options={[{ value: "pay_at_venue", label: "Pay at the studio", detail: "Cash or UPI on the day" }, { value: "razorpay", label: "Pay now", detail: "UPI, cards" }]} />
            <FormError message={error} />
            <T size="sm" tone="muted">Free cancellation up to 24 hours before the class.</T>
          </>
        ) : (
          <Empty title="No open dates" body="New dates are added every month." />
        )}
      </Screen>
      {!booked && k.sessions.length > 0 && (
        <Row style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, gap: 16 }}>
          <View>
            <T size="xs" tone="muted">{n} seat{n > 1 ? "s" : ""}</T>
            <T size="xl" weight="bold">{formatINR(k.price * n)}</T>
          </View>
          <Button title={user ? "Book" : "Sign in to book"} size="lg" style={{ flex: 1 }} loading={busy} disabled={!session} onPress={book} />
        </Row>
      )}
      <RazorpaySheet rp={rp ?? null} description={k.title} onDone={onPaid} />
    </View>
  );
}
