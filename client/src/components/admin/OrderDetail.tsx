"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { useState } from "react";
import { formatINR, fromPaise, ORDER_STATUS_LABELS, ORDER_TRANSITIONS, toPaise, type Order, type OrderStatus } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { formatSlot } from "@/lib/delivery";
import { toast } from "@/lib/stores";
import { dateOnly, dateTime, PageTitle, Panel, Pill, StatusBadge } from "./kit";
import styles from "./OrderDetail.module.css";

type AdminOrder = Order & { user?: { name: string; email: string; phone?: string }; razorpay?: { refundedAmount?: number; paymentId?: string }; cancelReason?: string };

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  baking: "Start baking",
  out_for_delivery: "Send out for delivery",
  delivered: "Mark as delivered",
};

export function OrderDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "order", id], queryFn: () => api.get<{ order: AdminOrder }>(`/admin/orders/${id}`).then((r) => r.order) });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [refund, setRefund] = useState("");

  const o = q.data;
  if (q.isPending) return <Skeleton height={300} />;
  if (!o) return <p>Order not found.</p>;

  const move = async (status: OrderStatus) => {
    if (status === "cancelled" && !window.confirm(`Cancel order ${o.orderNumber}? Stock goes back, and online payments are refunded in full.`)) return;
    setBusy(status);
    setError(undefined);
    try {
      const r = await api.patch<{ order: AdminOrder }>(`/admin/orders/${id}/status`, { status, ...(note.trim() ? { note: note.trim() } : {}) });
      qc.setQueryData(["admin", "order", id], { ...o, ...r.order, user: o.user });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setNote("");
      toast(`Marked as ${ORDER_STATUS_LABELS[status].toLowerCase()}`, { tone: "success", body: "The customer has been notified." });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update the order.");
    } finally {
      setBusy(null);
    }
  };

  const doRefund = async () => {
    const amount = refund ? toPaise(Number(refund)) : undefined;
    if (!window.confirm(`Refund ${amount ? formatINR(amount) : "the remaining amount"} to the customer?`)) return;
    setBusy("refund");
    setError(undefined);
    try {
      const r = await api.post<{ order: AdminOrder }>(`/admin/orders/${id}/refund`, { ...(amount ? { amount } : {}), ...(note.trim() ? { reason: note.trim() } : {}) });
      qc.setQueryData(["admin", "order", id], { ...o, ...r.order, user: o.user });
      setRefund("");
      toast("Refund started", { tone: "success" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't refund.");
    } finally {
      setBusy(null);
    }
  };

  const next = ORDER_TRANSITIONS[o.status as OrderStatus].filter((s) => s !== "cancelled" && s !== "placed");
  const canCancel = ORDER_TRANSITIONS[o.status as OrderStatus].includes("cancelled");
  const refunded = o.razorpay?.refundedAmount ?? 0;

  return (
    <>
      <Link href="/admin/orders" className={styles.back}>
        <ArrowLeft size={16} /> Orders
      </Link>
      <PageTitle
        title={`Order ${o.orderNumber}`}
        intro={<>Placed {dateTime.format(new Date(o.createdAt))}</>}
        actions={
          <Button variant="secondary" size="sm" iconStart={<Printer />} onClick={() => window.print()}>
            Print
          </Button>
        }
      />
      <div className={styles.grid}>
        <div className={styles.col}>
          <Panel title="Status" action={<StatusBadge status={o.status} />}>
            {next.length > 0 || canCancel ? (
              <>
                <Field label="Note for the customer" optional hint="Included in the history; sent with cancellations.">
                  {(p) => <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Rider is 10 minutes away" />}
                </Field>
                <div className={styles.actions}>
                  {next.map((s) => (
                    <Button key={s} loading={busy === s} onClick={() => move(s)}>
                      {NEXT_LABEL[s] ?? ORDER_STATUS_LABELS[s]}
                    </Button>
                  ))}
                  {canCancel && (
                    <Button variant="ghost" loading={busy === "cancelled"} onClick={() => move("cancelled")}>
                      Cancel order
                    </Button>
                  )}
                </div>
                <p className="muted small">Each change emails the customer, and sends an SMS and app notification where set up.</p>
              </>
            ) : (
              <p className="muted">This order is {o.status === "delivered" ? "complete" : "closed"}.{o.cancelReason ? ` Reason: ${o.cancelReason}` : ""}</p>
            )}
            <FormError>{error}</FormError>
            <ol className={styles.history}>
              {o.statusHistory.map((h, i) => (
                <li key={i}>
                  <span className={styles.histDot} />
                  <div>
                    <strong>{ORDER_STATUS_LABELS[h.status]}</strong>
                    <span className="muted small"> · {dateTime.format(new Date(h.at))}</span>
                    {h.note && <p className="small">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Items">
            <ul role="list" className={styles.items}>
              {o.items.map((it, i) => (
                <li key={i}>
                  <span className={styles.qty}>{it.quantity}×</span>
                  <div>
                    <strong>{it.name}</strong>
                    <div className="small">{[it.variantLabel, it.flavour, it.eggless && "EGGLESS"].filter(Boolean).join(" · ")}</div>
                    {it.customSummary && <div className="small">{it.customSummary}</div>}
                    {it.message && <div className={styles.message}>Message: “{it.message}”</div>}
                  </div>
                  <span className="tnum">{formatINR(it.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className={styles.totals}>
              <div><dt>Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>
              {o.discount > 0 && <div><dt>Discount {o.coupon ? `(${o.coupon.code})` : ""}</dt><dd>−{formatINR(o.discount)}</dd></div>}
              <div><dt>Delivery</dt><dd>{o.deliveryFee ? formatINR(o.deliveryFee) : "Free"}</dd></div>
              <div className={styles.total}><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
            </dl>
            {o.notes && <p className={styles.note}><strong>Customer note:</strong> {o.notes}</p>}
          </Panel>
        </div>

        <div className={styles.col}>
          <Panel title="Delivery">
            <p className={styles.when}>
              {dateOnly.format(new Date(`${o.deliveryDate}T12:00:00+05:30`))}, {formatSlot(o.deliverySlot)}
            </p>
            <address className={styles.address}>
              <strong>{o.address.fullName}</strong>
              <br />
              {[o.address.line1, o.address.line2, o.address.landmark].filter(Boolean).join(", ")}
              <br />
              {o.address.city}, {o.address.state} {o.address.pincode}
              <br />
              <a href={`tel:+91${o.address.phone}`} className="text-link">{o.address.phone}</a>
            </address>
            <a className="text-link small" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([o.address.line1, o.address.line2, o.address.city, o.address.pincode].filter(Boolean).join(", "))}`}>
              Open in Maps
            </a>
          </Panel>

          <Panel title="Customer">
            {o.user ? (
              <p>
                {o.user.name}
                <br />
                <a href={`mailto:${o.user.email}`} className="text-link small">{o.user.email}</a>
              </p>
            ) : (
              <p className="muted">Account removed</p>
            )}
          </Panel>

          <Panel title="Payment">
            <p>
              {o.paymentMethod === "cod" ? "Cash on delivery" : "Online (Razorpay)"}{" "}
              <Pill tone={o.paymentStatus === "paid" ? "good" : o.paymentStatus === "refunded" ? "muted" : o.paymentStatus === "failed" ? "bad" : "warn"}>{o.paymentStatus}</Pill>
            </p>
            {refunded > 0 && <p className="small muted">Refunded {formatINR(refunded)}</p>}
            {o.paymentMethod === "razorpay" && o.paymentStatus === "paid" && (
              <div className={styles.refund}>
                <Field label="Refund amount (₹)" hint={`Leave empty to refund the remaining ${formatINR(o.total - refunded)}. Use the note above as the reason.`}>
                  {(p) => <Input {...p} type="number" min={1} max={fromPaise(o.total - refunded)} step="1" value={refund} onChange={(e) => setRefund(e.target.value)} />}
                </Field>
                <Button variant="secondary" size="sm" loading={busy === "refund"} onClick={doRefund}>
                  Refund
                </Button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
