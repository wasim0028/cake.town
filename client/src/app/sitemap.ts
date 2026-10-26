import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/posts";
import { getCategories, getClasses, getProducts } from "@/lib/server-api";

import { SITE as S } from "@/lib/site";

const SITE = S.url;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, classes] = await Promise.all([getCategories(), getClasses()]);
  // Every product, page by page (the API returns at most 60 at a time).
  const products: { slug: string }[] = [];
  for (let page = 1; page <= 50; page++) {
    const r = await getProducts(`limit=60&sort=newest&page=${page}`);
    products.push(...(r?.items ?? []));
    if (!r || page >= r.totalPages) break;
  }
  const now = new Date();
  const page = (path: string, priority = 0.6): MetadataRoute.Sitemap[number] => ({ url: `${SITE}${path}`, lastModified: now, priority });
  return [
    page("/", 1),
    page("/shop", 0.9),
    page("/cake-builder", 0.8),
    page("/classes", 0.7),
    page("/about", 0.5),
    page("/contact", 0.5),
    page("/help", 0.5),
    page("/blog", 0.5),
    ...categories.map((c) => page(`/shop/${c.slug}`, 0.8)),
    ...products.map((p) => page(`/product/${p.slug}`, 0.7)),
    ...classes.map((c) => page(`/classes/${c.slug}`, 0.6)),
    ...POSTS.map((p) => ({ url: `${SITE}/blog/${p.slug}`, lastModified: new Date(p.date), priority: 0.4 })),
  ];
}
