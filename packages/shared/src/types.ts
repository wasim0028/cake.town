/**
 * Shapes returned by the caketown API (JSON). Ids are strings, dates are ISO strings,
 * money is integer paise.
 */
import type { CakeCustomization } from "./builder";
import type {
  BookingPaymentMethod,
  BookingStatus,
  ClassLevel,
  DeliverySlot,
  DietaryTag,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
} from "./constants";

export interface ApiError {
  error: { code: string; message: string; details?: Record<string, string[]> };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Image {
  url: string;
  publicId?: string;
  alt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  avatar?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  /** Returned in the body only for mobile clients (header `X-Client: mobile`). Web uses httpOnly cookies. */
  accessToken?: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: Image;
  sortOrder: number;
  productCount?: number;
}

export interface Variant {
  id: string;
  label: string;
  weightGrams?: number;
  price: number;
  compareAtPrice?: number;
  inStock: boolean;
  stock?: number; // admins only
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: Pick<Category, "id" | "name" | "slug">;
  images: Image[];
  variants: Variant[];
  flavours: string[];
  dietary: DietaryTag[];
  egglessOption: { available: boolean; extraPrice: number };
  allowsMessage: boolean;
  maxMessageLength: number;
  preparationHours: number;
  tags: string[];
  isBestseller: boolean;
  isFeatured: boolean;
  isCustomizable: boolean;
  priceFrom: number;
  rating: { average: number; count: number };
}

export interface CartLine {
  id: string;
  product: Pick<Product, "id" | "name" | "slug" | "images"> & { category: string };
  variant: { id: string; label: string };
  quantity: number;
  flavour?: string;
  eggless: boolean;
  message?: string;
  custom?: CakeCustomization;
  unitPrice: number;
  lineTotal: number;
  /** Hours the bakery needs before this item can be delivered. */
  preparationHours: number;
  available: boolean;
  /** Why the line can't be ordered right now, when `available` is false. */
  issue?: string;
}

export interface Cart {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
}

export interface Quote {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  coupon?: { code: string; description?: string };
  couponError?: string;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  location?: { lat: number; lng: number };
  isDefault: boolean;
}

export interface OrderItem {
  product: string;
  name: string;
  slug: string;
  image?: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  flavour?: string;
  eggless: boolean;
  message?: string;
  custom?: CakeCustomization;
  customSummary?: string;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  address: Omit<Address, "id" | "isDefault">;
  deliveryDate: string;
  deliverySlot: DeliverySlot;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  coupon?: { code: string; discount: number };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string; note?: string }[];
  notes?: string;
  createdAt: string;
}

export interface CheckoutResponse {
  order: Order;
  /** Present when paymentMethod is "razorpay": open Razorpay Checkout with these. */
  razorpay?: { keyId: string; orderId: string; amount: number; currency: "INR"; name: string; prefill: { name: string; email: string; contact?: string } };
}

export interface Review {
  id: string;
  product?: { name: string; slug: string };
  user: { id: string; name: string; avatar?: string };
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface ClassSession {
  id: string;
  startsAt: string;
  seats: number;
  seatsLeft: number;
}

export interface BakingClass {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructor: { name: string; bio?: string; photo?: string };
  image?: Image;
  level: ClassLevel;
  durationMinutes: number;
  price: number;
  location: string;
  whatYouWillLearn: string[];
  sessions: ClassSession[];
}

export interface Booking {
  id: string;
  bookingNumber: string;
  class: Pick<BakingClass, "id" | "title" | "slug" | "image">;
  session: { id: string; startsAt: string };
  seats: number;
  amount: number;
  paymentMethod: BookingPaymentMethod;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  createdAt: string;
}
