import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { Address, BakingClass, Booking, Category, Order, Paginated, Product, Review } from "@caketown/shared";
import { api } from "./api";

export const useCategories = () => useQuery({ queryKey: ["categories"], queryFn: () => api.get<{ items: Category[] }>("/categories").then((r) => r.items), staleTime: 10 * 60_000 });

export const useBestsellers = () =>
  useQuery({ queryKey: ["bestsellers"], queryFn: () => api.get<Paginated<Product>>("/products?bestseller=true&sort=popular&limit=10").then((r) => r.items) });

export function useProducts(params: { q?: string; category?: string; dietary?: string[]; sort?: string }) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);
  params.dietary?.forEach((d) => qs.append("dietary", d));
  qs.set("sort", params.sort ?? "popular");
  qs.set("limit", "12");
  const key = qs.toString();
  return useInfiniteQuery({
    queryKey: ["products", key],
    queryFn: ({ pageParam }) => api.get<Paginated<Product>>(`/products?${key}&page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

export const useProduct = (slug: string) => useQuery({ queryKey: ["product", slug], queryFn: () => api.get<{ product: Product }>(`/products/${slug}`).then((r) => r.product) });
export const useRelated = (slug: string) => useQuery({ queryKey: ["related", slug], queryFn: () => api.get<{ items: Product[] }>(`/products/${slug}/related`).then((r) => r.items) });
export const useReviews = (slug: string) => useQuery({ queryKey: ["reviews", slug], queryFn: () => api.get<Paginated<Review>>(`/products/${slug}/reviews?limit=5`) });

export const useClasses = () => useQuery({ queryKey: ["classes"], queryFn: () => api.get<{ items: BakingClass[] }>("/classes").then((r) => r.items) });
export const useClass = (slug: string) => useQuery({ queryKey: ["class", slug], queryFn: () => api.get<{ class: BakingClass }>(`/classes/${slug}`).then((r) => r.class) });

export const useOrders = (enabled = true) => useQuery({ queryKey: ["orders"], queryFn: () => api.get<Paginated<Order>>("/orders?limit=30").then((r) => r.items), enabled });
export const useOrder = (id: string) =>
  useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<{ order: Order }>(`/orders/${id}`).then((r) => r.order),
    refetchInterval: (q) => (["delivered", "cancelled"].includes(q.state.data?.status ?? "") ? false : 30_000),
  });
export const useAddresses = (enabled = true) => useQuery({ queryKey: ["addresses"], queryFn: () => api.get<{ items: Address[] }>("/me/addresses").then((r) => r.items), enabled });
export const useWishlist = (enabled = true) => useQuery({ queryKey: ["wishlist"], queryFn: () => api.get<{ items: Product[] }>("/me/wishlist").then((r) => r.items), enabled });
export const useBookings = (enabled = true) => useQuery({ queryKey: ["bookings"], queryFn: () => api.get<{ items: Booking[] }>("/me/bookings").then((r) => r.items), enabled });
export const useConfig = () => useQuery({ queryKey: ["config"], queryFn: () => api.get<{ payments: { razorpay: boolean; cod: boolean } }>("/config"), staleTime: 5 * 60_000 });
