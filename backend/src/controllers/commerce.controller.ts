import type { Request, Response } from "express";
import {
  addressInputSchema,
  addressUpdateSchema,
  cartItemInputSchema,
  cartItemUpdateSchema,
  checkoutSchema,
  CUSTOMER_CANCELLABLE,
  paginationSchema,
  quoteSchema,
  verifyPaymentSchema,
} from "@caketown/shared";
import { logger } from "../config/logger";
import { Address, Order, Product, User } from "../models";
import { presentProduct } from "../services/catalog";
import { getCartDoc, loadCart, publicCart } from "../services/cart";
import { cancelOrder, placeOrder } from "../services/orders";
import { handleRazorpayWebhook, verifyClientPayment } from "../services/payments";
import { deliveryFeeFor, evaluateCoupon } from "../services/pricing";
import { verifyWebhookSignature } from "../services/razorpay";
import { AppError, badRequest, notFound } from "../utils/errors";
import { paginate, parse, userId } from "../utils/http";

/* ---------- cart ---------- */

export async function getCart(req: Request, res: Response) {
  res.json({ cart: publicCart(await loadCart(userId(req))) });
}

export async function addCartItem(req: Request, res: Response) {
  const input = parse(cartItemInputSchema, req.body);
  const product = await Product.findOne({ _id: input.productId, isActive: true }).lean();
  if (!product) throw notFound("Product");
  const variant = product.variants.find((v) => String(v._id) === input.variantId);
  if (!variant) throw notFound("Size option");
  if (input.flavour && !product.flavours.includes(input.flavour)) throw badRequest("That flavour isn't available", "INVALID_FLAVOUR");
  if (input.eggless && !product.egglessOption?.available) throw badRequest("This item isn't available eggless", "EGGLESS_UNAVAILABLE");
  if (input.message && (!product.allowsMessage || input.message.length > product.maxMessageLength)) {
    throw badRequest(product.allowsMessage ? `Messages can be up to ${product.maxMessageLength} characters` : "This item doesn't take a message", "INVALID_MESSAGE");
  }

  const cart = await getCartDoc(userId(req));
  // Same product + options → increase quantity instead of adding a second line.
  const same = cart.items.find(
    (i) =>
      String(i.product) === input.productId &&
      String(i.variantId) === input.variantId &&
      (i.flavour ?? "") === (input.flavour ?? "") &&
      i.eggless === input.eggless &&
      (i.message ?? "") === (input.message ?? ""),
  );
  const newQty = (same?.quantity ?? 0) + input.quantity;
  if (newQty > 20) throw badRequest("You can add up to 20 of one item", "MAX_QUANTITY");
  if (variant.stock < newQty) throw new AppError(409, "OUT_OF_STOCK", variant.stock ? `Only ${variant.stock} left` : "This is sold out");

  if (same) same.quantity = newQty;
  else {
    cart.items.push({
      product: product._id,
      variantId: variant._id,
      quantity: input.quantity,
      flavour: input.flavour,
      eggless: input.eggless,
      message: input.message,
    });
  }
  await cart.save();
  res.status(201).json({ cart: publicCart(await loadCart(userId(req))) });
}

export async function updateCartItem(req: Request, res: Response) {
  const { quantity } = parse(cartItemUpdateSchema, req.body);
  const cart = await getCartDoc(userId(req));
  const item = cart.items.id(String(req.params.itemId));
  if (!item) throw notFound("Cart item");
  const product = await Product.findById(item.product).select("variants").lean();
  const variant = product?.variants.find((v) => String(v._id) === String(item.variantId));
  if (variant && variant.stock < quantity) throw new AppError(409, "OUT_OF_STOCK", `Only ${variant.stock} left`);
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
  const input = parse(addressUpdateSchema, req.body);
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
