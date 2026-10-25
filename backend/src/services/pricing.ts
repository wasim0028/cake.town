import { DELIVERY, TIMEZONE } from "@caketown/shared";
import { Coupon, Order, type CouponDoc } from "../models";

/** Price of one unit of a variant, including the eggless surcharge when chosen. */
export function unitPrice(
  variant: { price: number },
  product: { egglessOption?: { available?: boolean | null; extraPrice?: number | null } | null },
  eggless: boolean,
): number {
  const extra = eggless && product.egglessOption?.available ? (product.egglessOption.extraPrice ?? 0) : 0;
  return variant.price + extra;
}

export function deliveryFeeFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= DELIVERY.freeAbove ? 0 : DELIVERY.fee;
}

export interface CouponResult {
  coupon?: CouponDoc;
  discount: number;
  error?: string;
}

/**
 * Validates a coupon for this user and subtotal and works out the discount (paise).
 * Never throws for a bad code: returns `error` so the quote can show it next to the field.
 */
export async function evaluateCoupon(code: string | undefined, subtotal: number, userId: string): Promise<CouponResult> {
  if (!code) return { discount: 0 };
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  const now = new Date();
  if (!coupon || !coupon.isActive) return { discount: 0, error: "This code isn't valid" };
  if (coupon.startsAt && coupon.startsAt > now) return { discount: 0, error: "This code isn't active yet" };
  if (coupon.expiresAt && coupon.expiresAt < now) return { discount: 0, error: "This code has expired" };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { discount: 0, error: "This code has been fully used" };
  if (subtotal < coupon.minOrder) {
    return { discount: 0, error: `Add ₹${Math.ceil((coupon.minOrder - subtotal) / 100)} more to use this code` };
  }
  const usedByUser = await Order.countDocuments({ user: userId, "coupon.code": coupon.code, status: { $ne: "cancelled" } });
  if (usedByUser >= coupon.perUserLimit) return { discount: 0, error: "You've already used this code" };

  // Percent discounts are rounded down to whole rupees so totals stay easy to pay in cash.
  let discount = coupon.type === "percent" ? Math.floor((subtotal * coupon.value) / 100 / 100) * 100 : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { coupon, discount };
}

/* ---------- delivery date & time (Asia/Kolkata) ---------- */

const IST_OFFSET = "+05:30";

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** The instant a delivery slot starts, e.g. ("2026-10-28", "16:00-19:00") -> Date. */
export function slotStart(date: string, slot: string): Date {
  const start = slot.split("-")[0];
  return new Date(`${date}T${start}:00${IST_OFFSET}`);
}

/**
 * Returns an error message when the slot can't be met: in the past, sooner than the longest
 * preparation time in the cart, or more than DELIVERY.maxDaysAhead days away.
 */
export function deliverySlotError(date: string, slot: string, prepHours: number, now = new Date()): string | null {
  const start = slotStart(date, slot);
  if (Number.isNaN(start.getTime())) return "Invalid delivery date";
  const earliest = new Date(now.getTime() + prepHours * 3600_000);
  if (start < earliest) {
    return prepHours > 0
      ? `This order needs about ${prepHours} hours to prepare. Please pick a later slot.`
      : "That slot has already passed. Please pick a later one.";
  }
  const latest = new Date(now.getTime() + DELIVERY.maxDaysAhead * 24 * 3600_000);
  if (start > latest) return `You can schedule up to ${DELIVERY.maxDaysAhead} days ahead.`;
  return null;
}
