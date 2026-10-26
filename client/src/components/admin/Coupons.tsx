"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { formatINR, fromPaise, toPaise } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, OptionCards, Switch } from "@/components/ui/form";
import { api } from "@/lib/api";
import { errorsFrom } from "@/lib/hooks";
import { toast } from "@/lib/stores";
import { Drawer } from "./Drawer";
import { dateOnly, PageTitle, Pill, Table } from "./kit";
import styles from "./Editor.module.css";

interface Coupon {
  id: string;
  code: string;
  description?: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserLimit: number;
  usedCount: number;
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
}

const describe = (c: Coupon) =>
  (c.type === "percent" ? `${c.value}% off` : `${formatINR(c.value)} off`) +
  (c.minOrder ? ` over ${formatINR(c.minOrder)}` : "") +
  (c.type === "percent" && c.maxDiscount ? `, up to ${formatINR(c.maxDiscount)}` : "");

function state(c: Coupon): { label: string; tone: "good" | "muted" | "warn" } {
  const now = Date.now();
  if (!c.isActive) return { label: "Off", tone: "muted" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return { label: "Expired", tone: "muted" };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: "Scheduled", tone: "warn" };
  if (c.usageLimit && c.usedCount >= c.usageLimit) return { label: "Used up", tone: "muted" };
  return { label: "Live", tone: "good" };
}

export function Coupons() {
  const qc = useQueryClient();
  const coupons = useQuery({ queryKey: ["admin", "coupons"], queryFn: () => api.get<{ items: Coupon[] }>("/admin/coupons") });
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);

  return (
    <>
      <PageTitle title="Coupons" intro="Codes customers type at checkout." actions={<Button iconStart={<Plus />} onClick={() => setEditing("new")}>New coupon</Button>} />
      <Table head={["Code", "Offer", "Dates", <span key="u" className="num">Used</span>, "Status", ""]} loading={coupons.isPending} empty="No coupons yet.">
        {coupons.data?.items.map((c) => {
          const s = state(c);
          return (
            <tr key={c.id}>
              <td>
                <code style={{ fontWeight: 700 }}>{c.code}</code>
                {c.description && <div className="muted small">{c.description}</div>}
              </td>
              <td className="small">{describe(c)}</td>
              <td className="small">
                {c.startsAt || c.expiresAt
                  ? `${c.startsAt ? dateOnly.format(new Date(c.startsAt)) : "Now"} → ${c.expiresAt ? dateOnly.format(new Date(c.expiresAt)) : "no end"}`
                  : "Always"}
              </td>
              <td className="num">
                {c.usedCount}
                {c.usageLimit ? ` / ${c.usageLimit}` : ""}
              </td>
              <td><Pill tone={s.tone}>{s.label}</Pill></td>
              <td className="num"><button className="text-link small" onClick={() => setEditing(c)}>Edit</button></td>
            </tr>
          );
        })}
      </Table>
      <Drawer open={editing !== null} title={editing === null || editing === "new" ? "New coupon" : `Edit ${editing.code}`} onClose={() => setEditing(null)}>
        {editing !== null && (
          <CouponForm
            initial={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
            }}
          />
        )}
      </Drawer>
    </>
  );
}

const toLocalInput = (iso?: string) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso)) : "");

function CouponForm({ initial, onDone }: { initial: Coupon | null; onDone: () => void }) {
  const [f, setF] = useState({
    code: initial?.code ?? "",
    description: initial?.description ?? "",
    type: initial?.type ?? ("percent" as "percent" | "flat"),
    value: initial ? String(initial.type === "flat" ? fromPaise(initial.value) : initial.value) : "10",
    minOrder: initial?.minOrder ? String(fromPaise(initial.minOrder)) : "",
    maxDiscount: initial?.maxDiscount ? String(fromPaise(initial.maxDiscount)) : "",
    usageLimit: initial?.usageLimit ? String(initial.usageLimit) : "",
    perUserLimit: String(initial?.perUserLimit ?? 1),
    startsAt: toLocalInput(initial?.startsAt),
    expiresAt: toLocalInput(initial?.expiresAt),
    isActive: initial?.isActive ?? true,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(undefined);
    const body = {
      code: f.code.trim().toUpperCase(),
      description: f.description.trim() || undefined,
      type: f.type,
      value: f.type === "flat" ? toPaise(Number(f.value)) : Math.round(Number(f.value)),
      minOrder: f.minOrder ? toPaise(Number(f.minOrder)) : 0,
      ...(f.type === "percent" && f.maxDiscount ? { maxDiscount: toPaise(Number(f.maxDiscount)) } : {}),
      ...(f.usageLimit ? { usageLimit: Math.round(Number(f.usageLimit)) } : {}),
      perUserLimit: Math.max(1, Math.round(Number(f.perUserLimit) || 1)),
      // Dates are whole days in India time: start of the first day to end of the last.
      ...(f.startsAt ? { startsAt: `${f.startsAt}T00:00:00+05:30` } : {}),
      ...(f.expiresAt ? { expiresAt: `${f.expiresAt}T23:59:59+05:30` } : {}),
      isActive: f.isActive,
    };
    try {
      if (initial) await api.patch(`/admin/coupons/${initial.id}`, body);
      else await api.post("/admin/coupons", body);
      toast(initial ? "Coupon saved" : "Coupon created", { tone: "success" });
      onDone();
    } catch (err) {
      const r = errorsFrom(err);
      setErrors(r.fields);
      setMessage(r.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial || !window.confirm(`Delete ${initial.code}? Used coupons are switched off instead.`)) return;
    const r = await api.del<{ archived?: boolean } | undefined>(`/admin/coupons/${initial.id}`).catch((e) => (setMessage(errorsFrom(e).message), null));
    if (r === null) return;
    toast(r?.archived ? "Switched off (it has been used)" : "Coupon deleted");
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Code" hint="3–20 letters or numbers. Customers type this." error={errors.code}>
        {(p) => <Input {...p} value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={20} autoFocus style={{ fontWeight: 700, letterSpacing: "0.05em" }} />}
      </Field>
      <Field label="Description" optional hint="Shown when the code is applied." error={errors.description}>
        {(p) => <Input {...p} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={160} />}
      </Field>
      <OptionCards
        name="coupon-type"
        legend="Discount"
        value={f.type}
        columns={2}
        onChange={(v) => set("type", v)}
        options={[
          { value: "percent", label: "Percent off" },
          { value: "flat", label: "Fixed amount off" },
        ]}
      />
      <div className={styles.row2}>
        <Field label={f.type === "percent" ? "Percent" : "Amount (₹)"} error={errors.value}>
          {(p) => <Input {...p} type="number" min={1} max={f.type === "percent" ? 100 : undefined} value={f.value} onChange={(e) => set("value", e.target.value)} />}
        </Field>
        {f.type === "percent" ? (
          <Field label="Most it can take off (₹)" optional error={errors.maxDiscount}>
            {(p) => <Input {...p} type="number" min={1} value={f.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} />}
          </Field>
        ) : (
          <span />
        )}
        <Field label="Minimum order (₹)" optional error={errors.minOrder}>
          {(p) => <Input {...p} type="number" min={0} value={f.minOrder} onChange={(e) => set("minOrder", e.target.value)} />}
        </Field>
        <span />
        <Field label="Total uses" optional hint="Empty = unlimited" error={errors.usageLimit}>
          {(p) => <Input {...p} type="number" min={1} value={f.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} />}
        </Field>
        <Field label="Uses per customer" error={errors.perUserLimit}>
          {(p) => <Input {...p} type="number" min={1} value={f.perUserLimit} onChange={(e) => set("perUserLimit", e.target.value)} />}
        </Field>
        <Field label="First day" optional error={errors.startsAt}>
          {(p) => <Input {...p} type="date" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />}
        </Field>
        <Field label="Last day" optional error={errors.expiresAt}>
          {(p) => <Input {...p} type="date" value={f.expiresAt} min={f.startsAt || undefined} onChange={(e) => set("expiresAt", e.target.value)} />}
        </Field>
      </div>
      <Switch checked={f.isActive} onChange={(v) => set("isActive", v)} label="Coupon is on" />
      <FormError>{message}</FormError>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button type="submit" loading={busy} disabled={f.code.length < 3 || !f.value}>{initial ? "Save" : "Create coupon"}</Button>
        {initial && <Button type="button" variant="ghost" onClick={remove}>Delete</Button>}
      </div>
    </form>
  );
}
