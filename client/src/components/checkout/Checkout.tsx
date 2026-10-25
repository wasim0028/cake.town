"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CreditCard, HandCoins, MapPin, Plus, Tag as TagIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DELIVERY_SLOTS,
  describeCustomization,
  formatINR,
  TIMEZONE,
  type Address,
  type Cart,
  type CheckoutResponse,
  type Quote,
} from "@caketown/shared";
import { AddressForm } from "@/components/account/AddressForm";
import { BakeArt } from "@/components/art/BakeArt";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, OptionCards, Textarea } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { syncCartToServer, type SyncResult } from "@/lib/cart-sync";
import { formatSlot } from "@/lib/delivery";
import { useRequireAuth } from "@/lib/hooks";
import { payWithRazorpay } from "@/lib/razorpay";
import { toast, useCart } from "@/lib/stores";
import styles from "./Checkout.module.css";

interface Config {
  payments: { razorpay: boolean; cod: boolean };
}

/** The next 7 days in India time, as YYYY-MM-DD with friendly labels. */
function nextDays(n = 7) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE });
  const label = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TIMEZONE });
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() + i * 86400_000);
    return { date: fmt.format(d), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : label.format(d), sub: label.format(d) };
  });
}

function slotOpen(date: string, slot: string, prepHours: number) {
  const start = new Date(`${date}T${slot.split("-")[0]}:00+05:30`).getTime();
  return start >= Date.now() + prepHours * 3600_000;
}

export function Checkout() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const localItems = useCart((s) => s.items);
  const clearLocal = useCart((s) => s.clear);

  const [sync, setSync] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string>();
  const [addressId, setAddressId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState<string>();
  const [slot, setSlot] = useState<string>();
  const [payment, setPayment] = useState<"razorpay" | "cod">("razorpay");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string>();
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<CheckoutResponse | null>(null);

  // 1. Copy the browser cart into the account so the server can price it.
  useEffect(() => {
    if (!ready) return;
    if (!localItems.length) return setSync(null);
    let cancelled = false;
    syncCartToServer()
      .then((r) => !cancelled && setSync(r))
      .catch((e) => !cancelled && setSyncError(e instanceof ApiError ? e.message : "Couldn't load your cart."));
    return () => {
      cancelled = true;
    };
    // Re-sync only when the cart's contents change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(localItems.map((i) => [i.key, i.quantity]))]);

  const cart: Cart | undefined = sync?.cart;
  const config = useQuery({ queryKey: ["config"], queryFn: () => api.get<Config>("/config"), enabled: ready });
  const addresses = useQuery({ queryKey: ["addresses"], queryFn: () => api.get<{ items: Address[] }>("/me/addresses"), enabled: ready });
  const quote = useQuery({
    queryKey: ["quote", applied, cart?.subtotal],
    queryFn: () => api.post<{ quote: Quote }>("/checkout/quote", applied ? { couponCode: applied } : {}),
    enabled: Boolean(cart && cart.items.length),
  });

  useEffect(() => {
    if (!config.data) return;
    if (!config.data.payments.razorpay) setPayment("cod");
  }, [config.data]);

  useEffect(() => {
    const list = addresses.data?.items;
    if (list?.length && !addressId) setAddressId((list.find((a) => a.isDefault) ?? list[0])!.id);
    if (list && !list.length) setAdding(true);
  }, [addresses.data, addressId]);

  const prepHours = useMemo(() => Math.max(0, ...(cart?.items.map((i) => i.preparationHours) ?? [0])), [cart]);
  const days = useMemo(() => nextDays(7), []);
  // Pick the first day that still has an open slot.
  useEffect(() => {
    if (date || !cart) return;
    const first = days.find((d) => DELIVERY_SLOTS.some((s) => slotOpen(d.date, s, prepHours)));
    if (first) setDate(first.date);
  }, [cart, days, date, prepHours]);
  useEffect(() => {
    if (!date) return;
    if (!slot || !slotOpen(date, slot, prepHours)) setSlot(DELIVERY_SLOTS.find((s) => slotOpen(date, s, prepHours)));
  }, [date, prepHours, slot]);

  const q = quote.data?.quote;
  const unavailable = cart?.items.filter((i) => !i.available) ?? [];

  const finish = (orderId: string) => {
    clearLocal();
    qc.invalidateQueries({ queryKey: ["orders"] });
    router.push(`/account/orders/${orderId}?placed=1`);
  };

  const pay = async (res: CheckoutResponse) => {
    const result = await payWithRazorpay(res.razorpay!, `Order ${res.order.orderNumber}`);
    if (result.status === "paid" || result.status === "processing") return finish(res.order.id);
    setPending(res);
    setPlacing(false);
    if (result.status === "failed") setError(result.message);
  };

  const place = async () => {
    setError(undefined);
    if (!addressId) return setError("Add a delivery address first.");
    if (!date || !slot) return setError("Choose a delivery day and time.");
    setPlacing(true);
    try {
      if (pending) return await pay(pending);
      const res = await api.post<CheckoutResponse>("/orders", {
        addressId,
        deliveryDate: date,
        deliverySlot: slot,
        paymentMethod: payment,
        ...(applied ? { couponCode: applied } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      if (res.razorpay) return await pay(res);
      finish(res.order.id);
    } catch (e) {
      setPlacing(false);
      if (e instanceof ApiError) {
        setError(e.message);
        if (e.code === "PAYMENTS_DISABLED") setPayment("cod");
        if (e.code === "COUPON_INVALID") setApplied(undefined);
      } else setError("Couldn't place the order. Check your connection and try again.");
    }
  };

  if (!ready) {
    return (
      <div className={`container ${styles.loading}`}>
        <Skeleton height={40} width="40%" />
        <Skeleton height={220} />
      </div>
    );
  }

  if (!localItems.length && !pending) {
    return (
      <div className={`container ${styles.empty}`}>
        <BakeArt name="Butter Croissant" category="pastries" className={styles.emptyArt} />
        <h1>Your cart is empty</h1>
        <p className="lede">Add something from the menu, then come back here to choose a delivery slot.</p>
        <Button href="/shop">Browse the menu</Button>
      </div>
    );
  }

  return (
    <div className={`container ${styles.checkout}`}>
      <div className={styles.steps}>
        <h1 className={styles.title}>Checkout</h1>

        {sync?.rejected.length ? (
          <div className={styles.notice} role="status">
            <CircleAlert size={18} />
            <div>
              <strong>We removed {sync.rejected.length === 1 ? "an item" : `${sync.rejected.length} items`} from your cart</strong>
              <ul>
                {sync.rejected.map((r) => (
                  <li key={r.item.key}>
                    {r.item.name}: {r.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {syncError && <FormError>{syncError}</FormError>}

        {/* 1. address */}
        <section className={styles.step} aria-labelledby="step-address">
          <h2 id="step-address" className={styles.stepTitle}>
            <span className={styles.num}>1</span> Where should we deliver?
          </h2>
          {addresses.isPending ? (
            <Skeleton height={64} />
          ) : (
            <>
              {(addresses.data?.items.length ?? 0) > 0 && !adding && (
                <OptionCards
                  name="address"
                  legend="Saved addresses"
                  hideLegend
                  columns={1}
                  value={addressId}
                  onChange={setAddressId}
                  options={addresses.data!.items.map((a) => ({
                    value: a.id,
                    label: (
                      <>
                        {a.label} · {a.fullName}
                      </>
                    ),
                    detail: [a.line1, a.line2, a.landmark, `${a.city} ${a.pincode}`].filter(Boolean).join(", "),
                    visual: <MapPin size={20} />,
                  }))}
                />
              )}
              {adding ? (
                <div className={styles.addressForm}>
                  <AddressForm
                    defaultName={user?.name}
                    defaultPhone={user?.phone}
                    onSaved={(a) => {
                      qc.setQueryData(["addresses"], (old: { items: Address[] } | undefined) => ({ items: [a, ...(old?.items ?? [])] }));
                      setAddressId(a.id);
                      setAdding(false);
                      toast("Address saved", { tone: "success" });
                    }}
                    onCancel={addresses.data?.items.length ? () => setAdding(false) : undefined}
                  />
                </div>
              ) : (
                <Button variant="ghost" iconStart={<Plus />} onClick={() => setAdding(true)}>
                  Add a new address
                </Button>
              )}
            </>
          )}
        </section>

        {/* 2. slot */}
        <section className={styles.step} aria-labelledby="step-slot">
          <h2 id="step-slot" className={styles.stepTitle}>
            <span className={styles.num}>2</span> When should it arrive?
          </h2>
          {prepHours >= 6 && <p className="muted small">Something in your cart needs about {prepHours} hours to make, so earlier slots are closed.</p>}
          <div className={styles.days} role="radiogroup" aria-label="Delivery day">
            {days.map((d) => {
              const open = DELIVERY_SLOTS.some((s) => slotOpen(d.date, s, prepHours));
              return (
                <button key={d.date} type="button" role="radio" aria-checked={date === d.date} disabled={!open} className={styles.day} onClick={() => setDate(d.date)}>
                  <strong>{d.label}</strong>
                  {d.label !== d.sub && <span>{d.sub}</span>}
                  {!open && <span>Full</span>}
                </button>
              );
            })}
          </div>
          {date && (
            <OptionCards
              name="slot"
              legend="Delivery time"
              hideLegend
              columns={2}
              value={slot}
              onChange={setSlot}
              options={DELIVERY_SLOTS.map((s) => {
                const open = slotOpen(date, s, prepHours);
                return { value: s, label: formatSlot(s), detail: open ? "Available" : "Too soon to bake", disabled: !open };
              })}
            />
          )}
        </section>

        {/* 3. payment */}
        <section className={styles.step} aria-labelledby="step-pay">
          <h2 id="step-pay" className={styles.stepTitle}>
            <span className={styles.num}>3</span> How would you like to pay?
          </h2>
          <OptionCards
            name="payment"
            legend="Payment method"
            hideLegend
            columns={2}
            value={payment}
            onChange={setPayment}
            options={[
              {
                value: "razorpay",
                label: "Pay online",
                detail: config.data?.payments.razorpay === false ? "Not available right now" : "UPI, cards, net banking, wallets",
                visual: <CreditCard size={22} />,
                disabled: config.data?.payments.razorpay === false || Boolean(pending),
              },
              { value: "cod", label: "Cash on delivery", detail: "Pay by cash or UPI at the door", visual: <HandCoins size={22} />, disabled: Boolean(pending) },
            ]}
          />
          <Field label="Notes for the bakery or rider" optional>
            {(p) => <Textarea {...p} rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, call before arriving, keep the cake upright…" />}
          </Field>
        </section>
      </div>

      {/* summary */}
      <aside className={styles.summary} aria-label="Order summary">
        <h2 className={styles.summaryTitle}>Your order</h2>
        {!cart ? (
          <div className={styles.lines}>
            <Skeleton height={56} />
            <Skeleton height={56} />
          </div>
        ) : (
          <ul role="list" className={styles.lines}>
            {cart.items.map((l) => (
              <li key={l.id} className={styles.line} data-unavailable={!l.available || undefined}>
                <span className={styles.lineArt}>
                  {l.product.images[0] ? <img src={l.product.images[0].url} alt="" /> : <BakeArt name={l.product.name} category={l.product.category} />}
                  <span className={styles.qty}>{l.quantity}</span>
                </span>
                <span className={styles.lineInfo}>
                  <strong>{l.custom ? "Your designed cake" : l.product.name}</strong>
                  <span>{[l.variant.label, l.flavour, l.eggless && "eggless"].filter(Boolean).join(" · ")}</span>
                  {l.custom && <span>{describeCustomization(l.custom)}</span>}
                  {l.message && <span>“{l.message}”</span>}
                  {l.issue && <span className={styles.issue}>{l.issue}</span>}
                </span>
                <span className="tnum">{formatINR(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}

        <form
          className={styles.coupon}
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(coupon.trim().toUpperCase() || undefined);
          }}
        >
          <label htmlFor="coupon" className="visually-hidden">
            Coupon code
          </label>
          <TagIcon size={16} aria-hidden className={styles.couponIcon} />
          <Input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" autoCapitalize="characters" disabled={Boolean(pending)} />
          <Button type="submit" variant="secondary" size="sm" disabled={Boolean(pending) || !coupon.trim()}>
            Apply
          </Button>
        </form>
        {q?.couponError && <p className={styles.couponError}>{q.couponError}</p>}
        {q?.coupon && (
          <p className={styles.couponOk}>
            {q.coupon.code} applied{q.coupon.description ? `: ${q.coupon.description}` : ""}{" "}
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setApplied(undefined);
                setCoupon("");
              }}
            >
              Remove
            </button>
          </p>
        )}

        <dl className={styles.totals}>
          <div>
            <dt>Subtotal</dt>
            <dd className="tnum">{q ? formatINR(q.subtotal) : "…"}</dd>
          </div>
          {q && q.discount > 0 && (
            <div className={styles.discount}>
              <dt>Discount</dt>
              <dd className="tnum">−{formatINR(q.discount)}</dd>
            </div>
          )}
          <div>
            <dt>Delivery</dt>
            <dd className="tnum">{q ? (q.deliveryFee ? formatINR(q.deliveryFee) : "Free") : "…"}</dd>
          </div>
          <div className={styles.total}>
            <dt>Total</dt>
            <dd className="tnum">{q ? formatINR(q.total) : "…"}</dd>
          </div>
        </dl>

        <FormError>{error}</FormError>
        {pending && (
          <p className={styles.held}>
            Order {pending.order.orderNumber} is saved and your items are held for 30 minutes. Finish paying to confirm it.
          </p>
        )}
        <Button size="lg" block loading={placing} onClick={place} disabled={!cart || !cart.items.length || unavailable.length > 0 || !addressId || !slot}>
          {pending ? "Try paying again" : payment === "cod" ? `Place order${q ? ` · ${formatINR(q.total)}` : ""}` : `Pay ${q ? formatINR(q.total) : ""}`}
        </Button>
        {unavailable.length > 0 && (
          <p className={styles.couponError}>
            Remove unavailable items from your <Link href="#" onClick={(e) => { e.preventDefault(); useCart.getState().setOpen(true); }} className="text-link">cart</Link> to continue.
          </p>
        )}
        <p className="muted small">
          {date && slot ? <>Arriving {dayPhrase(days.find((d) => d.date === date))}, {formatSlot(slot)}. </> : null}
          You can cancel free of charge until we start baking.
        </p>
      </aside>
    </div>
  );
}

function dayPhrase(d?: { label: string; sub: string }) {
  if (!d) return "";
  return d.label === "Today" || d.label === "Tomorrow" ? d.label.toLowerCase() : `on ${d.sub}`;
}
