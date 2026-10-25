import type { Request, Response } from "express";
import {
  addressInputSchema,
  addressUpdateSchema,
  cartItemInputSchema,
  cartItemUpdateSchema,
  cartReplaceSchema,
  checkoutSchema,
  CUSTOMER_CANCELLABLE,
  paginationSchema,
  quoteSchema,
  verifyPaymentSchema,
} from "@caketown/shared";
import { logger } from "../config/logger";
import { Address, Order, Product, User } from "../models";
import { presentProduct } from "../services/catalog";
import { assertStock, getCartDoc, loadCart, publicCart, sameLine, validateCartItem } from "../services/cart";
import { cancelOrder, placeOrder } from "../services/orders";
import { handleRazorpayWebhook, verifyClientPayment } from "../services/payments";
import { deliveryFeeFor, evaluateCoupon } from "../services/pricing";
import { verifyWebhookSignature } from "../services/razorpay";
import { AppError, badRequest, notFound } from "../utils/errors";
import { paginate, parse, parsePatch, userId } from "../utils/http";

/* ---------- cart ---------- */

export async function getCart(req: Request, res: Response) {
  res.json({ cart: publicCart(await loadCart(userId(req))) });
}

export async function addCartItem(req: Request, res: Response) {
  const input = parse(cartItemInputSchema, req.body);
  const { product, variant } = await validateCartItem(input);
  const cart = await getCartDoc(userId(req));
  // Same product + same options → increase quantity instead of adding a second line.
  const same = cart.items.find((i) => sameLine(i, input));
  const newQty = (same?.quantity ?? 0) + input.quantity;
  assertStock(variant, newQty);

  if (same) same.quantity = newQty;
  else {
    cart.items.push({
      product: product._id,
      variantId: variant._id,
      quantity: input.quantity,
      flavour: input.flavour,
      eggless: input.eggless,
      message: input.message,
      custom: input.custom,
    });
  }
  await cart.save();
  res.status(201).json({ cart: publicCart(await loadCart(userId(req))) });
}

/**
 * Replaces the whole cart, e.g. when a guest signs in and their browser cart becomes their
 * account cart. Valid lines are kept; each rejected line comes back with the reason.
 */
export async function replaceCart(req: Request, res: Response) {
  const { items } = parse(cartReplaceSchema, req.body);
  const accepted: { product: unknown; variantId: unknown; quantity: number; flavour?: string; eggless: boolean; message?: string; custom?: unknown }[] = [];
  const rejected: { index: number; code: string; message: string }[] = [];

  for (const [index, raw] of items.entries()) {
    const parsed = cartItemInputSchema.safeParse(raw);
    if (!parsed.success) {
      rejected.push({ index, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid item" });
      continue;
    }
    const input = parsed.data;
    try {
      const { product, variant } = await validateCartItem(input);
      const existing = accepted.find((a) => sameLine(a, input));
      const qty = (existing?.quantity ?? 0) + input.quantity;
      assertStock(variant, qty);
      if (existing) existing.quantity = qty;
      else accepted.push({ product: product._id, variantId: variant._id, quantity: input.quantity, flavour: input.flavour, eggless: input.eggless, message: input.message, custom: input.custom });
    } catch (err) {
      if (!(err instanceof AppError)) throw err;
      rejected.push({ index, code: err.code, message: err.message });
    }
  }

  const cart = await getCartDoc(userId(req));
  cart.set("items", accepted);
  await cart.save();
  res.json({ cart: publicCart(await loadCart(userId(req))), rejected });
}

export async function updateCartItem(req: Request, res: Response) {
  const { quantity } = parse(cartItemUpdateSchema, req.body);
  const cart = await getCartDoc(userId(req));
  const item = cart.items.id(String(req.params.itemId));
  if (!item) throw notFound("Cart item");
  const product = await Product.findById(item.product).select("variants").lean();
  const variant = product?.variants.find((v) => String(v._id) === String(item.variantId));
  if (variant) assertStock(variant, quantity);
  item.quantity = quantity;
  await cart.save();
  res.json({ cart: publicCart(await loadCart(userId(req))) });
}

export async function removeCartItem(req: Request, res: Response) {
  const cart = await getCartDoc(userId(req));
  cart.items.pull({ _id: String(req.params.itemId) });
  await cart.save();
  res.json({ cart: publicCart(await loadCart(userId(req))) });
}

export async function clearCart(req: Request, res: Response) {
  const cart = await getCartDoc(userId(req));
  cart.set("items", []);
  await cart.save();
  res.json({ cart: publicCart(await loadCart(userId(req))) });
}

/** Price summary for the checkout page, including coupon feedback. */
export async function quote(req: Request, res: Response) {
  const { couponCode } = parse(quoteSchema, req.body ?? {});
  const uid = userId(req);
  const cart = await loadCart(uid);
  const coupon = await evaluateCoupon(couponCode, cart.subtotal, uid);
  const deliveryFee = deliveryFeeFor(cart.subtotal - coupon.discount);
  res.json({
    quote: {
      subtotal: cart.subtotal,
      discount: coupon.discount,
      deliveryFee,
      total: cart.subtotal - coupon.discount + deliveryFee,
      ...(coupon.coupon ? { coupon: { code: coupon.coupon.code, description: coupon.coupon.description } } : {}),
      ...(coupon.error ? { couponError: coupon.error } : {}),
    },
  });
}

/* ---------- addresses ---------- */

export async function listAddresses(req: Request, res: Response) {
  const items = await Address.find({ user: userId(req) }).sort({ isDefault: -1, updatedAt: -1 });
  res.json({ items });
}

async function clearOtherDefaults(uid: string, keepId: unknown) {
  await Address.updateMany({ user: uid, _id: { $ne: keepId } }, { $set: { isDefault: false } });
}

export async function createAddress(req: Request, res: Response) {
  const input = parse(addressInputSchema, req.body);
  const uid = userId(req);
  const count = await Address.countDocuments({ user: uid });
  if (count >= 20) throw badRequest("You can save up to 20 addresses", "TOO_MANY_ADDRESSES");
  const address = await Address.create({ ...input, user: uid, isDefault: input.isDefault || count === 0 });
  if (address.isDefault) await clearOtherDefaults(uid, address._id);
  res.status(201).json({ address });
}

export async function updateAddress(req: Request, res: Response) {
  const input = parsePatch(addressUpdateSchema, req.body);
  const uid = userId(req);
  const address = await Address.findOneAndUpdate({ _id: req.params.id, user: uid }, { $set: input }, { new: true });
  if (!address) throw notFound("Address");
  if (input.isDefault) await clearOtherDefaults(uid, address._id);
  res.json({ address });
}

export async function deleteAddress(req: Request, res: Response) {
  const uid = userId(req);
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: uid });
  if (!address) throw notFound("Address");
  if (address.isDefault) {
    const next = await Address.findOne({ user: uid }).sort({ updatedAt: -1 });
    if (next) await Address.updateOne({ _id: next._id }, { $set: { isDefault: true } });
  }
  res.status(204).end();
}

/* ---------- wishlist ---------- */

export async function getWishlist(req: Request, res: Response) {
  const user = await User.findById(userId(req)).select("wishlist").lean();
  const products = await Product.find({ _id: { $in: user?.wishlist ?? [] }, isActive: true }).populate("category", "name slug").lean();
  res.json({ items: products.map((p) => presentProduct(p as never)) });
}

export async function addToWishlist(req: Request, res: Response) {
  if (!(await Product.exists({ _id: req.params.productId, isActive: true }))) throw notFound("Product");
  await User.updateOne({ _id: userId(req) }, { $addToSet: { wishlist: req.params.productId } });
  res.status(204).end();
}

export async function removeFromWishlist(req: Request, res: Response) {
  await User.updateOne({ _id: userId(req) }, { $pull: { wishlist: req.params.productId } });
  res.status(204).end();
}

/* ---------- orders ---------- */

export async function checkout(req: Request, res: Response) {
  const input = parse(checkoutSchema, req.body);
  const result = await placeOrder(userId(req), input);
  res.status(201).json({ order: result.order, ...(result.razorpay ? { razorpay: result.razorpay } : {}) });
}

export async function listMyOrders(req: Request, res: Response) {
  const { page, limit } = parse(paginationSchema, req.query);
  const filter = { user: userId(req) };
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json(paginate(items, total, page, limit));
}

export async function getMyOrder(req: Request, res: Response) {
  const order = await Order.findOne({ _id: req.params.id, user: userId(req) });
  if (!order) throw notFound("Order");
  res.json({ order });
}

export async function cancelMyOrder(req: Request, res: Response) {
  const uid = userId(req);
  if (!(await Order.exists({ _id: req.params.id, user: uid }))) throw notFound("Order");
  const order = await cancelOrder(String(req.params.id), {
    reason: "Cancelled by customer",
    by: uid,
    allowedFrom: CUSTOMER_CANCELLABLE,
  });
  res.json({ order });
}

/** Re-adds a past order's items to the cart ("Order again"). */
export async function reorder(req: Request, res: Response) {
  const uid = userId(req);
  const order = await Order.findOne({ _id: req.params.id, user: uid }).lean();
  if (!order) throw notFound("Order");
  const cart = await getCartDoc(uid);
  const skipped: string[] = [];
  for (const item of order.items) {
    const product = await Product.findOne({ _id: item.product, isActive: true }).select("variants").lean();
    const variant = product?.variants.find((v) => String(v._id) === String(item.variantId));
    if (!variant || variant.stock < item.quantity) {
      skipped.push(item.name);
      continue;
    }
    cart.items.push({
      product: item.product,
      variantId: item.variantId,
      quantity: item.quantity,
      flavour: item.flavour,
      eggless: item.eggless,
      message: item.message,
      custom: item.custom ?? undefined,
    });
  }
  await cart.save();
  res.json({ cart: publicCart(await loadCart(uid)), skipped });
}

/* ---------- payments ---------- */

export async function verifyPayment(req: Request, res: Response) {
  const input = parse(verifyPaymentSchema, req.body);
  const result = await verifyClientPayment(userId(req), input);
  res.json({ status: result.status, [result.target.kind]: { id: result.target.id } });
}

/** POST /api/v1/payments/razorpay/webhook — mounted with a raw body parser. */
export async function razorpayWebhook(req: Request, res: Response) {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, req.get("x-razorpay-signature"))) {
    logger.warn("Rejected Razorpay webhook with a bad signature");
    return res.status(400).json({ error: { code: "BAD_SIGNATURE", message: "Invalid signature" } });
  }
  const body = JSON.parse(raw.toString("utf8"));
  await handleRazorpayWebhook(body, req.get("x-razorpay-event-id"));
  res.json({ ok: true });
}
