import crypto from "node:crypto";
import type { ClientSession } from "mongoose";
import { describeCustomization, ORDER_TRANSITIONS, type CheckoutInput, type OrderStatus } from "@caketown/shared";
import { env, features } from "../config/env";
import { logger } from "../config/logger";
import { withTransaction } from "../config/db";
import { Address, Cart, Coupon, Order, Product, User, type OrderDoc } from "../models";
import { AppError, badRequest, conflict, notFound } from "../utils/errors";
import { loadCart } from "./cart";
import { deliveryFeeFor, deliverySlotError, evaluateCoupon } from "./pricing";
import { createRazorpayOrder, razorpayKeyId, refundPayment } from "./razorpay";
import { notifyOrderStatus } from "./notify";
import { invalidateCatalog } from "./cache";

/** CT-261025-7KQ2X : date (IST) + 5 random chars, readable over the phone. */
export function newOrderNumber(prefix = "CT"): string {
  const d = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "2-digit", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .split("/")
    .reverse()
    .join("");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from(crypto.randomBytes(5), (b) => alphabet[b % alphabet.length]).join("");
  return `${prefix}-${d}-${rand}`;
}

interface StockLine {
  product: unknown;
  variantId: unknown;
  quantity: number;
  name?: string;
}

async function releaseStock(items: StockLine[], session?: ClientSession) {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.product, "variants._id": item.variantId },
      { $inc: { "variants.$.stock": item.quantity, soldCount: -item.quantity } },
      { session },
    );
  }
}

/**
 * Turns the cart into an order. Stock reduction, coupon use and order creation happen in one
 * transaction (Atlas); on a standalone dev database the same steps run with manual rollback.
 */
export async function placeOrder(userId: string, input: CheckoutInput) {
  if (input.paymentMethod === "razorpay" && !features.razorpay) {
    throw new AppError(503, "PAYMENTS_DISABLED", "Online payments are not set up yet. Please choose Cash on Delivery.");
  }

  const [address, user] = await Promise.all([
    Address.findOne({ _id: input.addressId, user: userId }).lean(),
    User.findById(userId).select("name email phone").lean(),
  ]);
  if (!address) throw notFound("Address");
  if (!user) throw notFound("User");

  const cart = await loadCart(userId);
  if (!cart.items.length) throw badRequest("Your cart is empty", "CART_EMPTY");
  const unavailable = cart.items.filter((i) => !i.available);
  if (unavailable.length) {
    throw conflict(
      `Some items are no longer available: ${unavailable.map((i) => i.product.name).join(", ")}. Please update your cart.`,
      "CART_ITEMS_UNAVAILABLE",
    );
  }

  const products = await Product.find({ _id: { $in: cart.raw.items.map((i) => i.product) } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const prepHours = Math.max(0, ...products.map((p) => p.preparationHours ?? 0));
  const slotError = deliverySlotError(input.deliveryDate, input.deliverySlot, prepHours);
  if (slotError) throw new AppError(422, "DELIVERY_SLOT_UNAVAILABLE", slotError);

  const items = cart.raw.items.map((raw, idx) => {
    const line = cart.items[idx]!;
    const product = byId.get(String(raw.product))!;
    return {
      product: raw.product,
      variantId: raw.variantId,
      name: product.name,
      slug: product.slug,
      image: product.images[0]?.url,
      variantLabel: line.variant.label,
      unitPrice: line.unitPrice,
      quantity: raw.quantity,
      flavour: raw.flavour ?? undefined,
      eggless: raw.eggless,
      message: raw.message ?? undefined,
      ...(line.custom ? { custom: line.custom, customSummary: describeCustomization(line.custom) } : {}),
      lineTotal: line.lineTotal,
    };
  });

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const couponResult = await evaluateCoupon(input.couponCode, subtotal, userId);
  if (input.couponCode && couponResult.error) throw new AppError(422, "COUPON_INVALID", couponResult.error);
  const discount = couponResult.discount;
  const deliveryFee = deliveryFeeFor(subtotal - discount);
  const total = subtotal - discount + deliveryFee;
  const online = input.paymentMethod === "razorpay";
  const initialStatus: OrderStatus = online ? "pending_payment" : "placed";

  const order = await withTransaction(async (session) => {
    const reserved: StockLine[] = [];
    let couponUsed = false;
    try {
      for (const item of items) {
        const res = await Product.updateOne(
          { _id: item.product, isActive: true, variants: { $elemMatch: { _id: item.variantId, stock: { $gte: item.quantity } } } },
          { $inc: { "variants.$.stock": -item.quantity, soldCount: item.quantity } },
          { session },
        );
        if (res.modifiedCount !== 1) throw conflict(`${item.name} (${item.variantLabel}) just sold out`, "OUT_OF_STOCK");
        reserved.push(item);
      }

      if (couponResult.coupon) {
        const c = couponResult.coupon;
        const res = await Coupon.updateOne(
          { _id: c._id, ...(c.usageLimit ? { usedCount: { $lt: c.usageLimit } } : {}) },
          { $inc: { usedCount: 1 } },
          { session },
        );
        if (res.modifiedCount !== 1) throw new AppError(422, "COUPON_INVALID", "This code has just been fully used");
        couponUsed = true;
      }

      const [created] = await Order.create(
        [
          {
            orderNumber: newOrderNumber(),
            user: userId,
            items,
            address: {
              label: address.label,
              fullName: address.fullName,
              phone: address.phone,
              line1: address.line1,
              line2: address.line2,
              landmark: address.landmark,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              location: address.location,
            },
            deliveryDate: input.deliveryDate,
            deliverySlot: input.deliverySlot,
            subtotal,
            discount,
            deliveryFee,
            total,
            ...(couponResult.coupon ? { coupon: { code: couponResult.coupon.code, discount } } : {}),
            paymentMethod: input.paymentMethod,
            paymentStatus: "pending",
            status: initialStatus,
            statusHistory: [{ status: initialStatus, at: new Date() }],
            ...(online ? { paymentExpiresAt: new Date(Date.now() + env.PAYMENT_HOLD_MINUTES * 60_000) } : {}),
            notes: input.notes,
          },
        ],
        { session },
      );
      await Cart.updateOne({ user: userId }, { $set: { items: [] } }, { session });
      return created!;
    } catch (err) {
      // Without a transaction (local dev), undo what already happened.
      if (!session) {
        await releaseStock(reserved);
        if (couponUsed && couponResult.coupon) await Coupon.updateOne({ _id: couponResult.coupon._id }, { $inc: { usedCount: -1 } });
      }
      throw err;
    }
  });

  await invalidateCatalog(); // stock changed

  if (!online) {
    notifyOrderStatus(order);
    return { order };
  }

  try {
    const rp = await createRazorpayOrder(total, { type: "order", ref: String(order._id), number: order.orderNumber });
    order.set("razorpay.orderId", rp.id);
    await order.save();
    return {
      order,
      razorpay: {
        keyId: razorpayKeyId(),
        orderId: rp.id,
        amount: total,
        currency: "INR" as const,
        name: "caketown",
        prefill: { name: user.name, email: user.email, ...(user.phone ? { contact: user.phone } : {}) },
      },
    };
  } catch (err) {
    logger.error({ err, order: order.orderNumber }, "Razorpay order creation failed; cancelling");
    await cancelOrder(String(order._id), { reason: "Payment could not be started", notify: false });
    throw new AppError(502, "PAYMENT_START_FAILED", "We couldn't start the payment. Please try again or choose Cash on Delivery.");
  }
}

/**
 * Marks an online order as paid. Called from the webhook and the client verify call; whichever
 * arrives first wins and the other is a no-op. A payment that lands after the order expired is
 * refunded automatically.
 */
export async function markOrderPaid(orderId: string, paymentId: string): Promise<OrderDoc | null> {
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: "pending_payment" },
    {
      $set: { status: "placed", paymentStatus: "paid", "razorpay.paymentId": paymentId },
      $unset: { paymentExpiresAt: 1 },
      $push: { statusHistory: { status: "placed", at: new Date(), note: "Payment received" } },
    },
    { new: true },
  );
  if (updated) {
    notifyOrderStatus(updated);
    return updated;
  }

  const existing = await Order.findById(orderId);
  if (!existing) return null;
  if (existing.status === "cancelled" && existing.paymentStatus !== "refunded" && existing.paymentStatus !== "paid") {
    logger.warn({ order: existing.orderNumber, paymentId }, "Payment arrived for a cancelled order; refunding");
    try {
      const refund = await refundPayment(paymentId, undefined, "Order expired before payment completed");
      existing.paymentStatus = "refunded";
      existing.set("razorpay.paymentId", paymentId);
      existing.set("razorpay.refundId", refund.id);
      existing.set("razorpay.refundedAmount", Number(refund.amount ?? existing.total));
      await existing.save();
    } catch (err) {
      logger.error({ err, order: existing.orderNumber }, "Automatic refund failed — refund manually in Razorpay");
    }
  }
  return existing;
}

export async function markOrderPaymentFailed(orderId: string) {
  await Order.updateOne({ _id: orderId, status: "pending_payment" }, { $set: { paymentStatus: "failed" } });
}

/**
 * Cancels an order, puts stock back, frees the coupon and refunds online payments in full.
 */
export async function cancelOrder(
  orderId: string,
  opts: { reason?: string; by?: string; notify?: boolean; allowedFrom?: readonly OrderStatus[] } = {},
): Promise<OrderDoc> {
  const from = opts.allowedFrom ?? (Object.keys(ORDER_TRANSITIONS) as OrderStatus[]).filter((s) => ORDER_TRANSITIONS[s].includes("cancelled"));

  const order = await withTransaction(async (session) => {
    const o = await Order.findOneAndUpdate(
      { _id: orderId, status: { $in: from } },
      {
        $set: { status: "cancelled", cancelReason: opts.reason },
        $unset: { paymentExpiresAt: 1 },
        $push: { statusHistory: { status: "cancelled", at: new Date(), note: opts.reason, ...(opts.by ? { by: opts.by } : {}) } },
      },
      { new: true, session },
    );
    if (!o) return null;
    await releaseStock(o.items, session);
    if (o.coupon?.code) await Coupon.updateOne({ code: o.coupon.code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
    return o;
  });

  if (!order) {
    const existing = await Order.findById(orderId).select("status").lean();
    if (!existing) throw notFound("Order");
    throw conflict(`This order can't be cancelled now (it is ${existing.status.replace(/_/g, " ")}).`, "CANNOT_CANCEL");
  }

  await invalidateCatalog();

  if (order.paymentStatus === "paid" && order.razorpay?.paymentId) {
    try {
      const refund = await refundPayment(order.razorpay.paymentId, undefined, opts.reason);
      order.paymentStatus = "refunded";
      order.set("razorpay.refundId", refund.id);
      order.set("razorpay.refundedAmount", order.total);
      await order.save();
    } catch (err) {
      logger.error({ err, order: order.orderNumber }, "Refund failed — refund manually in Razorpay");
    }
  }

  if (opts.notify !== false) notifyOrderStatus(order);
  return order;
}

/** Admin status changes (placed → baking → out_for_delivery → delivered). */
export async function transitionOrder(orderId: string, to: OrderStatus, opts: { note?: string; by?: string } = {}): Promise<OrderDoc> {
  if (to === "cancelled") return cancelOrder(orderId, { reason: opts.note ?? "Cancelled by caketown", by: opts.by });

  const current = await Order.findById(orderId).select("status paymentMethod").lean();
  if (!current) throw notFound("Order");
  if (!ORDER_TRANSITIONS[current.status as OrderStatus].includes(to)) {
    throw new AppError(422, "INVALID_TRANSITION", `Can't move an order from "${current.status}" to "${to}"`);
  }
  if (to === "placed") throw new AppError(422, "INVALID_TRANSITION", "Orders become placed when payment is received");

  const set: Record<string, unknown> = { status: to };
  // Cash on delivery is collected at the door.
  if (to === "delivered" && current.paymentMethod === "cod") set.paymentStatus = "paid";

  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: current.status },
    { $set: set, $push: { statusHistory: { status: to, at: new Date(), note: opts.note, ...(opts.by ? { by: opts.by } : {}) } } },
    { new: true },
  );
  if (!order) throw conflict("The order changed while you were updating it. Please refresh.", "STALE_ORDER");
  notifyOrderStatus(order);
  return order;
}

/** Cancels online orders whose payment window passed, releasing their stock. Runs every few minutes. */
export async function expireUnpaidOrders(now = new Date()): Promise<number> {
  const stale = await Order.find({ status: "pending_payment", paymentExpiresAt: { $lt: now } }).select("_id").lean();
  let count = 0;
  for (const o of stale) {
    try {
      await cancelOrder(String(o._id), { reason: "Payment not completed in time", notify: false, allowedFrom: ["pending_payment"] });
      count++;
    } catch (err) {
      if (!(err instanceof AppError)) logger.error({ err, id: o._id }, "Expiring order failed");
    }
  }
  return count;
}
