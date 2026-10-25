"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CakeSlice, Check, ChefHat, PartyPopper, Truck, X } from "lucide-react";
import { useState } from "react";
import { CUSTOMER_CANCELLABLE, formatINR, ORDER_STATUS_LABELS, type Cart, type Order, type OrderStatus } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { formatSlot } from "@/lib/delivery";
import { cartLineKey, toast, useCart } from "@/lib/stores";
import styles from "./OrderTracking.module.css";

const STAGES: { status: OrderStatus; label: string; icon: React.ReactNode; detail: string }[] = [
  { status: "placed", label: "Order placed", icon: <Check size={18} />, detail: "We've got it and it's in the queue." },
  { status: "baking", label: "Baking", icon: <ChefHat size={18} />, detail: "Your order is in the oven." },
  { status: "out_for_delivery", label: "Out for delivery", icon: <Truck size={18} />, detail: "It has left the bakery." },
  { status: "delivered", label: "Delivered", icon: <CakeSlice size={18} />, detail: "Enjoy! We'd love a review." },
];

const timeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

export function OrderTracking({ id }: { id: string }) {
  const params = useSearchParams();
  const justPlaced = params.get("placed") === "1";
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string>();

  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<{ order: Order }>(`/orders/${id}`),
    // Live updates while the order is moving; stop once it's finished.
    refetchInterval: (q) => {
      const s = q.state.data?.order.status;
      return s === "delivered" || s === "cancelled" ? false : 30_000;
    },
    refetchOnWindowFocus: true,
  });

  if (query.isPending) {
    return (
      <div className={styles.wrap}>
        <Skeleton height={44} width="50%" />
        <Skeleton height={120} />
        <Skeleton height={240} />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className={styles.wrap}>
        <h1>We couldn&rsquo;t find that order</h1>
        <p className="muted">It may belong to a different account.</p>
        <Button href="/account/orders" variant="secondary">
          See your orders
        </Button>
      </div>
    );
  }

  const order = query.data.order;
  const cancelled = order.status === "cancelled";
  const awaitingPayment = order.status === "pending_payment";
  const reached = new Map(order.statusHistory.map((h) => [h.status, h.at]));
  const currentIndex = STAGES.findIndex((s) => s.status === order.status);
  const progress = cancelled || awaitingPayment ? 0 : currentIndex / (STAGES.length - 1);

  const cancel = async () => {
    if (!window.confirm("Cancel this order? If you paid online, the full amount is refunded.")) return;
    setCancelling(true);
    setError(undefined);
    try {
      const res = await api.post<{ order: Order }>(`/orders/${id}/cancel`);
      qc.setQueryData(["order", id], res);
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast("Order cancelled", { tone: "success" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't cancel. Try again.");
    } finally {
      setCancelling(false);
    }
  };

  const reorder = async () => {
    try {
      const res = await api.post<{ cart: Cart; skipped: string[] }>(`/orders/${id}/reorder`);
      // Bring the server cart into the browser cart so it shows in the drawer.
      useCart.setState({
        items: res.cart.items
          .filter((l) => l.available)
          .map((l) => ({
            key: cartLineKey({ variantId: l.variant.id, eggless: l.eggless, message: l.message, flavour: l.flavour, custom: l.custom }),
            productId: l.product.id,
            variantId: l.variant.id,
            slug: l.product.slug,
            name: l.product.name,
            category: l.product.category,
            variantLabel: l.variant.label,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            eggless: l.eggless,
            ...(l.flavour ? { flavour: l.flavour } : {}),
            ...(l.message ? { message: l.message } : {}),
            ...(l.custom ? { custom: l.custom } : {}),
          })),
        open: true,
      });
      if (res.skipped.length) toast("Some items couldn't be added", { body: res.skipped.join(", ") });
    } catch {
      toast("Couldn't reorder right now", { tone: "error" });
    }
  };

  return (
    <div className={styles.wrap}>
      {justPlaced && !cancelled && (
        <div className={styles.celebrate} role="status">
          <span className={styles.confetti} aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ "--i": i } as React.CSSProperties} />
            ))}
          </span>
          <PartyPopper size={22} aria-hidden />
          <div>
            <strong>{awaitingPayment ? "Your order is saved" : "Thank you! Your order is confirmed."}</strong>
            <span>{awaitingPayment ? "We'll confirm it as soon as the payment comes through." : "We've emailed you the details. This page updates by itself."}</span>
          </div>
        </div>
      )}

      <header className={styles.head}>
        <div>
          <p className={styles.number}>Order {order.orderNumber}</p>
          <h1 className={styles.title}>{cancelled ? "Cancelled" : awaitingPayment ? "Waiting for payment" : ORDER_STATUS_LABELS[order.status as OrderStatus]}</h1>
          <p className="muted">
            {cancelled ? "This order won't be delivered." : <>Arriving {dayFmt.format(new Date(`${order.deliveryDate}T12:00:00+05:30`))}, {formatSlot(order.deliverySlot)}</>}
          </p>
        </div>
        <div className={styles.headActions}>
          {CUSTOMER_CANCELLABLE.includes(order.status as OrderStatus) && (
            <Button variant="secondary" loading={cancelling} onClick={cancel} iconStart={<X />}>
              Cancel order
            </Button>
          )}
          {(order.status === "delivered" || cancelled) && <Button onClick={reorder}>Order again</Button>}
        </div>
      </header>
      <FormError>{error}</FormError>

      {!cancelled && (
        <ol className={styles.timeline} style={{ "--progress": progress } as React.CSSProperties} aria-label="Order progress">
          {STAGES.map((s, i) => {
            const state = awaitingPayment ? "todo" : i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
            const at = reached.get(s.status);
            return (
              <li key={s.status} data-state={state}>
                <span className={styles.node} aria-hidden>
                  {s.icon}
                </span>
                <span className={styles.stage}>
                  <strong>{s.label}</strong>
                  <span>{at ? timeFmt.format(new Date(at)) : state === "current" ? s.detail : ""}</span>
                </span>
                <span className="visually-hidden">{state === "done" ? "done" : state === "current" ? "current step" : "not yet"}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="items">
          <h2 id="items" className={styles.cardTitle}>
            Items
          </h2>
          <ul role="list" className={styles.items}>
            {order.items.map((it, i) => (
              <li key={i}>
                <span>
                  <strong>
                    {it.quantity} × {it.name}
                  </strong>
                  <span className="muted small">
                    {[it.variantLabel, it.flavour, it.eggless && "eggless"].filter(Boolean).join(" · ")}
                    {it.customSummary && <> · {it.customSummary}</>}
                    {it.message && <> · “{it.message}”</>}
                  </span>
                </span>
                <span className="tnum">{formatINR(it.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className={styles.totals}>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatINR(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div>
                <dt>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</dt>
                <dd>−{formatINR(order.discount)}</dd>
              </div>
            )}
            <div>
              <dt>Delivery</dt>
              <dd>{order.deliveryFee ? formatINR(order.deliveryFee) : "Free"}</dd>
            </div>
            <div className={styles.total}>
              <dt>Total</dt>
              <dd>{formatINR(order.total)}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.card} aria-labelledby="delivery">
          <h2 id="delivery" className={styles.cardTitle}>
            Delivery
          </h2>
          <address className={styles.address}>
            <strong>{order.address.fullName}</strong>
            <br />
            {[order.address.line1, order.address.line2, order.address.landmark].filter(Boolean).join(", ")}
            <br />
            {order.address.city}, {order.address.state} {order.address.pincode}
            <br />
            {order.address.phone}
          </address>
          <h2 className={styles.cardTitle}>Payment</h2>
          <p>
            {order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"} ·{" "}
            <span className={styles.payStatus} data-status={order.paymentStatus}>
              {{ pending: "Not paid yet", paid: "Paid", failed: "Payment failed", refunded: "Refunded" }[order.paymentStatus]}
            </span>
          </p>
          {order.notes && (
            <>
              <h2 className={styles.cardTitle}>Your note</h2>
              <p className="muted">{order.notes}</p>
            </>
          )}
          <p className={`muted small ${styles.help}`}>
            Something not right? <Link href="/contact" className="text-link">Contact us</Link> with your order number.
          </p>
        </section>
      </div>
    </div>
  );
}
