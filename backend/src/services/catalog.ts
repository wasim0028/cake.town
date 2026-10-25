import type { Types } from "mongoose";
import type { Product as ProductDTO } from "@caketown/shared";

interface VariantLike {
  _id: Types.ObjectId | string;
  label: string;
  weightGrams?: number | null;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
}

interface ProductLike {
  _id: Types.ObjectId | string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  category: unknown;
  images: { url: string; publicId?: string | null; alt?: string | null }[];
  variants: VariantLike[];
  flavours: string[];
  dietary: string[];
  egglessOption?: { available?: boolean | null; extraPrice?: number | null } | null;
  allowsMessage: boolean;
  maxMessageLength: number;
  preparationHours: number;
  tags: string[];
  isBestseller: boolean;
  isFeatured: boolean;
  isActive?: boolean;
  lowStockThreshold?: number;
  priceFrom: number;
  rating?: { average?: number | null; count?: number | null } | null;
  soldCount?: number;
}

function presentCategoryRef(category: unknown): ProductDTO["category"] {
  if (category && typeof category === "object" && "slug" in category) {
    const c = category as { _id: unknown; name: string; slug: string };
    return { id: String(c._id), name: c.name, slug: c.slug };
  }
  return { id: String(category), name: "", slug: "" };
}

/**
 * Public product shape. Customers see `inStock`; exact stock and admin fields only for admins.
 */
export function presentProduct(p: ProductLike, opts: { admin?: boolean } = {}) {
  const dto: ProductDTO & Record<string, unknown> = {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    description: p.description,
    ...(p.shortDescription ? { shortDescription: p.shortDescription } : {}),
    category: presentCategoryRef(p.category),
    images: p.images.map((i) => ({ url: i.url, ...(i.publicId ? { publicId: i.publicId } : {}), ...(i.alt ? { alt: i.alt } : {}) })),
    variants: p.variants.map((v) => ({
      id: String(v._id),
      label: v.label,
      ...(v.weightGrams ? { weightGrams: v.weightGrams } : {}),
      price: v.price,
      ...(v.compareAtPrice ? { compareAtPrice: v.compareAtPrice } : {}),
      inStock: v.stock > 0,
      ...(opts.admin ? { stock: v.stock, sku: (v as VariantLike & { sku?: string }).sku } : {}),
    })),
    flavours: p.flavours,
    dietary: p.dietary as ProductDTO["dietary"],
    egglessOption: { available: Boolean(p.egglessOption?.available), extraPrice: p.egglessOption?.extraPrice ?? 0 },
    allowsMessage: p.allowsMessage,
    maxMessageLength: p.maxMessageLength,
    preparationHours: p.preparationHours,
    tags: p.tags,
    isBestseller: p.isBestseller,
    isFeatured: p.isFeatured,
    priceFrom: p.priceFrom,
    rating: { average: Math.round((p.rating?.average ?? 0) * 10) / 10, count: p.rating?.count ?? 0 },
  };
  if (opts.admin) {
    dto.isActive = p.isActive;
    dto.lowStockThreshold = p.lowStockThreshold;
    dto.soldCount = p.soldCount;
  }
  return dto;
}
