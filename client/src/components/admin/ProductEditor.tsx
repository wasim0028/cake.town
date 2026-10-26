"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { DIETARY_TAGS, fromPaise, toPaise, type Category, type Image } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { Chips, Field, FormError, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { errorsFrom } from "@/lib/hooks";
import { toast } from "@/lib/stores";
import { ImagePicker } from "./ImagePicker";
import { PageTitle, Panel } from "./kit";
import type { AdminProduct } from "./Products";
import styles from "./Editor.module.css";

interface VariantDraft {
  key: string;
  id?: string;
  label: string;
  weightGrams: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
}

interface Draft {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  images: Image[];
  variants: VariantDraft[];
  flavours: string;
  tags: string;
  dietary: (typeof DIETARY_TAGS)[number][];
  eggless: boolean;
  egglessExtra: string;
  allowsMessage: boolean;
  maxMessageLength: string;
  preparationHours: string;
  lowStockThreshold: string;
  isActive: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  isCustomizable: boolean;
}

let k = 0;
const key = () => `v${++k}`;
const rupees = (p?: number) => (p === undefined || p === null ? "" : String(fromPaise(p)));
const blankVariant = (): VariantDraft => ({ key: key(), label: "", weightGrams: "", price: "", compareAtPrice: "", stock: "10", sku: "" });

const EMPTY: Draft = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  category: "",
  images: [],
  variants: [{ ...blankVariant(), label: "500 g", weightGrams: "500" }],
  flavours: "",
  tags: "",
  dietary: [],
  eggless: true,
  egglessExtra: "50",
  allowsMessage: true,
  maxMessageLength: "30",
  preparationHours: "4",
  lowStockThreshold: "5",
  isActive: true,
  isBestseller: false,
  isFeatured: false,
  isCustomizable: false,
};

function fromProduct(p: AdminProduct): Draft {
  return {
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription ?? "",
    description: p.description,
    category: p.category?.id ?? "",
    images: p.images,
    variants: p.variants.map((v) => ({
      key: key(),
      id: v.id,
      label: v.label,
      weightGrams: v.weightGrams ? String(v.weightGrams) : "",
      price: rupees(v.price),
      compareAtPrice: rupees(v.compareAtPrice),
      stock: String(v.stock),
      sku: v.sku ?? "",
    })),
    flavours: p.flavours.join(", "),
    tags: p.tags.join(", "),
    dietary: p.dietary,
    eggless: p.egglessOption.available,
    egglessExtra: rupees(p.egglessOption.extraPrice),
    allowsMessage: p.allowsMessage,
    maxMessageLength: String(p.maxMessageLength),
    preparationHours: String(p.preparationHours),
    lowStockThreshold: String(p.lowStockThreshold),
    isActive: p.isActive,
    isBestseller: p.isBestseller,
    isFeatured: p.isFeatured,
    isCustomizable: p.isCustomizable,
  };
}

const list = (s: string) => [...new Set(s.split(",").map((x) => x.trim()).filter(Boolean))];
const int = (s: string, d = 0) => (s.trim() === "" ? d : Math.round(Number(s)));

function toPayload(d: Draft) {
  return {
    name: d.name.trim(),
    ...(d.slug.trim() ? { slug: d.slug.trim() } : {}),
    shortDescription: d.shortDescription.trim() || undefined,
    description: d.description.trim(),
    category: d.category,
    images: d.images,
    variants: d.variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      label: v.label.trim(),
      ...(v.weightGrams.trim() ? { weightGrams: int(v.weightGrams) } : {}),
      price: toPaise(Number(v.price || 0)),
      ...(v.compareAtPrice.trim() ? { compareAtPrice: toPaise(Number(v.compareAtPrice)) } : {}),
      stock: int(v.stock),
      ...(v.sku.trim() ? { sku: v.sku.trim() } : {}),
    })),
    flavours: list(d.flavours),
    tags: list(d.tags).map((t) => t.toLowerCase()),
    dietary: d.dietary,
    egglessOption: { available: d.eggless, extraPrice: d.eggless ? toPaise(Number(d.egglessExtra || 0)) : 0 },
    allowsMessage: d.allowsMessage,
    maxMessageLength: int(d.maxMessageLength, 30),
    preparationHours: int(d.preparationHours, 4),
    lowStockThreshold: int(d.lowStockThreshold, 5),
    isActive: d.isActive,
    isBestseller: d.isBestseller,
    isFeatured: d.isFeatured,
    isCustomizable: d.isCustomizable,
  };
}

export function ProductEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const qc = useQueryClient();
  const product = useQuery({ queryKey: ["admin", "product", id], queryFn: () => api.get<{ product: AdminProduct }>(`/admin/products/${id}`).then((r) => r.product), enabled: !isNew });
  const cats = useQuery({ queryKey: ["admin", "categories"], queryFn: () => api.get<{ items: (Category & { isActive: boolean })[] }>("/admin/categories") });
  const [d, setD] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (product.data) setD(fromProduct(product.data));
  }, [product.data]);
  useEffect(() => {
    if (isNew && !d.category && cats.data?.items[0]) setD((x) => ({ ...x, category: cats.data!.items[0]!.id }));
  }, [isNew, cats.data, d.category]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const up = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setD((x) => ({ ...x, [field]: value }));
    setDirty(true);
  };
  const upVariant = (i: number, patch: Partial<VariantDraft>) => up("variants", d.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage(undefined);
    try {
      const body = toPayload(d);
      const r = isNew ? await api.post<{ product: AdminProduct }>("/admin/products", body) : await api.patch<{ product: AdminProduct }>(`/admin/products/${id}`, body);
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.setQueryData(["admin", "product", r.product.id], r.product);
      setDirty(false);
      toast(isNew ? "Product created" : "Saved", { tone: "success" });
      if (isNew) router.replace(`/admin/products/${r.product.id}`);
      else setD(fromProduct(r.product));
    } catch (err) {
      const { fields, message } = errorsFrom(err);
      setErrors(fields);
      setMessage(message ?? (Object.keys(fields).length ? "Some fields need a look." : undefined));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${d.name}”? Products with past orders are hidden instead.`)) return;
    try {
      const r = await api.del<{ archived?: boolean; message?: string } | undefined>(`/admin/products/${id}`);
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast(r?.archived ? "Hidden instead of deleted" : "Product deleted", { body: r?.message });
      router.push("/admin/products");
    } catch (err) {
      setMessage(errorsFrom(err).message);
    }
  };

  if (!isNew && product.isPending) return <Skeleton height={400} />;
  if (!isNew && !product.data) return <p>Product not found.</p>;

  const err = (path: string) => errors[path];

  return (
    <form onSubmit={submit} noValidate>
      <Link href="/admin/products" className={styles.back}>
        <ArrowLeft size={16} /> Products
      </Link>
      <PageTitle
        title={isNew ? "New product" : d.name || "Product"}
        actions={
          !isNew && product.data?.isActive ? (
            <Button variant="ghost" size="sm" href={`/product/${product.data.slug}`} iconStart={<ExternalLink />}>
              View in shop
            </Button>
          ) : undefined
        }
      />
      <div className={styles.grid}>
        <div className={styles.col}>
          <Panel title="Details">
            <Field label="Name" error={err("name")}>
              {(p) => <Input {...p} value={d.name} onChange={(e) => up("name", e.target.value)} required maxLength={120} />}
            </Field>
            <Field label="Short line" optional hint="Shown on product cards. Up to 200 characters." error={err("shortDescription")}>
              {(p) => <Input {...p} value={d.shortDescription} onChange={(e) => up("shortDescription", e.target.value)} maxLength={200} />}
            </Field>
            <Field label="Description" error={err("description")}>
              {(p) => <Textarea {...p} rows={6} value={d.description} onChange={(e) => up("description", e.target.value)} maxLength={4000} />}
            </Field>
          </Panel>

          <Panel title="Photos">
            <ImagePicker folder="products" value={d.images} onChange={(v) => up("images", v)} label="Product photos" />
          </Panel>

          <Panel title="Sizes, prices and stock" action={<span className="small muted">Prices in ₹</span>}>
            <div className={styles.variants}>
              <div className={styles.vHead} aria-hidden>
                <span>Size</span>
                <span>Grams</span>
                <span>Price</span>
                <span>Was</span>
                <span>Stock</span>
                <span>SKU</span>
                <span />
              </div>
              {d.variants.map((v, i) => (
                <div key={v.key} className={styles.vRow}>
                  <Input aria-label={`Size ${i + 1} name`} placeholder="1 kg" value={v.label} onChange={(e) => upVariant(i, { label: e.target.value })} aria-invalid={!!err(`variants.${i}.label`) || undefined} />
                  <Input aria-label={`Size ${i + 1} grams`} type="number" min={1} value={v.weightGrams} onChange={(e) => upVariant(i, { weightGrams: e.target.value })} />
                  <Input aria-label={`Size ${i + 1} price`} type="number" min={1} step="1" value={v.price} onChange={(e) => upVariant(i, { price: e.target.value })} aria-invalid={!!err(`variants.${i}.price`) || undefined} />
                  <Input aria-label={`Size ${i + 1} compare-at price`} type="number" min={0} placeholder="—" value={v.compareAtPrice} onChange={(e) => upVariant(i, { compareAtPrice: e.target.value })} />
                  <Input aria-label={`Size ${i + 1} stock`} type="number" min={0} value={v.stock} onChange={(e) => upVariant(i, { stock: e.target.value })} />
                  <Input aria-label={`Size ${i + 1} SKU`} value={v.sku} onChange={(e) => upVariant(i, { sku: e.target.value })} maxLength={40} />
                  <button type="button" className={styles.iconBtn} onClick={() => up("variants", d.variants.filter((_, j) => j !== i))} disabled={d.variants.length === 1} aria-label={`Remove size ${i + 1}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            {Object.entries(errors).filter(([kk]) => kk.startsWith("variants")).map(([kk, m]) => (
              <p key={kk} className={styles.err}>Size {Number(kk.split(".")[1]) + 1}: {m}</p>
            ))}
            {d.variants.length < 10 && (
              <Button type="button" variant="ghost" size="sm" iconStart={<Plus />} onClick={() => up("variants", [...d.variants, blankVariant()])}>
                Add a size
              </Button>
            )}
            <Field label="Warn me when stock is at or below" hint="Shows up on the dashboard and the Low stock filter.">
              {(p) => <Input {...p} type="number" min={0} value={d.lowStockThreshold} onChange={(e) => up("lowStockThreshold", e.target.value)} style={{ maxWidth: 120 }} />}
            </Field>
          </Panel>

          <Panel title="Options for customers">
            <Field label="Flavours" optional hint="Separate with commas, e.g. Chocolate, Vanilla, Red velvet.">
              {(p) => <Input {...p} value={d.flavours} onChange={(e) => up("flavours", e.target.value)} />}
            </Field>
            <Chips legend="Dietary" options={DIETARY_TAGS.map((t) => ({ value: t, label: t.replace("-", " ") }))} value={d.dietary} onChange={(v) => up("dietary", v)} />
            <Switch checked={d.eggless} onChange={(v) => up("eggless", v)} label="Can be made eggless" detail="Customers get an eggless switch on the product page." />
            {d.eggless && (
              <Field label="Eggless extra (₹)">
                {(p) => <Input {...p} type="number" min={0} value={d.egglessExtra} onChange={(e) => up("egglessExtra", e.target.value)} style={{ maxWidth: 140 }} />}
              </Field>
            )}
            <Switch checked={d.allowsMessage} onChange={(v) => up("allowsMessage", v)} label="Message on the cake" />
            {d.allowsMessage && (
              <Field label="Longest message (characters)">
                {(p) => <Input {...p} type="number" min={1} max={60} value={d.maxMessageLength} onChange={(e) => up("maxMessageLength", e.target.value)} style={{ maxWidth: 140 }} />}
              </Field>
            )}
            <Switch checked={d.isCustomizable} onChange={(v) => up("isCustomizable", v)} label="Available in the cake builder" detail="Shape, frosting and toppings can be chosen." />
          </Panel>
        </div>

        <div className={styles.col}>
          <Panel title="Visibility">
            <Switch checked={d.isActive} onChange={(v) => up("isActive", v)} label="Show in the shop" />
            <Switch checked={d.isBestseller} onChange={(v) => up("isBestseller", v)} label="Bestseller badge" />
            <Switch checked={d.isFeatured} onChange={(v) => up("isFeatured", v)} label="Feature on the home page" />
          </Panel>
          <Panel title="Organise">
            <Field label="Category" error={err("category")}>
              {(p) => (
                <Select {...p} value={d.category} onChange={(e) => up("category", e.target.value)}>
                  {cats.data?.items.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.isActive ? "" : " (hidden)"}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Tags" optional hint="Comma separated; help search, e.g. birthday, kids.">
              {(p) => <Input {...p} value={d.tags} onChange={(e) => up("tags", e.target.value)} />}
            </Field>
            <Field label="Preparation time (hours)" hint="Earliest delivery slot is at least this far away.">
              {(p) => <Input {...p} type="number" min={0} max={168} value={d.preparationHours} onChange={(e) => up("preparationHours", e.target.value)} />}
            </Field>
            <Field label="Web address" optional hint={`caketown.in/product/${d.slug || "made-from-the-name"}`} error={err("slug")}>
              {(p) => <Input {...p} value={d.slug} onChange={(e) => up("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />}
            </Field>
          </Panel>
        </div>
      </div>
      <div className={styles.saveBar}>
        <div className={styles.saveInner}>
          {dirty ? <span className="small">Unsaved changes</span> : <span className="small muted">{isNew ? "Not created yet" : "All changes saved"}</span>}
          <span className={styles.spacer} />
          {!isNew && (
            <Button type="button" variant="ghost" onClick={remove}>
              Delete
            </Button>
          )}
          <Button type="submit" loading={saving} disabled={!d.name.trim() || !d.category}>
            {isNew ? "Create product" : "Save changes"}
          </Button>
        </div>
        <FormError>{message}</FormError>
      </div>
    </form>
  );
}
