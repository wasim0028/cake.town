"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { formatINR, type Category, type Paginated, type Product } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/form";
import { api } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { PageTitle, Pager, Pill, Segmented, Table, Toolbar } from "./kit";
import styles from "./Products.module.css";

export type AdminProduct = Omit<Product, "variants"> & { isActive: boolean; lowStockThreshold: number; soldCount?: number; variants: (Product["variants"][number] & { stock: number; sku?: string })[] };

export function ProductsList() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = params.get("status") ?? "";
  const category = params.get("category") ?? "";
  const page = Number(params.get("page") ?? 1);
  const [q, setQ] = useState(params.get("q") ?? "");
  const dq = useDebounced(q.trim(), 300);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  useEffect(() => {
    if ((params.get("q") ?? "") !== dq) set({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const cats = useQuery({ queryKey: ["admin", "categories"], queryFn: () => api.get<{ items: (Category & { isActive: boolean })[] }>("/admin/categories") });
  const qs = new URLSearchParams({ page: String(page), limit: "20" });
  if (status) qs.set("status", status);
  if (category) qs.set("category", category);
  if (dq) qs.set("q", dq);
  const products = useQuery({ queryKey: ["admin", "products", qs.toString()], queryFn: () => api.get<Paginated<AdminProduct>>(`/admin/products?${qs}`) });

  return (
    <>
      <PageTitle
        title="Products"
        intro="Prices, sizes, stock and photos. Hidden products stay out of the shop but keep their order history."
        actions={<Button href="/admin/products/new" iconStart={<Plus />}>New product</Button>}
      />
      <Toolbar>
        <Segmented
          label="Show"
          value={status}
          onChange={(v) => set({ status: v })}
          options={[
            { value: "", label: "All" },
            { value: "active", label: "In the shop" },
            { value: "hidden", label: "Hidden" },
            { value: "low", label: "Low stock" },
          ]}
        />
        <Select value={category} onChange={(e) => set({ category: e.target.value })} aria-label="Category" style={{ width: "auto" }}>
          <option value="">All categories</option>
          {cats.data?.items.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Input placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" style={{ maxWidth: 260 }} />
      </Toolbar>
      <Table head={["Product", "Category", "Sizes & stock", "Status", <span key="p" className="num">From</span>, <span key="s" className="num">Sold</span>]} loading={products.isPending} empty="No products match.">
        {products.data?.items.map((p) => {
          const low = p.variants.filter((v) => v.stock <= p.lowStockThreshold);
          return (
            <tr key={p.id}>
              <td>
                <div className={styles.prod}>
                  {p.images[0] ? <img src={p.images[0].url} alt="" /> : <span className={styles.noImg} />}
                  <div>
                    <Link href={`/admin/products/${p.id}`}>{p.name}</Link>
                    <div className="muted small">
                      {[p.isBestseller && "Bestseller", p.isFeatured && "Featured", p.isCustomizable && "Builder"].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              </td>
              <td className="small">{p.category?.name}</td>
              <td className="small">
                {p.variants.map((v) => (
                  <span key={v.id} className={styles.stock} data-low={v.stock <= p.lowStockThreshold || undefined}>
                    {v.label}: {v.stock}
                  </span>
                ))}
              </td>
              <td>
                {!p.isActive ? <Pill>Hidden</Pill> : low.length ? <Pill tone="warn">Low stock</Pill> : <Pill tone="good">In the shop</Pill>}
              </td>
              <td className="num">{formatINR(p.priceFrom)}</td>
              <td className="num">{p.soldCount ?? 0}</td>
            </tr>
          );
        })}
      </Table>
      {products.data && <Pager page={products.data.page} totalPages={products.data.totalPages} total={products.data.total} onPage={(n) => set({ page: String(n) })} />}
    </>
  );
}
