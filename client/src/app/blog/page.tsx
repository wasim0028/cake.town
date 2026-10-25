import type { Metadata } from "next";
import Link from "next/link";
import { BakeArt } from "@/components/art/BakeArt";
import { PageHeader } from "@/components/layout/PageHeader";
import { POSTS } from "@/lib/posts";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Recipes & notes",
  description: "Storage tips, how we bake, and guides from the caketown kitchen.",
  alternates: { canonical: "/blog" },
};

const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default function BlogPage() {
  return (
    <>
      <PageHeader title="Recipes & notes" intro="Short guides from our kitchen: how to look after what you order, and why we bake the way we do." crumbs={[{ href: "/blog", label: "Recipes & notes" }]} />
      <ul role="list" className={`container ${styles.posts}`}>
        {POSTS.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className={styles.post}>
              <span className={styles.postArt}>
                <BakeArt name={p.art.name} category={p.art.category} />
              </span>
              <h2>{p.title}</h2>
              <p className="muted">{p.summary}</p>
              <p className="muted small">
                {fmt.format(new Date(p.date))} · {p.minutes} min read
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
