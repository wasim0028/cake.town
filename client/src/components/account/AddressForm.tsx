"use client";

import { useState, type FormEvent } from "react";
import type { Address } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Select } from "@/components/ui/form";
import { api } from "@/lib/api";
import { errorsFrom } from "@/lib/hooks";
import styles from "./AddressForm.module.css";

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Puducherry", "Punjab",
  "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

type Draft = Omit<Address, "id" | "location">;
const empty: Draft = { label: "Home", fullName: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "", isDefault: false };

/** Add or edit a delivery address. Calls onSaved with the address returned by the API. */
export function AddressForm({ initial, onSaved, onCancel, defaultName, defaultPhone }: { initial?: Address; onSaved: (a: Address) => void; onCancel?: () => void; defaultName?: string; defaultPhone?: string }) {
  const [form, setForm] = useState<Draft>(initial ? { ...empty, ...initial } : { ...empty, fullName: defaultName ?? "", phone: defaultPhone ?? "" });
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({ fields: {} });
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "" && v !== undefined));
    try {
      const res = initial ? await api.patch<{ address: Address }>(`/me/addresses/${initial.id}`, body) : await api.post<{ address: Address }>("/me/addresses", body);
      onSaved(res.address);
    } catch (err) {
      setErrors(errorsFrom(err));
    } finally {
      setBusy(false);
    }
  };

  const err = errors.fields;
  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.labels} role="radiogroup" aria-label="Address type">
        {["Home", "Work", "Other"].map((l) => (
          <button key={l} type="button" role="radio" aria-checked={form.label === l} className={styles.label} onClick={() => setForm((f) => ({ ...f, label: l }))}>
            {l}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <Field label="Full name" error={err.fullName}>
          {(p) => <Input {...p} autoComplete="name" value={form.fullName} onChange={set("fullName")} />}
        </Field>
        <Field label="Mobile number" hint="The delivery partner calls this number" error={err.phone}>
          {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel-national" value={form.phone} onChange={set("phone")} />}
        </Field>
      </div>
      <Field label="House, flat, building" error={err.line1}>
        {(p) => <Input {...p} autoComplete="address-line1" value={form.line1} onChange={set("line1")} />}
      </Field>
      <div className={styles.row}>
        <Field label="Area, street" optional error={err.line2}>
          {(p) => <Input {...p} autoComplete="address-line2" value={form.line2 ?? ""} onChange={set("line2")} />}
        </Field>
        <Field label="Landmark" optional error={err.landmark}>
          {(p) => <Input {...p} value={form.landmark ?? ""} onChange={set("landmark")} placeholder="Near the temple gate" />}
        </Field>
      </div>
      <div className={styles.row3}>
        <Field label="Pincode" error={err.pincode}>
          {(p) => <Input {...p} inputMode="numeric" autoComplete="postal-code" maxLength={6} value={form.pincode} onChange={set("pincode")} />}
        </Field>
        <Field label="City" error={err.city}>
          {(p) => <Input {...p} autoComplete="address-level2" value={form.city} onChange={set("city")} />}
        </Field>
        <Field label="State" error={err.state}>
          {(p) => (
            <Select {...p} autoComplete="address-level1" value={form.state} onChange={set("state")}>
              <option value="">Choose…</option>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <FormError>{errors.message}</FormError>
      <div className={styles.actions}>
        <Button type="submit" loading={busy}>
          {initial ? "Save address" : "Use this address"}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
