import type { Metadata } from "next";

/** Public facts about the shop, used for canonical URLs, share images and Google's structured data. */
export const SITE = {
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  name: "caketown",
  tagline: "Fresh baked happiness, delivered",
  description:
    "Cakes made to order, breads and pastries baked every morning, delivered in a three-hour slot you choose. Eggless options on most cakes.",
  email: "hello@caketown.in",
  phone: process.env.NEXT_PUBLIC_SHOP_PHONE || undefined,
  address: process.env.NEXT_PUBLIC_SHOP_ADDRESS || undefined,
  city: process.env.NEXT_PUBLIC_SHOP_CITY || "Bengaluru",
  pincode: process.env.NEXT_PUBLIC_SHOP_PINCODE || undefined,
};

export const abs = (path: string) => (path.startsWith("http") ? path : `${SITE.url}${path.startsWith("/") ? "" : "/"}${path}`);

const DEFAULT_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE.name}: ${SITE.tagline.toLowerCase()}` };

/**
 * Full metadata for a public page: title, description, canonical URL, and matching Open Graph and
 * Twitter tags. (Next.js replaces the site-wide openGraph object rather than merging it, so every
 * page sets all of it.) Leave `image` out on pages that have their own opengraph-image file.
 */
export function pageMeta({ title, description, path, image, type = "website", publishedTime }: { title: string; description: string; path: string; image?: { url: string; alt?: string } | false; type?: "website" | "article"; publishedTime?: string }): Metadata {
  const fullTitle = `${title} · ${SITE.name}`;
  const images = image === false ? undefined : [image ?? DEFAULT_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { siteName: SITE.name, locale: "en_IN", type, title: fullTitle, description, url: path, ...(images ? { images } : {}), ...(publishedTime ? { publishedTime } : {}) },
    twitter: { card: "summary_large_image", title: fullTitle, description, ...(images ? { images } : {}) },
  };
}
