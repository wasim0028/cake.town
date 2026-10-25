import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/posts";
import { getCategories, getClasses, getProducts } from "@/lib/server-api";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, classes] = await Promise.all([getCategories(), getProducts("limit=60&sort=newest"), getClasses()]);
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
    ...(products?.items ?? []).map((p) => page(`/product/${p.slug}`, 0.7)),
    ...classes.map((c) => page(`/classes/${c.slug}`, 0.6)),
    ...POSTS.map((p) => ({ url: `${SITE}/blog/${p.slug}`, lastModified: new Date(p.date), priority: 0.4 })),
  ];
}
