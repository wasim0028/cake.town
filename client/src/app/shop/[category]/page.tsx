import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShopView } from "@/components/shop/ShopView";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCategories, getProducts } from "@/lib/server-api";
import { abs, pageMeta } from "@/lib/site";

export const revalidate = 120;

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  if (!cat) return { title: "Not found" };
  return pageMeta({ title: cat.name, description: cat.description ?? `${cat.name} from caketown, baked fresh and delivered.`, path: `/shop/${cat.slug}`, image: cat.image ? { url: cat.image.url, alt: cat.name } : undefined });
}

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ category: c.slug }));
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const categories = await getCategories();
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();
  const initial = await getProducts(`category=${cat.slug}&sort=popular&page=1&limit=12`);
  return (
    <>
      {initial && initial.items.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: cat.name,
            itemListElement: initial.items.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/product/${p.slug}`), name: p.name })),
          }}
        />
      )}
      <PageHeader title={cat.name} intro={cat.description} crumbs={[{ href: "/shop", label: "Menu" }, { href: `/shop/${cat.slug}`, label: cat.name }]} compact />
      <Suspense>
        <ShopView categories={categories} category={cat.slug} initial={initial} />
      </Suspense>
    </>
  );
}
