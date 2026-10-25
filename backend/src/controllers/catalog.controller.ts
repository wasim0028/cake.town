import crypto from "node:crypto";
import type { Request, Response } from "express";
import mongoose, { type FilterQuery, type SortOrder } from "mongoose";
import { z } from "zod";
import {
  categoryInputSchema,
  paginationSchema,
  productInputSchema,
  productQuerySchema,
  productUpdateSchema,
  reviewInputSchema,
  type ProductQuery,
} from "@caketown/shared";
import { Category, Order, Product, Review, slugify, type ProductDoc } from "../models";
import type { ProductFields } from "../models/Product";
import { cache, CACHE_KEYS, invalidateCatalog } from "../services/cache";
import { presentProduct } from "../services/catalog";
import { deleteImages } from "../services/cloudinary";
import { conflict, notFound } from "../utils/errors";
import { paginate, parse, parsePatch, userId } from "../utils/http";

const reviewModerationSchema = z.object({ isHidden: z.boolean() });

/* ---------- categories ---------- */

export async function listCategories(_req: Request, res: Response) {
  const categories = await cache.wrap(CACHE_KEYS.categories, 600, async () => {
    const [cats, counts] = await Promise.all([
      Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
      Product.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
        { $match: { isActive: true } },
        { $group: { _id: "$category", n: { $sum: 1 } } },
      ]),
    ]);
    const countBy = new Map(counts.map((c) => [String(c._id), c.n]));
    return cats.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      sortOrder: c.sortOrder,
      productCount: countBy.get(String(c._id)) ?? 0,
    }));
  });
  res.json({ items: categories });
}

export async function createCategory(req: Request, res: Response) {
  const input = parse(categoryInputSchema, req.body);
  const category = await Category.create({ ...input, slug: input.slug ?? slugify(input.name) });
  await invalidateCatalog();
  res.status(201).json({ category });
}

export async function updateCategory(req: Request, res: Response) {
  const input = parsePatch(categoryInputSchema.partial(), req.body);
  const category = await Category.findById(req.params.id);
  if (!category) throw notFound("Category");
  const oldImage = category.image?.publicId;
  category.set(input);
  await category.save();
  if (input.image && oldImage && oldImage !== input.image.publicId) await deleteImages([oldImage]);
  await invalidateCatalog();
  res.json({ category });
}

export async function deleteCategory(req: Request, res: Response) {
  const inUse = await Product.countDocuments({ category: req.params.id });
  if (inUse) throw conflict(`Move or delete the ${inUse} product(s) in this category first`, "CATEGORY_IN_USE");
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw notFound("Category");
  await deleteImages([category.image?.publicId]);
  await invalidateCatalog();
  res.status(204).end();
}

/* ---------- products (public) ---------- */

async function buildProductFilter(q: ProductQuery): Promise<FilterQuery<ProductFields> | null> {
  const filter: FilterQuery<ProductFields> = { isActive: true };
  if (q.category) {
    const cat = await Category.findOne({ slug: q.category, isActive: true }).select("_id").lean();
    if (!cat) return null;
    filter.category = cat._id;
  }
  if (q.dietary?.length) filter.dietary = { $all: q.dietary };
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.priceFrom = {
      ...(q.minPrice !== undefined ? { $gte: q.minPrice } : {}),
      ...(q.maxPrice !== undefined ? { $lte: q.maxPrice } : {}),
    };
  }
  if (q.bestseller !== undefined) filter.isBestseller = q.bestseller;
  if (q.featured !== undefined) filter.isFeatured = q.featured;
  if (q.q) filter.$text = { $search: q.q };
  return filter;
}

const SORTS: Record<ProductQuery["sort"], Record<string, SortOrder>> = {
  popular: { isBestseller: -1, soldCount: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  price_asc: { priceFrom: 1, _id: 1 },
  price_desc: { priceFrom: -1, _id: 1 },
  rating: { "rating.average": -1, "rating.count": -1, _id: 1 },
};

export async function listProducts(req: Request, res: Response) {
  const q = parse(productQuerySchema, req.query);
  const key = CACHE_KEYS.productList(crypto.createHash("sha1").update(JSON.stringify(q)).digest("hex"));

  const result = await cache.wrap(key, 120, async () => {
    const filter = await buildProductFilter(q);
    if (!filter) return paginate([], 0, q.page, q.limit);
    // With a search term, "popular" means "most relevant".
    const sort = q.q && q.sort === "popular" ? { score: { $meta: "textScore" as const } } : SORTS[q.sort];
    const query = Product.find(filter, q.q ? { score: { $meta: "textScore" } } : {})
      .sort(sort)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate("category", "name slug")
      .lean();
    const [items, total] = await Promise.all([query, Product.countDocuments(filter)]);
    return paginate(items.map((p) => presentProduct(p as never)), total, q.page, q.limit);
  });
  res.json(result);
}

async function findActiveProduct(slug: string) {
  return Product.findOne({ slug, isActive: true }).populate("category", "name slug").lean();
}

export async function getProduct(req: Request, res: Response) {
  const slug = String(req.params.slug);
  const product = await cache.wrap(CACHE_KEYS.productDetail(slug), 300, async () => {
    const p = await findActiveProduct(slug);
    return p ? presentProduct(p as never) : null;
  });
  if (!product) throw notFound("Product");
  res.json({ product });
}

export async function relatedProducts(req: Request, res: Response) {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).select("category").lean();
  if (!product) throw notFound("Product");
  const items = await Product.find({ isActive: true, category: product.category, _id: { $ne: product._id } })
    .sort({ soldCount: -1 })
    .limit(8)
    .populate("category", "name slug")
    .lean();
  res.json({ items: items.map((p) => presentProduct(p as never)) });
}

/* ---------- reviews ---------- */

async function recomputeRating(productId: mongoose.Types.ObjectId | string) {
  const [stats] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)), isHidden: false } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, { $set: { "rating.average": stats?.avg ?? 0, "rating.count": stats?.count ?? 0 } });
  await invalidateCatalog();
}

export async function listReviews(req: Request, res: Response) {
  const { page, limit } = parse(paginationSchema, req.query);
  const product = await Product.findOne({ slug: req.params.slug }).select("_id").lean();
  if (!product) throw notFound("Product");
  const filter = { product: product._id, isHidden: false };
  const [reviews, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name avatar").lean(),
    Review.countDocuments(filter),
  ]);
  const items = reviews.map((r) => {
    const u = r.user as unknown as { _id: unknown; name: string; avatar?: string } | null;
    return {
      id: String(r._id),
      // First name + initial only, for privacy.
      user: u ? { id: String(u._id), name: shortName(u.name), ...(u.avatar ? { avatar: u.avatar } : {}) } : { id: "", name: "Customer" },
      rating: r.rating,
      ...(r.title ? { title: r.title } : {}),
      comment: r.comment,
      verifiedPurchase: r.verifiedPurchase,
      createdAt: r.createdAt.toISOString(),
    };
  });
  res.json(paginate(items, total, page, limit));
}

function shortName(name: string) {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : (first ?? "Customer");
}

export async function upsertReview(req: Request, res: Response) {
  const input = parse(reviewInputSchema, req.body);
  const uid = userId(req);
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).select("_id").lean();
  if (!product) throw notFound("Product");
  const verifiedPurchase = Boolean(await Order.exists({ user: uid, status: "delivered", "items.product": product._id }));
  const review = await Review.findOneAndUpdate(
    { product: product._id, user: uid },
    { $set: { ...input, verifiedPurchase } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await recomputeRating(product._id);
  res.status(201).json({ review });
}

export async function deleteMyReview(req: Request, res: Response) {
  const product = await Product.findOne({ slug: req.params.slug }).select("_id").lean();
  if (!product) throw notFound("Product");
  await Review.deleteOne({ product: product._id, user: userId(req) });
  await recomputeRating(product._id);
  res.status(204).end();
}

/** Admin: hide or show a review (e.g. spam). */
export async function moderateReview(req: Request, res: Response) {
  const { isHidden } = parse(reviewModerationSchema, req.body);
  const review = await Review.findByIdAndUpdate(req.params.id, { $set: { isHidden } }, { new: true });
  if (!review) throw notFound("Review");
  await recomputeRating(review.product);
  res.json({ review });
}

/* ---------- products (admin) ---------- */

function variantsWithIds(variants: { id?: string; label: string }[]) {
  return variants.map(({ id, ...v }) => ({ ...v, ...(id ? { _id: new mongoose.Types.ObjectId(id) } : {}) }));
}

export async function adminListProducts(req: Request, res: Response) {
  const { page, limit } = parse(paginationSchema, req.query);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const filter = q ? { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } } : {};
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate("category", "name slug").lean(),
    Product.countDocuments(filter),
  ]);
  res.json(paginate(items.map((p) => presentProduct(p as never, { admin: true })), total, page, limit));
}

export async function adminGetProduct(req: Request, res: Response) {
  const p = await Product.findById(req.params.id).populate("category", "name slug").lean();
  if (!p) throw notFound("Product");
  res.json({ product: presentProduct(p as never, { admin: true }) });
}

export async function createProduct(req: Request, res: Response) {
  const input = parse(productInputSchema, req.body);
  if (!(await Category.exists({ _id: input.category }))) throw notFound("Category");
  const product = new Product({ ...input, slug: input.slug ?? slugify(input.name), variants: variantsWithIds(input.variants) });
  await product.save();
  await invalidateCatalog();
  await product.populate("category", "name slug");
  res.status(201).json({ product: presentProduct(product.toObject() as never, { admin: true }) });
}

export async function updateProduct(req: Request, res: Response) {
  const input = parsePatch(productUpdateSchema, req.body);
  const product: ProductDoc | null = await Product.findById(req.params.id);
  if (!product) throw notFound("Product");
  if (input.category && !(await Category.exists({ _id: input.category }))) throw notFound("Category");

  const before = new Set(product.images.map((i) => i.publicId).filter((id): id is string => Boolean(id)));
  const { variants, ...rest } = input;
  product.set(rest);
  if (variants) product.set("variants", variantsWithIds(variants));
  await product.save();

  // Remove images that were taken off the product from Cloudinary.
  if (input.images) {
    const after = new Set(input.images.map((i) => i.publicId).filter(Boolean));
    await deleteImages([...before].filter((id) => !after.has(id)));
  }
  await invalidateCatalog();
  await product.populate("category", "name slug");
  res.json({ product: presentProduct(product.toObject() as never, { admin: true }) });
}

export async function deleteProduct(req: Request, res: Response) {
  const product = await Product.findById(req.params.id);
  if (!product) throw notFound("Product");
  const hasOrders = await Order.exists({ "items.product": product._id });
  if (hasOrders) {
    // Keep it for order history; just hide it from the shop.
    product.isActive = false;
    await product.save();
    await invalidateCatalog();
    return res.json({ archived: true, message: "This product has past orders, so it was hidden instead of deleted." });
  }
  await product.deleteOne();
  await Review.deleteMany({ product: product._id });
  await deleteImages(product.images.map((i) => i.publicId));
  await invalidateCatalog();
  res.status(204).end();
}
