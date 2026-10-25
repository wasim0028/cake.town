import type { Cart as CartDTO, CartLine } from "@caketown/shared";
import { Cart, Product } from "../models";
import { unitPrice } from "./pricing";

/**
 * Loads the user's cart with live product data and current prices. Lines whose product was
 * removed, deactivated, or is out of stock come back with `available: false` so the UI can
 * explain why instead of silently dropping them.
 */
export async function loadCart(userId: string): Promise<CartDTO & { raw: Awaited<ReturnType<typeof getCartDoc>> }> {
  const cart = await getCartDoc(userId);
  const productIds = cart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items: CartLine[] = [];
  for (const item of cart.items) {
    const product = byId.get(String(item.product));
    const variant = product?.variants.find((v) => String(v._id) === String(item.variantId));
    const available = Boolean(product?.isActive && variant && variant.stock >= item.quantity);
    const price = product && variant ? unitPrice(variant, product, item.eggless) : 0;
    items.push({
      id: String(item._id),
      product: product
        ? { id: String(product._id), name: product.name, slug: product.slug, images: product.images.slice(0, 1).map((i) => ({ url: i.url })) }
        : { id: String(item.product), name: "Unavailable item", slug: "", images: [] },
      variant: { id: String(item.variantId), label: variant?.label ?? "" },
      quantity: item.quantity,
      ...(item.flavour ? { flavour: item.flavour } : {}),
      eggless: item.eggless,
      ...(item.message ? { message: item.message } : {}),
      unitPrice: price,
      lineTotal: available ? price * item.quantity : 0,
      available,
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
