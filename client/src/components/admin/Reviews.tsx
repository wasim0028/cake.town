"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Paginated } from "@caketown/shared";
import { Stars } from "@/components/ui/form";
import { api } from "@/lib/api";
import { toast } from "@/lib/stores";
import { dateOnly, PageTitle, Pager, Pill, Segmented, Toolbar } from "./kit";
import styles from "./Inbox.module.css";

interface AdminReview {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  isHidden: boolean;
  verifiedPurchase: boolean;
  createdAt: string;
  user?: { name: string; email: string };
  product?: { name: string; slug: string };
}

export function Reviews() {
  const qc = useQueryClient();
  const [show, setShow] = useState<"" | "false" | "true">("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), limit: "20" });
  if (show) qs.set("hidden", show);
  if (rating) qs.set("rating", rating);
  const key = ["admin", "reviews", qs.toString()];
  const reviews = useQuery({ queryKey: key, queryFn: () => api.get<Paginated<AdminReview>>(`/admin/reviews?${qs}`) });

  const toggle = async (r: AdminReview) => {
    await api.patch(`/admin/reviews/${r.id}`, { isHidden: !r.isHidden });
    qc.setQueryData<Paginated<AdminReview>>(key, (old) => old && { ...old, items: old.items.map((x) => (x.id === r.id ? { ...x, isHidden: !r.isHidden } : x)) });
    qc.invalidateQueries({ queryKey: ["admin", "reviews"], refetchType: "none" });
    toast(r.isHidden ? "Review is public again" : "Review hidden", { body: "The product's rating has been updated." });
  };

  return (
    <>
      <PageTitle title="Reviews" intro="Hide a review to take it off the shop; the product's star rating is recalculated." />
      <Toolbar>
        <Segmented label="Visibility" value={show} onChange={(v) => (setShow(v), setPage(1))} options={[{ value: "", label: "All" }, { value: "false", label: "Public" }, { value: "true", label: "Hidden" }]} />
        <Segmented
          label="Stars"
          value={rating}
          onChange={(v) => (setRating(v), setPage(1))}
          options={[{ value: "", label: "Any rating" }, ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}★` }))]}
        />
      </Toolbar>
      {reviews.isPending ? (
        <div className={styles.skeleton} />
      ) : !reviews.data?.items.length ? (
        <p className={styles.empty}>No reviews here.</p>
      ) : (
        <ul role="list" className={styles.list}>
          {reviews.data.items.map((r) => (
            <li key={r.id} className={styles.item} data-dim={r.isHidden || undefined}>
              <div className={styles.meta}>
                <Stars value={r.rating} label={`${r.rating} out of 5`} />
                {r.product && (
                  <Link href={`/product/${r.product.slug}`} className="small">{r.product.name}</Link>
                )}
                {r.verifiedPurchase && <Pill tone="good">Verified buyer</Pill>}
                {r.isHidden && <Pill>Hidden</Pill>}
              </div>
              {r.title && <strong>{r.title}</strong>}
              <p>{r.comment || <span className="muted">No comment.</span>}</p>
              <div className={styles.foot}>
                <span className="small muted">
                  {r.user?.name ?? "Deleted account"} · {dateOnly.format(new Date(r.createdAt))}
                </span>
                <button className="text-link small" onClick={() => toggle(r)}>{r.isHidden ? "Show again" : "Hide"}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {reviews.data && <Pager page={reviews.data.page} totalPages={reviews.data.totalPages} total={reviews.data.total} onPage={setPage} />}
    </>
  );
}
