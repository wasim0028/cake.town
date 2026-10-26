"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatINR, type Order, type OrderStatus, type Paginated } from "@caketown/shared";
import { Input } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatSlot } from "@/lib/delivery";
import { useDebounced } from "@/lib/hooks";
import { dateOnly, dateTime, PageTitle, Pager, Segmented, StatusBadge, Table, Toolbar } from "./kit";

type AdminOrder = Order & { user?: { name: string; email: string; phone?: string } };

const TABS: { value: "" | OrderStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "placed", label: "New" },
  { value: "baking", label: "Baking" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "cancelled", label: "Cancelled" },
];

export function OrdersList() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = (params.get("status") ?? "") as "" | OrderStatus;
  const page = Number(params.get("page") ?? 1);
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");
  const dq = useDebounced(q.trim(), 350);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  useEffect(() => {
    if ((params.get("q") ?? "") !== dq) set({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const qs = new URLSearchParams({ page: String(page), limit: "25" });
  if (status) qs.set("status", status);
  if (dq) qs.set("q", dq);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const orders = useQuery({ queryKey: ["admin", "orders", qs.toString()], queryFn: () => api.get<Paginated<AdminOrder>>(`/admin/orders?${qs}`), refetchInterval: 30_000 });

  return (
    <>
      <PageTitle title="Orders" intro="New orders appear here within 30 seconds. Change an order's status to notify the customer." />
      <Toolbar>
        <Segmented label="Status" value={status} onChange={(v) => set({ status: v })} options={TABS} />
      </Toolbar>
      <Toolbar>
        <Input placeholder="Order number, name or phone" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 300 }} aria-label="Search orders" />
        <label className="small muted">
          Delivery from <Input type="date" value={from} onChange={(e) => set({ from: e.target.value })} style={{ width: "auto", display: "inline-block" }} />
        </label>
        <label className="small muted">
          to <Input type="date" value={to} onChange={(e) => set({ to: e.target.value })} style={{ width: "auto", display: "inline-block" }} />
        </label>
        {(from || to || dq) && (
          <button className="text-link small" onClick={() => (setQ(""), set({ from: "", to: "", q: "" }))}>
            Clear
          </button>
        )}
      </Toolbar>
      <Table head={["Order", "Customer", "Delivery", "Items", "Status", <span key="t" className="num">Total</span>]} loading={orders.isPending} empty="No orders match these filters.">
        {orders.data?.items.map((o) => (
          <tr key={o.id}>
            <td>
              <Link href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link>
              <div className="muted small">{dateTime.format(new Date(o.createdAt))}</div>
            </td>
            <td>
              {o.address.fullName}
              <div className="muted small">{o.address.phone}</div>
            </td>
            <td>
              {dateOnly.format(new Date(`${o.deliveryDate}T12:00:00+05:30`))}
              <div className="muted small">{formatSlot(o.deliverySlot)}</div>
            </td>
            <td className="small">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
            <td>
              <StatusBadge status={o.status} />
              <div className="muted small">{o.paymentMethod === "cod" ? "Cash" : "Online"} · {o.paymentStatus}</div>
            </td>
            <td className="num">{formatINR(o.total)}</td>
          </tr>
        ))}
      </Table>
      {orders.data && <Pager page={orders.data.page} totalPages={orders.data.totalPages} total={orders.data.total} onPage={(p) => set({ page: String(p) })} />}
    </>
  );
}
