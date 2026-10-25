"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { formatINR, type BakingClass, type Booking, type CheckoutResponse } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { FormError, OptionCards, Quantity } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";
import { payWithRazorpay } from "@/lib/razorpay";
import { toast, useAuth } from "@/lib/stores";
import styles from "./Classes.module.css";

const sessionFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function BookingPanel({ cls }: { cls: BakingClass }) {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const firstOpen = cls.sessions.find((s) => s.seatsLeft > 0);
  const [sessionId, setSessionId] = useState(firstOpen?.id);
  const [seats, setSeats] = useState(1);
  const [method, setMethod] = useState<"pay_at_venue" | "razorpay">("pay_at_venue");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [booked, setBooked] = useState<Booking | null>(null);

  const session = cls.sessions.find((s) => s.id === sessionId);
  const maxSeats = Math.max(1, Math.min(6, session?.seatsLeft ?? 1));

  if (!cls.sessions.length || !firstOpen) {
    return (
      <div className={styles.panel}>
        <p className={styles.panelTitle}>No open dates right now</p>
        <p className="muted">New dates are added every month. Subscribe to the Friday email to hear first.</p>
      </div>
    );
  }

  const book = async () => {
    if (!user) return router.push(`/login?next=${encodeURIComponent(pathname)}`);
    if (!sessionId) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await api.post<{ booking: Booking; razorpay?: CheckoutResponse["razorpay"] }>("/bookings", {
        classId: cls.id,
        sessionId,
        seats: Math.min(seats, maxSeats),
        paymentMethod: method,
      });
      if (res.razorpay) {
        const r = await payWithRazorpay(res.razorpay, cls.title);
        if (r.status === "dismissed" || r.status === "failed") {
          setError(r.status === "failed" ? r.message : "Payment not finished. Your seat is held for 30 minutes; book again to pay.");
          return;
        }
      }
      setBooked(res.booking);
      toast("You're booked!", { tone: "success", body: `${cls.title}, ${session ? sessionFmt.format(new Date(session.startsAt)) : ""}` });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't book. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (booked) {
    return (
      <div className={styles.panel} role="status">
        <p className={styles.panelTitle}>You&rsquo;re booked</p>
        <p>
          {booked.seats} seat{booked.seats > 1 ? "s" : ""} on {session ? sessionFmt.format(new Date(session.startsAt)) : ""}. We&rsquo;ve emailed the details.
        </p>
        <Button href="/account/bookings" variant="secondary">
          See your bookings
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.panelTitle}>
        {formatINR(cls.price)} <span className="muted small">per seat</span>
      </p>
      <OptionCards
        name="session"
        legend="Choose a date"
        columns={1}
        value={sessionId}
        onChange={setSessionId}
        options={cls.sessions.map((s) => ({
          value: s.id,
          label: sessionFmt.format(new Date(s.startsAt)),
          aside: s.seatsLeft === 0 ? "Full" : `${s.seatsLeft} left`,
          disabled: s.seatsLeft === 0,
        }))}
      />
      <div className={styles.seatsRow}>
        <span className={styles.seatsLabel}>Seats</span>
        <Quantity value={Math.min(seats, maxSeats)} onChange={setSeats} max={maxSeats} label="Seats" />
      </div>
      <OptionCards
        name="pay"
        legend="Payment"
        columns={2}
        value={method}
        onChange={setMethod}
        options={[
          { value: "pay_at_venue", label: "Pay at the studio", detail: "Cash or UPI on the day" },
          { value: "razorpay", label: "Pay now", detail: "UPI, cards, net banking" },
        ]}
      />
      <FormError>{error}</FormError>
      <Button size="lg" block loading={busy} onClick={book} disabled={!session || session.seatsLeft === 0}>
        {user ? `Book ${Math.min(seats, maxSeats)} seat${seats > 1 ? "s" : ""} · ${formatINR(cls.price * Math.min(seats, maxSeats))}` : "Sign in to book"}
      </Button>
      <p className="muted small">Free cancellation up to 24 hours before the class.</p>
    </div>
  );
}

export function ClassCard({ c }: { c: BakingClass }) {
  const next = c.sessions[0];
  const seatsLeft = c.sessions.reduce((n, s) => n + s.seatsLeft, 0);
  return (
    <Link href={`/classes/${c.slug}`} className={styles.classCard}>
      <span className={styles.level} data-level={c.level}>
        {c.level}
      </span>
      <h2 className={styles.classTitle}>{c.title}</h2>
      <p className="muted">{c.description}</p>
      <dl className={styles.classMeta}>
        <div>
          <dt>Next date</dt>
          <dd>{next ? sessionFmt.format(new Date(next.startsAt)) : "To be announced"}</dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{Math.round((c.durationMinutes / 60) * 10) / 10} hours</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{formatINR(c.price)}</dd>
        </div>
      </dl>
      <span className={styles.classFoot}>
        <span>with {c.instructor.name}</span>
        <span className={seatsLeft <= 5 ? styles.few : undefined}>{seatsLeft ? `${seatsLeft} seats across ${c.sessions.length} dates` : "Fully booked"}</span>
      </span>
    </Link>
  );
}
