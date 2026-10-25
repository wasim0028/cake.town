import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShopView } from "@/components/shop/ShopView";
import { getCategories, getProducts } from "@/lib/server-api";

export const revalidate = 120;

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  if (!cat) return { title: "Not found" };
  return {
    title: cat.name,
    description: cat.description ?? `${cat.name} from caketown, baked fresh and delivered.`,
    alternates: { canonical: `/shop/${cat.slug}` },
  };
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
      <PageHeader title={cat.name} intro={cat.description} crumbs={[{ href: "/shop", label: "Menu" }, { href: `/shop/${cat.slug}`, label: cat.name }]} compact />
      <Suspense>
        <ShopView categories={categories} category={cat.slug} initial={initial} />
      </Suspense>
    </>
  );
}
