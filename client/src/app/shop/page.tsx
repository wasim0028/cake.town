import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShopView } from "@/components/shop/ShopView";
import { getCategories, getProducts } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "The menu",
  description: "Cakes, breads, pastries, cupcakes and cookies from caketown, baked fresh and delivered in a slot you choose.",
  alternates: { canonical: "/shop" },
};

export const revalidate = 120;

export default async function ShopPage() {
  const [categories, initial] = await Promise.all([getCategories(), getProducts("sort=popular&page=1&limit=12")]);
  return (
    <>
      <PageHeader title="The menu" intro="Everything we bake, from celebration cakes to the morning's bread. Filter by what you need, or search for a flavour." crumbs={[{ href: "/shop", label: "Menu" }]} compact />
      <Suspense>
        <ShopView categories={categories} initial={initial} />
      </Suspense>
    </>
  );
}
