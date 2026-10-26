"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatINR, type Paginated, type User } from "@caketown/shared";
import { Input } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/stores";
import { toast } from "@/lib/stores";
import { dateOnly, PageTitle, Pager, Pill, Table, Toolbar } from "./kit";

type Customer = User & { orders: number; spent: number; lastOrderAt?: string };

export function Customers() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim(), 300);
  const qs = new URLSearchParams({ page: String(page), limit: "25" });
  if (dq) qs.set("q", dq);
  const users = useQuery({ queryKey: ["admin", "users", qs.toString()], queryFn: () => api.get<Paginated<Customer>>(`/admin/users?${qs}`) });

  const setRole = async (u: Customer) => {
    const role = u.role === "admin" ? "customer" : "admin";
    const msg = role === "admin" ? `Give ${u.name} full admin access? They'll be able to see every order and change the shop.` : `Remove admin access from ${u.name}?`;
    if (!window.confirm(msg)) return;
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast(role === "admin" ? `${u.name} is now an admin` : `${u.name} is a customer again`, { tone: "success" });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't change the role", { tone: "error" });
    }
  };

  return (
    <>
      <PageTitle title="Customers" intro="Everyone with an account. Order totals count orders that went ahead (not cancelled or unpaid)." />
      <Toolbar>
        <Input placeholder="Name, email or phone" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} aria-label="Search customers" style={{ maxWidth: 300 }} />
      </Toolbar>
      <Table head={["Name", "Contact", "Joined", <span key="o" className="num">Orders</span>, <span key="s" className="num">Spent</span>, "Role", ""]} loading={users.isPending} empty="No one matches.">
        {users.data?.items.map((u) => (
          <tr key={u.id}>
            <td>
              <strong>{u.name}</strong>
              {u.lastOrderAt && <div className="muted small">Last order {dateOnly.format(new Date(u.lastOrderAt))}</div>}
            </td>
            <td className="small">
              <a href={`mailto:${u.email}`} className="text-link">{u.email}</a>
              {u.phone && <div className="muted">{u.phone}</div>}
            </td>
            <td className="small">{dateOnly.format(new Date(u.createdAt))}</td>
            <td className="num">{u.orders}</td>
            <td className="num">{formatINR(u.spent)}</td>
            <td>{u.role === "admin" ? <Pill tone="info">Admin</Pill> : <Pill>Customer</Pill>}</td>
            <td className="num">
              {u.id !== me?.id && (
                <button className="text-link small" onClick={() => setRole(u)}>
                  {u.role === "admin" ? "Remove admin" : "Make admin"}
                </button>
              )}
            </td>
          </tr>
        ))}
      </Table>
      {users.data && <Pager page={users.data.page} totalPages={users.data.totalPages} total={users.data.total} onPage={setPage} />}
    </>
  );
}
