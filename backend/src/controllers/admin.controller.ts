import type { Request, Response } from "express";
import type { FilterQuery } from "mongoose";
import {
  adminOrderQuerySchema,
  couponInputSchema,
  couponUpdateSchema,
  paginationSchema,
  refundSchema,
  roleUpdateSchema,
  orderStatusUpdateSchema,
  TIMEZONE,
} from "@caketown/shared";
import { Coupon, Order, Product, User } from "../models";
import type { OrderFields } from "../models/Order";
import { refundPayment } from "../services/razorpay";
import { transitionOrder } from "../services/orders";
import { AppError, badRequest, notFound } from "../utils/errors";
import { escapeRegex, paginate, parse, parsePatch, userId } from "../utils/http";
import { presentUser } from "./auth.controller";

/* ---------- dashboard ---------- */

/** Revenue counts only orders that are paid or COD and not cancelled. */
const REVENUE_MATCH = { status: { $nin: ["cancelled", "pending_payment"] } };

function istMidnight(daysAgo: number): Date {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
  const d = new Date(`${today}T00:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

export async function stats(_req: Request, res: Response) {
  const todayStart = istMidnight(0);
  const weekStart = istMidnight(6);
  const monthStart = istMidnight(29);

  const sumSince = async (since: Date) => {
    const [r] = await Order.aggregate<{ revenue: number; orders: number }>([
      { $match: { ...REVENUE_MATCH, createdAt: { $gte: since } } },
      { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]);
    return { revenue: r?.revenue ?? 0, orders: r?.orders ?? 0 };
  };

  const [today, week, month, byStatus, series, lowStock, topProducts, customers, deliveriesToday] = await Promise.all([
    sumSince(todayStart),
    sumSince(weekStart),
    sumSince(monthStart),
    Order.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate<{ _id: string; revenue: number; orders: number }>([
      { $match: { ...REVENUE_MATCH, createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIMEZONE } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Product.aggregate([
      { $match: { isActive: true } },
      { $unwind: "$variants" },
      { $match: { $expr: { $lte: ["$variants.stock", "$lowStockThreshold"] } } },
      { $project: { _id: 0, productId: "$_id", name: 1, slug: 1, variant: "$variants.label", stock: "$variants.stock" } },
      { $sort: { stock: 1 } },
      { $limit: 20 },
    ]),
    Order.aggregate([
      { $match: { ...REVENUE_MATCH, createdAt: { $gte: monthStart } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", name: { $first: "$items.name" }, units: { $sum: "$items.quantity" }, revenue: { $sum: "$items.lineTotal" } } },
      { $sort: { units: -1 } },
      { $limit: 5 },
    ]),
    User.countDocuments({ role: "customer" }),
    Order.countDocuments({ deliveryDate: new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date()), status: { $nin: ["cancelled", "pending_payment"] } }),
  ]);

  // Fill missing days with zero so charts have 30 evenly spaced points.
  const byDay = new Map(series.map((s) => [s._id, s]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(istMidnight(29 - i));
    const hit = byDay.get(date);
    return { date, revenue: hit?.revenue ?? 0, orders: hit?.orders ?? 0 };
  });

  res.json({
    sales: { today, last7Days: week, last30Days: month },
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    revenueSeries: days,
    lowStock,
    topProducts: topProducts.map((p) => ({ productId: String(p._id), name: p.name, units: p.units, revenue: p.revenue })),
    customers,
    deliveriesToday,
  });
}

/* ---------- orders ---------- */

export async function listOrders(req: Request, res: Response) {
  const q = parse(adminOrderQuerySchema, req.query);
  const filter: FilterQuery<OrderFields> = {};
  if (q.status) filter.status = q.status;
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: "i" };
    filter.$or = [{ orderNumber: rx }, { "address.fullName": rx }, { "address.phone": rx }];
  }
  if (q.from || q.to) {
    filter.deliveryDate = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate("user", "name email phone"),
    Order.countDocuments(filter),
  ]);
  res.json(paginate(items, total, q.page, q.limit));
}

export async function getOrder(req: Request, res: Response) {
  const order = await Order.findById(req.params.id).populate("user", "name email phone");
  if (!order) throw notFound("Order");
  res.json({ order });
}

export async function updateOrderStatus(req: Request, res: Response) {
  const input = parse(orderStatusUpdateSchema, req.body);
  const order = await transitionOrder(String(req.params.id), input.status, { note: input.note, by: userId(req) });
  res.json({ order });
}

/** Partial or full refund of a paid online order (the order itself is not cancelled). */
export async function refundOrder(req: Request, res: Response) {
  const input = parse(refundSchema, req.body ?? {});
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound("Order");
  if (order.paymentMethod !== "razorpay" || order.paymentStatus !== "paid" || !order.razorpay?.paymentId) {
    throw badRequest("Only paid online orders can be refunded here", "NOT_REFUNDABLE");
  }
  const already = order.razorpay.refundedAmount ?? 0;
  const amount = input.amount ?? order.total - already;
  if (amount <= 0 || already + amount > order.total) throw new AppError(422, "REFUND_TOO_LARGE", "Refund is more than the amount paid");
  const refund = await refundPayment(order.razorpay.paymentId, amount, input.reason);
  order.set("razorpay.refundId", refund.id);
  order.set("razorpay.refundedAmount", already + amount);
  if (already + amount >= order.total) order.paymentStatus = "refunded";
  order.statusHistory.push({ status: order.status, at: new Date(), note: `Refunded ₹${amount / 100}${input.reason ? `: ${input.reason}` : ""}`, by: userId(req) });
  await order.save();
  res.json({ order });
}

/* ---------- users ---------- */

export async function listUsers(req: Request, res: Response) {
  const { page, limit } = parse(paginationSchema, req.query);
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const filter = search
    ? { $or: [{ name: { $regex: escapeRegex(search), $options: "i" } }, { email: { $regex: escapeRegex(search), $options: "i" } }, { phone: search }] }
    : {};
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json(paginate(users.map(presentUser), total, page, limit));
}

export async function updateUserRole(req: Request, res: Response) {
  const { role } = parse(roleUpdateSchema, req.body);
  if (String(req.params.id) === userId(req) && role !== "admin") throw badRequest("You can't remove your own admin access", "SELF_DEMOTE");
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { role } }, { new: true });
  if (!user) throw notFound("User");
  res.json({ user: presentUser(user) });
}

/* ---------- coupons ---------- */

export async function listCoupons(_req: Request, res: Response) {
  res.json({ items: await Coupon.find().sort({ createdAt: -1 }) });
}

function checkCouponValue(type: string | undefined, value: number | undefined) {
  if (type === "percent" && value !== undefined && (value < 1 || value > 100)) {
    throw new AppError(422, "VALIDATION_ERROR", "Percent coupons must be between 1 and 100");
  }
}

export async function createCoupon(req: Request, res: Response) {
  const input = parse(couponInputSchema, req.body);
  checkCouponValue(input.type, input.value);
  res.status(201).json({ coupon: await Coupon.create(input) });
}

export async function updateCoupon(req: Request, res: Response) {
  const input = parsePatch(couponUpdateSchema, req.body);
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw notFound("Coupon");
  checkCouponValue(input.type ?? coupon.type, input.value ?? coupon.value);
  coupon.set(input);
  await coupon.save();
  res.json({ coupon });
}

export async function deleteCoupon(req: Request, res: Response) {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw notFound("Coupon");
  if (coupon.usedCount > 0) {
    coupon.isActive = false; // keep history for past orders
    await coupon.save();
    return res.json({ archived: true });
  }
  await coupon.deleteOne();
  res.status(204).end();
}
