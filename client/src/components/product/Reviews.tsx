"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Paginated, Review } from "@caketown/shared";
import { Button } from "@/components/ui/Button";
import { Field, FormError, StarInput, Stars, Textarea } from "@/components/ui/form";
import { api } from "@/lib/api";
import { errorsFrom } from "@/lib/hooks";
import { toast, useAuth } from "@/lib/stores";
import styles from "./Reviews.module.css";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function Reviews({ slug, initial, average, count }: { slug: string; initial: Paginated<Review> | null; average: number; count: number }) {
  const user = useAuth((s) => s.user);
  const [items, setItems] = useState<Review[]>(initial?.items ?? []);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [loading, setLoading] = useState(false);
  const [writing, setWriting] = useState(false);

  const more = async () => {
    setLoading(true);
    try {
      const next = await api.get<Paginated<Review>>(`/products/${slug}/reviews?limit=6&page=${page + 1}`);
      setItems((x) => [...x, ...next.items]);
      setPage(next.page);
      setTotal(next.total);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="reviews">
      <div className={styles.summary}>
        <h2 id="reviews">Reviews</h2>
        {count > 0 ? (
          <p className={styles.score}>
            <span className={styles.big}>{average.toFixed(1)}</span>
            <Stars value={average} size={18} />
            <span className="muted">
              {count} review{count === 1 ? "" : "s"}
            </span>
          </p>
        ) : (
          <p className="muted">No reviews yet. Had it? Tell others what you thought.</p>
        )}
        {user ? (
          !writing && (
            <Button variant="secondary" onClick={() => setWriting(true)}>
              Write a review
            </Button>
          )
        ) : (
          <Button href={`/login?next=/product/${slug}%23reviews`} variant="secondary">
            Sign in to write a review
          </Button>
        )}
      </div>

      <div className={styles.list}>
        {writing && (
          <ReviewForm
            slug={slug}
            onDone={(r) => {
              setWriting(false);
              if (r) {
                setItems((x) => [r, ...x.filter((i) => i.user.id !== r.user.id)]);
                setTotal((t) => t + 1);
              }
            }}
          />
        )}
        {items.map((r) => (
          <article key={r.id} className={styles.review}>
            <header className={styles.reviewHead}>
              <span className={styles.avatar} aria-hidden>
                {r.user.name.charAt(0)}
              </span>
              <div>
                <p className={styles.name}>
                  {r.user.name}
                  {r.verifiedPurchase && (
                    <span className={styles.verified}>
                      <BadgeCheck size={15} aria-hidden /> Ordered this
                    </span>
                  )}
                </p>
                <p className={styles.meta}>
                  <Stars value={r.rating} size={14} /> <time dateTime={r.createdAt}>{dateFmt.format(new Date(r.createdAt))}</time>
                </p>
              </div>
            </header>
            {r.title && <h3 className={styles.title}>{r.title}</h3>}
            {r.comment && <p className={styles.comment}>{r.comment}</p>}
          </article>
        ))}
        {items.length < total && (
          <Button variant="ghost" loading={loading} onClick={more}>
            Show more reviews
          </Button>
        )}
      </div>
    </section>
  );
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: (r?: Review) => void }) {
  const user = useAuth((s) => s.user)!;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await api.post<{ review: { id: string; rating: number; comment: string; verifiedPurchase: boolean; createdAt: string } }>(`/products/${slug}/reviews`, { rating, comment });
      toast("Thanks for your review", { tone: "success" });
      const [first, last] = user.name.split(" ");
      onDone({ ...res.review, user: { id: user.id, name: last ? `${first} ${last[0]}.` : first! }, createdAt: res.review.createdAt ?? new Date().toISOString() });
    } catch (err) {
      setError(errorsFrom(err).message ?? "Check your review and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <StarInput value={rating} onChange={setRating} />
      <Field label="What did you think?" optional hint="Taste, freshness, how it looked on arrival.">
        {(p) => <Textarea {...p} value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} />}
      </Field>
      <FormError>{error}</FormError>
      <div className={styles.formActions}>
        <Button type="submit" loading={busy}>
          Post review
        </Button>
        <Button variant="ghost" onClick={() => onDone()}>
          Cancel
        </Button>
      </div>
      <p className="muted small">
        Posting as {user.name}. You can edit it later from this page. <Link href="/help#reviews" className="text-link">How reviews work</Link>
      </p>
    </form>
  );
}
