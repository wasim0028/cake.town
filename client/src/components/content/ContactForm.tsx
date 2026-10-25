"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { api } from "@/lib/api";
import { errorsFrom } from "@/lib/hooks";
import { useAuth } from "@/lib/stores";

export function ContactForm() {
  const user = useAuth((s) => s.user);
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: "", subject: "A question about an order", message: "" });
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({ fields: {} });
    try {
      await api.post("/contact", Object.fromEntries(Object.entries(form).filter(([, v]) => v)));
      setSent(true);
    } catch (err) {
      setErrors(errorsFrom(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <p role="status" style={{ padding: "1.25rem", borderRadius: 14, background: "var(--tag-fresh-bg)", color: "var(--tag-fresh-text)", fontWeight: 600 }}>
        Thanks, {form.name.split(" ")[0]}. We reply within a day, usually much sooner, at {form.email}.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
        <Field label="Name" error={errors.fields.name}>
          {(p) => <Input {...p} autoComplete="name" value={form.name} onChange={set("name")} />}
        </Field>
        <Field label="Email" error={errors.fields.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" value={form.email} onChange={set("email")} />}
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
        <Field label="Mobile number" optional error={errors.fields.phone}>
          {(p) => <Input {...p} type="tel" autoComplete="tel-national" value={form.phone} onChange={set("phone")} />}
        </Field>
        <Field label="What's it about?">
          {(p) => (
            <Select {...p} value={form.subject} onChange={set("subject")}>
              <option>A question about an order</option>
              <option>A custom or wedding cake</option>
              <option>Corporate or bulk orders</option>
              <option>Baking classes</option>
              <option>Something else</option>
            </Select>
          )}
        </Field>
      </div>
      <Field label="Message" hint="For an existing order, include the order number (it starts with CT-)." error={errors.fields.message}>
        {(p) => <Textarea {...p} rows={5} value={form.message} onChange={set("message")} />}
      </Field>
      <FormError>{errors.message}</FormError>
      <div>
        <Button type="submit" size="lg" loading={busy}>
          Send message
        </Button>
      </div>
    </form>
  );
}
