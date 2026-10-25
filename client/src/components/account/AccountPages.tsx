"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  formatINR,
  ORDER_STATUS_LABELS,
  type Address,
  type AuthResponse,
  type Booking,
  type Order,
  type OrderStatus,
  type Paginated,
  type Product,
  type User,
} from "@caketown/shared";
import { ProductPlate } from "@/components/product/ProductPlate";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/form";
import { Skeleton, Tag } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { formatSlot } from "@/lib/delivery";
import { errorsFrom } from "@/lib/hooks";
import { toast, useAuth } from "@/lib/stores";
import { AddressForm } from "./AddressForm";
import styles from "./AccountPages.module.css";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      <p className="muted">{body}</p>
      {action}
    </div>
  );
}

/* ---------- profile ---------- */

export function ProfilePage() {
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({ fields: {} });
    try {
      const res = await api.patch<{ user: User }>("/auth/me", { name, phone });
      setUser(res.user);
      toast("Profile saved", { tone: "success" });
    } catch (err) {
      setErrors(errorsFrom(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Profile</h1>
      <form className={styles.card} onSubmit={save} noValidate>
        <h2 className={styles.cardTitle}>Your details</h2>
        <div className={styles.row}>
          <Field label="Name" error={errors.fields.name}>
            {(p) => <Input {...p} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Mobile number" error={errors.fields.phone}>
            {(p) => <Input {...p} type="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </Field>
        </div>
        <Field label="Email" hint="Write to us to change the email on your account.">
          {(p) => <Input {...p} value={user.email} readOnly disabled />}
        </Field>
        <FormError>{errors.message}</FormError>
        <div>
          <Button type="submit" loading={busy}>
            Save details
          </Button>
        </div>
      </form>
      <PasswordCard />
    </div>
  );
}

function PasswordCard() {
  const setUser = useAuth((s) => s.setUser);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({ fields: {} });
    try {
      const res = await api.post<AuthResponse>("/auth/change-password", { currentPassword, newPassword });
      setUser(res.user);
      setCurrent("");
      setNew("");
      toast("Password changed", { tone: "success", body: "You've been signed out on your other devices." });
    } catch (err) {
      setErrors(errorsFrom(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.card} onSubmit={save} noValidate>
      <h2 className={styles.cardTitle}>Password</h2>
      <div className={styles.row}>
        <Field label="Current password" error={errors.fields.currentPassword}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />}
        </Field>
        <Field label="New password" hint="8+ characters with a letter and a number" error={errors.fields.newPassword}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} />}
        </Field>
      </div>
      <FormError>{errors.message}</FormError>
      <div>
        <Button type="submit" variant="secondary" loading={busy} disabled={!currentPassword || !newPassword}>
          Change password
        </Button>
      </div>
    </form>
  );
}

/* ---------- orders ---------- */

const STATUS_TONE: Record<string, "fresh" | "neutral" | "accent"> = { delivered: "fresh", cancelled: "neutral", pending_payment: "accent" };

export function OrdersPage() {
  const query = useQuery({ queryKey: ["orders"], queryFn: () => api.get<Paginated<Order>>("/orders?limit=30") });
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Orders</h1>
      {query.isPending ? (
        <div className={styles.list}>
          <Skeleton height={84} />
          <Skeleton height={84} />
        </div>
      ) : !query.data?.items.length ? (
        <Empty title="No orders yet" body="When you order, you can follow it here from the oven to your door." action={<Button href="/shop">Browse the menu</Button>} />
      ) : (
        <ul role="list" className={styles.list}>
          {query.data.items.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className={styles.orderRow}>
                <div>
                  <p className={styles.orderTitle}>
                    {o.items[0]?.name}
                    {o.items.length > 1 && <span className="muted"> and {o.items.length - 1} more</span>}
                  </p>
                  <p className="muted small">
                    {o.orderNumber} · ordered {dateFmt.format(new Date(o.createdAt))} · for {dateFmt.format(new Date(`${o.deliveryDate}T12:00:00+05:30`))}, {formatSlot(o.deliverySlot)}
                  </p>
                </div>
                <div className={styles.orderSide}>
                  <Tag tone={STATUS_TONE[o.status] ?? "accent"}>{ORDER_STATUS_LABELS[o.status as OrderStatus]}</Tag>
                  <strong className="tnum">{formatINR(o.total)}</strong>
                  <ChevronRight size={18} aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- wishlist ---------- */

export function WishlistPage() {
  const query = useQuery({ queryKey: ["wishlist"], queryFn: () => api.get<{ items: Product[] }>("/me/wishlist") });
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Favourites</h1>
      {query.isPending ? (
        <Skeleton height={240} />
      ) : !query.data?.items.length ? (
        <Empty title="Nothing saved yet" body="Tap the heart on anything you'd like to order again or try next time." action={<Button href="/shop">Find something</Button>} />
      ) : (
        <ul role="list" className={styles.plates}>
          {query.data.items.map((p) => (
            <li key={p.id}>
              <ProductPlate product={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- addresses ---------- */

export function AddressesPage() {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const query = useQuery({ queryKey: ["addresses"], queryFn: () => api.get<{ items: Address[] }>("/me/addresses") });
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["addresses"] });
  const remove = async (a: Address) => {
    if (!window.confirm(`Delete the ${a.label.toLowerCase()} address?`)) return;
    await api.del(`/me/addresses/${a.id}`);
    toast("Address deleted");
    refresh();
  };
  const makeDefault = async (a: Address) => {
    await api.patch(`/me/addresses/${a.id}`, { isDefault: true });
    refresh();
  };

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Addresses</h1>
        {editing !== "new" && (
          <Button variant="secondary" iconStart={<Plus />} onClick={() => setEditing("new")}>
            Add address
          </Button>
        )}
      </div>
      {editing === "new" && (
        <div className={styles.card}>
          <AddressForm
            defaultName={user?.name}
            defaultPhone={user?.phone}
            onSaved={() => {
              setEditing(null);
              refresh();
              toast("Address saved", { tone: "success" });
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}
      {query.isPending ? (
        <Skeleton height={120} />
      ) : !query.data?.items.length && editing !== "new" ? (
        <Empty title="No saved addresses" body="Save your home or office so checkout takes seconds." />
      ) : (
        <ul role="list" className={styles.addresses}>
          {query.data?.items.map((a) => (
            <li key={a.id} className={styles.card}>
              {editing === a.id ? (
                <AddressForm
                  initial={a}
                  onSaved={() => {
                    setEditing(null);
                    refresh();
                    toast("Address updated", { tone: "success" });
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <>
                  <p className={styles.addrHead}>
                    <strong>{a.label}</strong>
                    {a.isDefault && <Tag tone="fresh">Default</Tag>}
                  </p>
                  <address className={styles.addr}>
                    {a.fullName}, {a.phone}
                    <br />
                    {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}
                    <br />
                    {a.city}, {a.state} {a.pincode}
                  </address>
                  <div className={styles.addrActions}>
                    <Button size="sm" variant="ghost" iconStart={<Pencil />} onClick={() => setEditing(a.id)}>
                      Edit
                    </Button>
                    {!a.isDefault && (
                      <Button size="sm" variant="ghost" iconStart={<Star />} onClick={() => makeDefault(a)}>
                        Make default
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" iconStart={<Trash2 />} onClick={() => remove(a)}>
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- class bookings ---------- */

export function BookingsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["bookings"], queryFn: () => api.get<{ items: Booking[] }>("/me/bookings") });
  const cancel = async (b: Booking) => {
    if (!window.confirm(`Cancel your booking for ${b.class.title}?`)) return;
    try {
      await api.post(`/bookings/${b.id}/cancel`);
      toast("Booking cancelled", { tone: "success", body: b.paymentStatus === "paid" ? "Your refund is on its way." : undefined });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't cancel", { tone: "error" });
    }
  };
  const upcoming = (b: Booking) => new Date(b.session.startsAt).getTime() > Date.now();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Baking classes</h1>
      {query.isPending ? (
        <Skeleton height={120} />
      ) : !query.data?.items.length ? (
        <Empty title="No classes booked" body="Small weekend classes in our kitchen. Everything you bake goes home with you." action={<Button href="/classes">See the classes</Button>} />
      ) : (
        <ul role="list" className={styles.list}>
          {query.data.items.map((b) => (
            <li key={b.id} className={`${styles.card} ${styles.booking}`}>
              <div>
                <p className={styles.orderTitle}>
                  <Link href={`/classes/${b.class.slug}`}>{b.class.title}</Link>
                </p>
                <p className="muted small">
                  {dateTimeFmt.format(new Date(b.session.startsAt))} · {b.seats} seat{b.seats > 1 ? "s" : ""} · {formatINR(b.amount)} {b.paymentMethod === "pay_at_venue" ? "(pay at the studio)" : ""}
                </p>
              </div>
              <div className={styles.orderSide}>
                <Tag tone={b.status === "confirmed" ? "fresh" : b.status === "cancelled" ? "neutral" : "accent"}>
                  {{ confirmed: "Booked", cancelled: "Cancelled", pending_payment: "Awaiting payment", attended: "Attended" }[b.status]}
                </Tag>
                {b.status !== "cancelled" && upcoming(b) && (
                  <Button size="sm" variant="ghost" onClick={() => cancel(b)}>
                    Cancel
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
