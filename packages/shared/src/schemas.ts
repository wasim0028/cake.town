import { z } from "zod";
import {
  BOOKING_PAYMENT_METHODS,
  CLASS_LEVELS,
  COUPON_TYPES,
  DELIVERY_SLOTS,
  DEVICE_PLATFORMS,
  DIETARY_TAGS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PRODUCT_SORTS,
  ROLES,
} from "./constants";

/* ---------- building blocks ---------- */

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");
export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");

/** Indian mobile number; accepts "+91 98xxxxxxxx", "098xxxxxxxx" etc. and normalises to 10 digits. */
export const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"));

export const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));
export const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Password needs a letter")
  .regex(/\d/, "Password needs a number");

/** Money in integer paise. */
export const paise = z.number().int().min(0);
/** "YYYY-MM-DD" */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const imageSchema = z.object({
  url: z.url(),
  publicId: z.string().optional(),
  alt: z.string().max(160).optional(),
});

const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
};

/* ---------- auth ---------- */

export const signupSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email,
    phone: indianPhone,
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const refreshSchema = z.object({ refreshToken: z.string().min(20).optional() });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20), password });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: indianPhone.optional(),
  avatar: z.url().optional(),
});
export const otpRequestSchema = z.object({ phone: indianPhone });
export const otpVerifySchema = z.object({ phone: indianPhone, code: z.string().regex(/^\d{6}$/) });

/* ---------- catalogue ---------- */

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: slug.optional(),
  description: z.string().trim().max(400).optional(),
  image: imageSchema.optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const variantInputSchema = z.object({
  /** Send the existing id when editing so carts that hold this variant keep working. */
  id: objectId.optional(),
  label: z.string().trim().min(1).max(40),
  weightGrams: z.number().int().positive().optional(),
  price: paise.min(100),
  compareAtPrice: paise.optional(),
  stock: z.number().int().min(0).default(0),
  sku: z.string().trim().max(40).optional(),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slug.optional(),
  description: z.string().trim().max(4000).default(""),
  shortDescription: z.string().trim().max(200).optional(),
  category: objectId,
  images: z.array(imageSchema).max(10).default([]),
  variants: z.array(variantInputSchema).min(1).max(10),
  flavours: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  dietary: z.array(z.enum(DIETARY_TAGS)).default([]),
  egglessOption: z
    .object({ available: z.boolean(), extraPrice: paise })
    .default({ available: false, extraPrice: 0 }),
  allowsMessage: z.boolean().default(false),
  maxMessageLength: z.number().int().min(0).max(60).default(30),
  preparationHours: z.number().int().min(0).max(168).default(4),
  tags: z.array(z.string().trim().toLowerCase().max(30)).max(20).default([]),
  isBestseller: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  lowStockThreshold: z.number().int().min(0).default(5),
});
export const productUpdateSchema = productInputSchema.partial();

export const productQuerySchema = z.object({
  ...pageQuery,
  q: z.string().trim().max(80).optional(),
  category: slug.optional(),
  dietary: z
    .union([z.enum(DIETARY_TAGS), z.array(z.enum(DIETARY_TAGS))])
    .optional()
    .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v])),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  bestseller: z.stringbool().optional(),
  featured: z.stringbool().optional(),
  sort: z.enum(PRODUCT_SORTS).default("popular"),
});

/* ---------- reviews ---------- */

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(80).optional(),
  comment: z.string().trim().max(1000).default(""),
});

/* ---------- addresses ---------- */

export const addressInputSchema = z.object({
  label: z.string().trim().max(30).default("Home"),
  fullName: z.string().trim().min(2).max(80),
  phone: indianPhone,
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional(),
  landmark: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
  isDefault: z.boolean().default(false),
});
export const addressUpdateSchema = addressInputSchema.partial();

/* ---------- cart & checkout ---------- */

export const cartItemInputSchema = z.object({
  productId: objectId,
  variantId: objectId,
  quantity: z.number().int().min(1).max(20).default(1),
  flavour: z.string().trim().max(40).optional(),
  eggless: z.boolean().default(false),
  message: z.string().trim().max(60).optional(),
});
export const cartItemUpdateSchema = z.object({ quantity: z.number().int().min(1).max(20) });

export const quoteSchema = z.object({ couponCode: z.string().trim().toUpperCase().max(30).optional() });

export const checkoutSchema = z.object({
  addressId: objectId,
  deliveryDate: isoDate,
  deliverySlot: z.enum(DELIVERY_SLOTS),
  paymentMethod: z.enum(PAYMENT_METHODS),
  couponCode: z.string().trim().toUpperCase().max(30).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(5),
  razorpayPaymentId: z.string().min(5),
  razorpaySignature: z.string().min(10),
});

/* ---------- coupons ---------- */

export const couponInputSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/),
  description: z.string().trim().max(160).optional(),
  type: z.enum(COUPON_TYPES),
  value: z.number().int().positive(),
  minOrder: paise.default(0),
  maxDiscount: paise.optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});
export const couponUpdateSchema = couponInputSchema.partial();

/* ---------- baking classes ---------- */

export const classSessionInputSchema = z.object({
  startsAt: z.coerce.date(),
  seats: z.number().int().min(1).max(100),
});

export const classInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  slug: slug.optional(),
  description: z.string().trim().max(4000).default(""),
  instructor: z.object({ name: z.string().trim().min(2).max(80), bio: z.string().max(400).optional(), photo: z.url().optional() }),
  image: imageSchema.optional(),
  level: z.enum(CLASS_LEVELS).default("beginner"),
  durationMinutes: z.number().int().min(15).max(600),
  price: paise,
  location: z.string().trim().max(200).default("caketown studio"),
  whatYouWillLearn: z.array(z.string().trim().max(120)).max(15).default([]),
  sessions: z.array(classSessionInputSchema).max(50).default([]),
  isActive: z.boolean().default(true),
});
export const classUpdateSchema = classInputSchema.partial();

export const bookingInputSchema = z.object({
  classId: objectId,
  sessionId: objectId,
  seats: z.number().int().min(1).max(6).default(1),
  paymentMethod: z.enum(BOOKING_PAYMENT_METHODS),
});

/* ---------- admin ---------- */

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(200).optional(),
});
export const refundSchema = z.object({ amount: paise.min(100).optional(), reason: z.string().trim().max(200).optional() });
export const roleUpdateSchema = z.object({ role: z.enum(ROLES) });
export const adminOrderQuerySchema = z.object({
  ...pageQuery,
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().trim().max(40).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

/* ---------- misc ---------- */

export const deviceTokenSchema = z.object({ token: z.string().min(10).max(200), platform: z.enum(DEVICE_PLATFORMS) });
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  phone: indianPhone.optional(),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(5).max(2000),
});
export const newsletterSchema = z.object({ email });
export const paginationSchema = z.object(pageQuery);

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type AddressInput = z.infer<typeof addressInputSchema>;
export type CartItemInput = z.infer<typeof cartItemInputSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CouponInput = z.infer<typeof couponInputSchema>;
export type ClassInput = z.infer<typeof classInputSchema>;
export type BookingInput = z.infer<typeof bookingInputSchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
