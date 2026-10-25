import { type CakeCustomization, type Cart as CartDTO, type CartItemInput, type CartLine } from "@caketown/shared";
import { Cart, Product } from "../models";
import { AppError, badRequest, notFound } from "../utils/errors";
import { unitPrice } from "./pricing";

type LeanProduct = NonNullable<Awaited<ReturnType<typeof loadProduct>>>;

function loadProduct(id: string) {
  return Product.findOne({ _id: id, isActive: true }).lean();
}

/**
 * Checks one requested cart line against the live product: size exists, options are allowed,
 * builder choices only on customizable cakes. Throws an AppError with a customer-friendly message.
 */
export async function validateCartItem(input: CartItemInput, product?: LeanProduct | null) {
  const p = product === undefined ? await loadProduct(input.productId) : product;
  if (!p) throw notFound("Product");
  const variant = p.variants.find((v) => String(v._id) === input.variantId);
  if (!variant) throw notFound("Size option");
  if (input.flavour && !p.flavours.includes(input.flavour)) throw badRequest("That flavour isn't available", "INVALID_FLAVOUR");
  if (input.eggless && !p.egglessOption?.available) throw badRequest(`${p.name} isn't available eggless`, "EGGLESS_UNAVAILABLE");
  if (input.message && (!p.allowsMessage || input.message.length > p.maxMessageLength)) {
    throw badRequest(p.allowsMessage ? `Messages can be up to ${p.maxMessageLength} characters` : `${p.name} doesn't take a message`, "INVALID_MESSAGE");
  }
  if (input.custom && !p.isCustomizable) throw badRequest(`${p.name} can't be customised`, "NOT_CUSTOMIZABLE");
  if (p.isCustomizable && !input.custom) throw badRequest("Choose a shape and frosting for your cake", "CUSTOMIZATION_REQUIRED");
  return { product: p, variant };
}

export function sameLine(
  a: { product: unknown; variantId: unknown; flavour?: string | null; eggless?: boolean | null; message?: string | null; custom?: unknown },
  b: CartItemInput,
) {
  return (
    String(a.product) === b.productId &&
    String(a.variantId) === b.variantId &&
    (a.flavour ?? "") === (b.flavour ?? "") &&
    Boolean(a.eggless) === Boolean(b.eggless) &&
    (a.message ?? "") === (b.message ?? "") &&
    JSON.stringify(normCustom(a.custom)) === JSON.stringify(normCustom(b.custom))
  );
}

function normCustom(c: unknown): CakeCustomization | null {
  if (!c || typeof c !== "object") return null;
  const x = c as CakeCustomization;
  if (!x.shape) return null;
  return { shape: x.shape, frosting: x.frosting, toppings: [...(x.toppings ?? [])].sort() };
}

/**
 * Loads the user's cart with live product data and current prices. Lines whose product was
 * removed, deactivated, or is out of stock come back with `available: false` and an `issue`
 * so the UI can explain why instead of silently dropping them.
 */
export async function loadCart(userId: string): Promise<CartDTO & { raw: Awaited<ReturnType<typeof getCartDoc>> }> {
  const cart = await getCartDoc(userId);
  const productIds = cart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } }).populate<{ category: { slug: string } | null }>("category", "slug").lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items: CartLine[] = [];
  for (const item of cart.items) {
    const product = byId.get(String(item.product));
    const variant = product?.variants.find((v) => String(v._id) === String(item.variantId));
    const custom = normCustom(item.custom);
    let issue: string | undefined;
    if (!product || !product.isActive) issue = "No longer on the menu";
    else if (!variant) issue = "This size is no longer offered";
    else if (variant.stock < 1) issue = "Sold out for now";
    else if (variant.stock < item.quantity) issue = `Only ${variant.stock} left`;
    const available = !issue;
    const price = product && variant ? unitPrice(variant, product, item.eggless, custom) : 0;
    items.push({
      id: String(item._id),
      product: product
        ? { id: String(product._id), name: product.name, slug: product.slug, category: product.category?.slug ?? "", images: product.images.slice(0, 1).map((i) => ({ url: i.url })) }
        : { id: String(item.product), name: "Unavailable item", slug: "", category: "", images: [] },
      variant: { id: String(item.variantId), label: variant?.label ?? "" },
      quantity: item.quantity,
      ...(item.flavour ? { flavour: item.flavour } : {}),
      eggless: item.eggless,
      ...(item.message ? { message: item.message } : {}),
      ...(custom ? { custom } : {}),
      unitPrice: price,
      lineTotal: available ? price * item.quantity : 0,
      preparationHours: product?.preparationHours ?? 0,
      available,
      ...(issue ? { issue } : {}),
    });
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const itemCount = items.filter((i) => i.available).reduce((s, i) => s + i.quantity, 0);
  return { items, itemCount, subtotal, raw: cart };
}

export async function getCartDoc(userId: string) {
  return (
    (await Cart.findOne({ user: userId })) ??
    (await Cart.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, items: [] } }, { upsert: true, new: true }))!
  );
}

/** Strip the raw document before sending the cart to the client. */
export function publicCart(cart: Awaited<ReturnType<typeof loadCart>>): CartDTO {
  const { raw: _raw, ...rest } = cart;
  return rest;
}

/** Stock check for a requested quantity, with a clear message. */
export function assertStock(variant: { stock: number }, quantity: number) {
  if (quantity > 20) throw badRequest("You can add up to 20 of one item", "MAX_QUANTITY");
  if (variant.stock < quantity) throw new AppError(409, "OUT_OF_STOCK", variant.stock ? `Only ${variant.stock} left` : "This is sold out");
}
