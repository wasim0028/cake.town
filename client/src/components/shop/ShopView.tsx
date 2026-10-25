"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Paginated, Product } from "@caketown/shared";
import { ProductPlate } from "@/components/product/ProductPlate";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import styles from "./ShopView.module.css";

const PRICES = [
  { id: "", label: "Any price" },
  { id: "under-300", label: "Under ₹300", max: 30_000 },
  { id: "300-800", label: "₹300–₹800", min: 30_000, max: 80_000 },
  { id: "over-800", label: "Over ₹800", min: 80_000 },
] as const;

const DIETARY = [
  { id: "eggless", label: "Eggless" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten-free", label: "Gluten-free" },
] as const;

const SORTS = [
  { id: "popular", label: "Most popular" },
  { id: "newest", label: "Newest" },
  { id: "price_asc", label: "Price: low to high" },
  { id: "price_desc", label: "Price: high to low" },
  { id: "rating", label: "Best rated" },
] as const;

const LIMIT = 12;

function buildQuery(p: { q: string; category?: string; dietary: string[]; price: string; sort: string }, page: number) {
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.category) qs.set("category", p.category);
  p.dietary.forEach((d) => qs.append("dietary", d));
  const price = PRICES.find((x) => x.id === p.price);
  if (price && "min" in price && price.min !== undefined) qs.set("minPrice", String(price.min));
  if (price && "max" in price && price.max !== undefined) qs.set("maxPrice", String(price.max));
  qs.set("sort", p.sort);
  qs.set("page", String(page));
  qs.set("limit", String(LIMIT));
  return qs.toString();
}

export function ShopView({ categories, category, initial }: { categories: Category[]; category?: string; initial: Paginated<Product> | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const dietary = params.getAll("dietary");
  const price = params.get("price") ?? "";
  const sort = params.get("sort") ?? "popular";
  const debouncedQ = useDebounced(q.trim(), 300);
  const search = useRef<HTMLInputElement>(null);

  // "Search" in the navbar lands here with ?search=1: put the cursor in the box.
  useEffect(() => {
    if (params.get("search")) search.current?.focus();
  }, [params]);

  const setParams = (patch: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("search");
    for (const [k, v] of Object.entries(patch)) {
      next.delete(k);
      if (Array.isArray(v)) v.forEach((x) => next.append(k, x));
      else if (v) next.set(k, v);
    }
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  // Keep the URL in step with the (debounced) search box, so results can be shared.
  useEffect(() => {
    if ((params.get("q") ?? "") !== debouncedQ) setParams({ q: debouncedQ || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const filters = { q: debouncedQ, category, dietary, price, sort };
  const key = buildQuery(filters, 1);
  const isDefault = !debouncedQ && !dietary.length && !price && sort === "popular";

  const query = useInfiniteQuery({
    queryKey: ["products", key],
    queryFn: ({ pageParam, signal }) => api.get<Paginated<Product>>(`/products?${buildQuery(filters, pageParam)}`, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    initialData: isDefault && initial ? { pages: [initial], pageParams: [1] } : undefined,
    staleTime: 60_000,
  });

  const products = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;

  // Load the next page automatically when the end of the list scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [query]);

  const activeCount = dietary.length + (price ? 1 : 0) + (debouncedQ ? 1 : 0);
  const clearAll = () => {
    setQ("");
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className={`container ${styles.shop}`}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} aria-hidden className={styles.searchIcon} />
          <label htmlFor="shop-search" className="visually-hidden">
            Search the menu
          </label>
          <input
            ref={search}
            id="shop-search"
            type="search"
            placeholder="Search cakes, breads, flavours…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={styles.search}
            autoComplete="off"
          />
          {q && (
            <button type="button" className={styles.clearSearch} onClick={() => setQ("")} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
        <label className={styles.sort}>
          <span className="visually-hidden">Sort by</span>
          <select value={sort} onChange={(e) => setParams({ sort: e.target.value === "popular" ? null : e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.filters}>
        <nav aria-label="Categories" className={styles.row}>
          <Link href={`/shop${params.toString() ? `?${params.toString()}` : ""}`} className={styles.pill} aria-current={!category ? "page" : undefined}>
            Everything
          </Link>
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop/${c.slug}${params.toString() ? `?${params.toString()}` : ""}`} className={styles.pill} aria-current={category === c.slug ? "page" : undefined}>
              {c.name}
            </Link>
          ))}
        </nav>
        <div className={styles.row} role="group" aria-label="Filters">
          {DIETARY.map((d) => {
            const on = dietary.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                className={styles.pill}
                data-variant="soft"
                aria-pressed={on}
                onClick={() => setParams({ dietary: on ? dietary.filter((x) => x !== d.id) : [...dietary, d.id] })}
              >
                {d.label}
              </button>
            );
          })}
          <span className={styles.divider} aria-hidden />
          {PRICES.slice(1).map((p) => (
            <button key={p.id} type="button" className={styles.pill} data-variant="soft" aria-pressed={price === p.id} onClick={() => setParams({ price: price === p.id ? null : p.id })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.status} aria-live="polite">
        {query.isPending ? (
          <span>Looking…</span>
        ) : (
          <span>
            {total} {total === 1 ? "bake" : "bakes"}
            {debouncedQ && <> matching “{debouncedQ}”</>}
          </span>
        )}
        {activeCount > 0 && (
          <button type="button" className="text-link" onClick={clearAll}>
            Clear filters
          </button>
        )}
      </div>

      {query.isError ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>The menu didn&rsquo;t load</p>
          <p className="muted">Check your connection, then try again.</p>
          <Button variant="secondary" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.isPending ? (
        <ul role="list" className={styles.grid} aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className={styles.skeleton}>
              <Skeleton round className={styles.skeletonPlate} />
              <Skeleton height={22} width="70%" />
              <Skeleton height={16} width="90%" />
              <Skeleton height={18} width="40%" />
            </li>
          ))}
        </ul>
      ) : products.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing on the counter matches that</p>
          <p className="muted">Try a different word, or remove a filter. We also bake to order: the cake builder makes almost anything.</p>
          <div className={styles.emptyActions}>
            <Button variant="secondary" onClick={clearAll}>
              Clear filters
            </Button>
            <Button href="/cake-builder">Design a cake</Button>
          </div>
        </div>
      ) : (
        <>
          <ul role="list" className={styles.grid}>
            {products.map((p, i) => (
              <li key={p.id} className={styles.cell} style={{ "--i": i % LIMIT } as React.CSSProperties}>
                <ProductPlate product={p} priority={i < 4} />
              </li>
            ))}
          </ul>
          <div ref={sentinel} />
          {query.hasNextPage && (
            <div className={styles.more}>
              <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                Show more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
