"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { formatINR, type Order, type OrderStatus, type Paginated } from "@caketown/shared";
import { Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { formatSlot } from "@/lib/delivery";
import { PageTitle, Panel, StatusBadge, todayIST } from "./kit";
import { RevenueChart } from "./RevenueChart";
import styles from "./Dashboard.module.css";

interface Stats {
  sales: { today: { revenue: number; orders: number }; last7Days: { revenue: number; orders: number }; last30Days: { revenue: number; orders: number } };
  ordersByStatus: Record<string, number>;
  revenueSeries: { date: string; revenue: number; orders: number }[];
  lowStock: { productId: string; name: string; slug: string; variant: string; stock: number }[];
  topProducts: { productId: string; name: string; units: number; revenue: number }[];
  customers: number;
  deliveriesToday: number;
}

export function Dashboard() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api.get<Stats>("/admin/stats"), refetchInterval: 60_000 });
  const today = todayIST();
  const deliveries = useQuery({
    queryKey: ["admin", "orders", "today"],
    queryFn: () => api.get<Paginated<Order>>(`/admin/orders?from=${today}&to=${today}&limit=60`),
    refetchInterval: 60_000,
  });
  const s = stats.data;
  const needsAction = s ? (s.ordersByStatus.placed ?? 0) : 0;
  const todayOrders = (deliveries.data?.items ?? []).filter((o) => !["cancelled", "pending_payment"].includes(o.status)).sort((a, b) => a.deliverySlot.localeCompare(b.deliverySlot));

  return (
    <>
      <PageTitle
        title="Dashboard"
        intro={new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(new Date())}
      />

      <div className={styles.tiles}>
        {(
          [
            ["Today", s?.sales.today],
            ["Last 7 days", s?.sales.last7Days],
            ["Last 30 days", s?.sales.last30Days],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className={styles.tile}>
            <p className={styles.tileLabel}>{label}</p>
            {v ? (
              <>
                <p className={styles.tileValue}>{formatINR(v.revenue)}</p>
                <p className={styles.tileSub}>
                  {v.orders} order{v.orders === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <Skeleton height={34} width="70%" />
            )}
          </div>
        ))}
        <Link href="/admin/orders?status=placed" className={`${styles.tile} ${styles.tileAction}`} data-alert={needsAction > 0 || undefined}>
          <p className={styles.tileLabel}>New orders to start</p>
          <p className={styles.tileValue}>{s ? needsAction : "…"}</p>
          <p className={styles.tileSub}>{s ? `${s.deliveriesToday} deliveries today` : ""}</p>
        </Link>
      </div>

      <div className={styles.grid}>
        <Panel title="Revenue per day, last 30 days" className={styles.chartPanel}>
          {s ? <RevenueChart data={s.revenueSeries} /> : <Skeleton height={240} />}
        </Panel>

        <Panel title="Orders by status">
          {s ? (
            <ul role="list" className={styles.statusList}>
              {(["pending_payment", "placed", "baking", "out_for_delivery", "delivered", "cancelled"] as OrderStatus[]).map((st) => (
                <li key={st}>
                  <Link href={`/admin/orders?status=${st}`}>
                    <StatusBadge status={st} />
                    <span className="tnum">{s.ordersByStatus[st] ?? 0}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton height={180} />
          )}
        </Panel>

        <Panel title="Delivering today" action={<Link href="/admin/kitchen" className="text-link small">Kitchen list</Link>} className={styles.wide}>
          {deliveries.isPending ? (
            <Skeleton height={120} />
          ) : todayOrders.length === 0 ? (
            <p className="muted">No deliveries booked for today.</p>
          ) : (
            <ul role="list" className={styles.deliveries}>
              {todayOrders.slice(0, 8).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`}>
                    <span className={styles.slot}>{formatSlot(o.deliverySlot)}</span>
                    <span className={styles.who}>
                      <strong>{o.address.fullName}</strong>
                      <span className="muted small">
                        {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                      </span>
                    </span>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Running low" action={<Link href="/admin/products?status=low" className="text-link small">All</Link>}>
          {!s ? (
            <Skeleton height={120} />
          ) : s.lowStock.length === 0 ? (
            <p className="muted">Everything is well stocked.</p>
          ) : (
            <ul role="list" className={styles.low}>
              {s.lowStock.slice(0, 6).map((l) => (
                <li key={`${l.productId}-${l.variant}`}>
                  <AlertTriangle size={15} aria-hidden className={l.stock === 0 ? styles.out : styles.warn} />
                  <Link href={`/admin/products/${l.productId}`}>{l.name}</Link>
                  <span className="muted small">{l.variant}</span>
                  <span className={`tnum ${l.stock === 0 ? styles.out : ""}`}>{l.stock === 0 ? "Sold out" : `${l.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top sellers, last 30 days">
          {!s ? (
            <Skeleton height={120} />
          ) : s.topProducts.length === 0 ? (
            <p className="muted">No sales yet.</p>
          ) : (
            <ol className={styles.top}>
              {s.topProducts.map((p) => (
                <li key={p.productId}>
                  <Link href={`/admin/products/${p.productId}`}>{p.name}</Link>
                  <span className="muted small tnum">{p.units} sold</span>
                  <span className="tnum">{formatINR(p.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
      <p className="muted small" style={{ marginTop: "1rem" }}>
        Revenue counts confirmed orders (paid online or cash on delivery), not cancelled or unpaid ones. {s ? `${s.customers} customers.` : ""}
      </p>
    </>
  );
}
