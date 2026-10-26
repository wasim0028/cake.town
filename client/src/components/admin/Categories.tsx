"use client";

/* eslint-disable @next/next/no-img-element */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Category, Image } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Switch, Textarea } from "@/components/ui/form";
import { api } from "@/lib/api";
import { errorsFrom } from "@/lib/hooks";
import { toast } from "@/lib/stores";
import { Drawer } from "./Drawer";
import { ImagePicker } from "./ImagePicker";
import { PageTitle, Pill, Table } from "./kit";
import styles from "./Products.module.css";

type AdminCategory = Category & { isActive: boolean };

export function Categories() {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ["admin", "categories"], queryFn: () => api.get<{ items: AdminCategory[] }>("/admin/categories") });
  const [editing, setEditing] = useState<AdminCategory | "new" | null>(null);

  return (
    <>
      <PageTitle title="Categories" intro="How the shop is grouped. Lower sort numbers come first." actions={<Button iconStart={<Plus />} onClick={() => setEditing("new")}>New category</Button>} />
      <Table head={["Category", "Web address", <span key="p" className="num">Products</span>, <span key="o" className="num">Sort</span>, "Status", ""]} loading={cats.isPending}>
        {cats.data?.items.map((c) => (
          <tr key={c.id}>
            <td>
              <div className={styles.prod}>
                {c.image ? <img src={c.image.url} alt="" /> : <span className={styles.noImg} />}
                <div>
                  <strong>{c.name}</strong>
                  {c.description && <div className="muted small">{c.description.slice(0, 80)}</div>}
                </div>
              </div>
            </td>
            <td className="small">/shop/{c.slug}</td>
            <td className="num">{c.productCount ?? 0}</td>
            <td className="num">{c.sortOrder}</td>
            <td>{c.isActive ? <Pill tone="good">Shown</Pill> : <Pill>Hidden</Pill>}</td>
            <td className="num">
              <button className="text-link small" onClick={() => setEditing(c)}>Edit</button>
            </td>
          </tr>
        ))}
      </Table>
      <Drawer open={editing !== null} title={editing === "new" ? "New category" : "Edit category"} onClose={() => setEditing(null)}>
        {editing !== null && (
          <CategoryForm
            initial={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["admin", "categories"] });
            }}
          />
        )}
      </Drawer>
    </>
  );
}

function CategoryForm({ initial, onDone }: { initial: AdminCategory | null; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [images, setImages] = useState<Image[]>(initial?.image ? [initial.image] : []);
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [isActive, setActive] = useState(initial?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(undefined);
    const body = {
      name: name.trim(),
      ...(slug.trim() ? { slug: slug.trim() } : {}),
      description: description.trim() || undefined,
      ...(images[0] ? { image: images[0] } : {}),
      sortOrder: Math.round(Number(sortOrder) || 0),
      isActive,
    };
    try {
      if (initial) await api.patch(`/admin/categories/${initial.id}`, body);
      else await api.post("/admin/categories", body);
      toast(initial ? "Category saved" : "Category created", { tone: "success" });
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
    if (!initial || !window.confirm(`Delete “${initial.name}”?`)) return;
    try {
      await api.del(`/admin/categories/${initial.id}`);
      toast("Category deleted");
      onDone();
    } catch (err) {
      setMessage(errorsFrom(err).message);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Name" error={errors.name}>
        {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />}
      </Field>
      <Field label="Web address" optional hint={`/shop/${slug || "made-from-the-name"}`} error={errors.slug}>
        {(p) => <Input {...p} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />}
      </Field>
      <Field label="Description" optional error={errors.description}>
        {(p) => <Textarea {...p} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} />}
      </Field>
      <ImagePicker folder="categories" max={1} value={images} onChange={setImages} label="Photo" />
      <Field label="Sort order" hint="Lower numbers show first.">
        {(p) => <Input {...p} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ maxWidth: 120 }} />}
      </Field>
      <Switch checked={isActive} onChange={setActive} label="Show in the shop" />
      <FormError>{message}</FormError>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button type="submit" loading={busy} disabled={name.trim().length < 2}>
          {initial ? "Save" : "Create"}
        </Button>
        {initial && (
          <Button type="button" variant="ghost" onClick={remove} disabled={(initial.productCount ?? 0) > 0}>
            {(initial.productCount ?? 0) > 0 ? "Has products, can't delete" : "Delete"}
          </Button>
        )}
      </div>
    </form>
  );
}
