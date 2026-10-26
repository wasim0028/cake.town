"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useState } from "react";
import { DELIVERY_SLOTS, type Order, type Paginated } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { formatSlot } from "@/lib/delivery";
import { dateOnly, PageTitle, StatusBadge, todayIST } from "./kit";
import styles from "./Kitchen.module.css";

/** Every order for one delivery day (all pages), minus unpaid and cancelled ones. */
async function dayOrders(date: string) {
  const all: Order[] = [];
  for (let page = 1; page < 20; page++) {
    const r = await api.get<Paginated<Order>>(`/admin/orders?from=${date}&to=${date}&limit=60&page=${page}`);
    all.push(...r.items);
    if (page >= r.totalPages) break;
  }
  return all.filter((o) => o.status !== "cancelled" && o.status !== "pending_payment");
}

const shift = (d: string, days: number) => new Date(new Date(`${d}T12:00:00+05:30`).getTime() + days * 86400_000).toISOString().slice(0, 10);

export function Kitchen() {
  const [date, setDate] = useState(todayIST());
  const q = useQuery({ queryKey: ["admin", "kitchen", date], queryFn: () => dayOrders(date), refetchInterval: 60_000 });
  const orders = q.data ?? [];

  // Totals to bake: identical cakes are summed so the kitchen sees "3 × Belgian truffle 1 kg".
  const tally = new Map<string, number>();
  for (const o of orders)
    for (const it of o.items) {
      const key = [it.name, it.variantLabel, it.flavour, it.eggless && "eggless"].filter(Boolean).join(" · ");
      tally.set(key, (tally.get(key) ?? 0) + it.quantity);
    }

  return (
    <>
      <PageTitle
        title="Kitchen list"
        intro={<>Everything to bake and send out on {dateOnly.format(new Date(`${date}T12:00:00+05:30`))}, by delivery slot.</>}
        actions={
          <Button variant="secondary" size="sm" iconStart={<Printer />} onClick={() => window.print()} disabled={!orders.length}>
            Print
          </Button>
        }
      />
      <div className={styles.dayPick}>
        <Button variant="ghost" size="sm" onClick={() => setDate(shift(date, -1))}>Previous day</Button>
        <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Delivery day" style={{ width: "auto" }} />
        <Button variant="ghost" size="sm" onClick={() => setDate(shift(date, 1))}>Next day</Button>
        {date !== todayIST() && (
          <button className="text-link small" onClick={() => setDate(todayIST())}>Today</button>
        )}
      </div>

      {q.isPending ? (
        <Skeleton height={240} />
      ) : !orders.length ? (
        <p className={styles.empty}>No confirmed orders for this day yet.</p>
      ) : (
        <>
          <section className={styles.tally} aria-labelledby="tally-h">
            <h2 id="tally-h">To bake · {orders.length} order{orders.length === 1 ? "" : "s"}</h2>
            <ul role="list">
              {[...tally.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                <li key={k}>
                  <strong>{n}×</strong> {k}
                </li>
              ))}
            </ul>
          </section>

          {DELIVERY_SLOTS.map((slot) => {
            const list = orders.filter((o) => o.deliverySlot === slot);
            if (!list.length) return null;
            return (
              <section key={slot} className={styles.slot} aria-labelledby={`s-${slot}`}>
                <h2 id={`s-${slot}`}>
                  {formatSlot(slot)} <span className="muted">· {list.length}</span>
                </h2>
                <div className={styles.cards}>
                  {list.map((o) => (
                    <article key={o.id} className={styles.card}>
                      <header>
                        <Link href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link>
                        <StatusBadge status={o.status} />
                      </header>
                      <ul role="list" className={styles.items}>
                        {o.items.map((it, i) => (
                          <li key={i}>
                            <strong>{it.quantity}× {it.name}</strong> {it.variantLabel}
                            {it.flavour && ` · ${it.flavour}`}
                            {it.eggless && <span className={styles.egg}>EGGLESS</span>}
                            {it.customSummary && <div className="small">{it.customSummary}</div>}
                            {it.message && <div className={styles.msg}>“{it.message}”</div>}
                          </li>
                        ))}
                      </ul>
                      {o.notes && <p className="small"><strong>Note:</strong> {o.notes}</p>}
                      <footer className="small">
                        {o.address.fullName} · {o.address.phone}
                        <br />
                        <span className="muted">{[o.address.line1, o.address.city, o.address.pincode].join(", ")}</span>
                        {o.paymentMethod === "cod" && o.paymentStatus !== "paid" && <div className={styles.cod}>Collect cash</div>}
                      </footer>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
