import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BakeArt } from "@/components/art/BakeArt";
import { Prose } from "@/components/content/Prose";
import { PageHeader } from "@/components/layout/PageHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { POSTS } from "@/lib/posts";
import { abs, pageMeta, SITE } from "@/lib/site";
import styles from "../../content.module.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return { title: "Not found" };
  return pageMeta({ title: post.title, description: post.summary, path: `/blog/${post.slug}`, type: "article", publishedTime: post.date });
}

const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) notFound();
  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.summary,
          datePublished: post.date,
          mainEntityOfPage: abs(`/blog/${post.slug}`),
          author: { "@type": "Organization", name: SITE.name, url: SITE.url },
          publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: abs("/icon.svg") } },
          inLanguage: "en-IN",
        }}
      />
      <PageHeader title={post.title} intro={post.summary} crumbs={[{ href: "/blog", label: "Recipes & notes" }, { href: `/blog/${post.slug}`, label: post.title }]}>
        <p className="muted small" style={{ marginTop: "0.75rem" }}>
          <time dateTime={post.date}>{fmt.format(new Date(post.date))}</time> · {post.minutes} min read
        </p>
      </PageHeader>
      <div className={`container ${styles.article}`}>
        <div className={styles.articleArt} aria-hidden>
          <BakeArt name={post.art.name} category={post.art.category} />
        </div>
        <Prose blocks={post.body} />
      </div>
    </article>
  );
}
