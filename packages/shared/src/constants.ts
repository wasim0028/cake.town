export const APP_NAME = "caketown";

export const ROLES = ["customer", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const DIETARY_TAGS = ["eggless", "vegan", "gluten-free", "sugar-free"] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

export const PAYMENT_METHODS = ["razorpay", "cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  "pending_payment",
  "placed",
  "baking",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  placed: "Order placed",
  baking: "Baking",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Which status an order may move to next. Admins drive everything after "placed". */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["placed", "cancelled"],
  placed: ["baking", "cancelled"],
  baking: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Customers may cancel only before baking starts. */
export const CUSTOMER_CANCELLABLE: readonly OrderStatus[] = ["pending_payment", "placed"];

export const DELIVERY_SLOTS = ["10:00-13:00", "13:00-16:00", "16:00-19:00", "19:00-22:00"] as const;
export type DeliverySlot = (typeof DELIVERY_SLOTS)[number];

export const BOOKING_STATUSES = ["pending_payment", "confirmed", "cancelled", "attended"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_PAYMENT_METHODS = ["razorpay", "pay_at_venue"] as const;
export type BookingPaymentMethod = (typeof BOOKING_PAYMENT_METHODS)[number];

export const CLASS_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const COUPON_TYPES = ["percent", "flat"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const PRODUCT_SORTS = ["popular", "newest", "price_asc", "price_desc", "rating"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const DEVICE_PLATFORMS = ["ios", "android", "web"] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

/** All money in the system is stored as integer paise (₹1 = 100 paise). */
export const DELIVERY = {
  /** Orders at or above this subtotal ship free. ₹999 */
  freeAbove: 99_900,
  /** Flat delivery fee below the threshold. ₹49 */
  fee: 4_900,
  /** How far ahead customers may schedule delivery. */
  maxDaysAhead: 30,
} as const;

export const TIMEZONE = "Asia/Kolkata";
