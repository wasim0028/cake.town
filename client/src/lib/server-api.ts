import "server-only";
import type { BakingClass, Category, Paginated, Product, Review } from "@caketown/shared";

/**
 * Server-side reads for public pages (rendered on the server for SEO and speed).
 * Calls the Express API directly and caches for a few minutes; if the API is down the page
 * still renders with an empty state instead of crashing.
 */
const API_URL = process.env.API_URL ?? "http://localhost:5000";

async function get<T>(path: string, revalidate = 120): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, { next: { revalidate, tags: ["catalog"] } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getBestsellers(limit = 8): Promise<Product[]> {
  const data = await get<Paginated<Product>>(`/products?bestseller=true&sort=popular&limit=${limit}`);
  return data?.items ?? [];
}

export async function getProducts(query = ""): Promise<Paginated<Product> | null> {
  return get<Paginated<Product>>(`/products${query ? `?${query}` : ""}`);
}

export async function getCategories(): Promise<Category[]> {
  const data = await get<{ items: Category[] }>("/categories", 600);
  return data?.items ?? [];
}

export async function getClasses(): Promise<BakingClass[]> {
  const data = await get<{ items: BakingClass[] }>("/classes", 300);
  return data?.items ?? [];
}

export async function getProduct(slug: string): Promise<Product | null> {
  const data = await get<{ product: Product }>(`/products/${encodeURIComponent(slug)}`, 60);
  return data?.product ?? null;
}

export async function getRelated(slug: string): Promise<Product[]> {
  const data = await get<{ items: Product[] }>(`/products/${encodeURIComponent(slug)}/related`, 300);
  return data?.items ?? [];
}

export async function getReviews(slug: string): Promise<Paginated<Review> | null> {
  return get<Paginated<Review>>(`/products/${encodeURIComponent(slug)}/reviews?limit=6`, 60);
}

export async function getLatestReviews(): Promise<Review[]> {
  const data = await get<{ items: Review[] }>("/reviews/latest?limit=6", 300);
  return data?.items ?? [];
}

export async function getClass(slug: string): Promise<BakingClass | null> {
  const data = await get<{ class: BakingClass }>(`/classes/${encodeURIComponent(slug)}`, 60);
  return data?.class ?? null;
}
